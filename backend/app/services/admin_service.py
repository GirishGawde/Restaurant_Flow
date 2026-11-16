"""
app/services/admin_service.py
Owner: Girish (Module 1 - Admin, Login and Security)

Business logic and PostgreSQL queries for Admin and Auth operations:
- Staff management (list, create with Supabase Auth, update, self-protection rules)
- Menu management (list, create, update, category/station validation)
- Stations list (temporary until Diya's kitchen module is connected)
"""

import requests
from app.config import Config
from app.db import run_in_transaction
from app.errors import ApiError, conflict, not_found, validation_error, bad_request

VALID_ROLES = {"admin", "waiter", "chef", "cashier"}
VALID_CATEGORIES = {"Starters", "Mains", "Sides", "Drinks", "Desserts"}
VALID_MENU_STATUSES = {"active", "sold_out", "inactive"}


# =====================================================================
# Staff Services
# =====================================================================

def list_staff(role=None, search=None, active=None):
    """
    Lists staff accounts joined with auth.users to provide last_sign_in_at as last_login.
    Supports filtering by role, search keyword (name, username, email), and active status.
    """
    query = """
        SELECT s.staff_id, s.username, s.name, s.email, s.phone,
               s.role, s.is_active, u.last_sign_in_at AS last_login
        FROM staff s
        LEFT JOIN auth.users u ON s.staff_id = u.id
        WHERE 1=1
    """
    params = []

    if role:
        query += " AND s.role = %s"
        params.append(role)

    if active is not None:
        query += " AND s.is_active = %s"
        params.append(bool(active))

    if search:
        search_like = f"%{search.strip()}%"
        query += " AND (s.name ILIKE %s OR s.username ILIKE %s OR s.email ILIKE %s)"
        params.extend([search_like, search_like, search_like])

    query += " ORDER BY s.role ASC, s.name ASC;"

    with run_in_transaction() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    staff_list = []
    for r in rows:
        item = dict(r)
        item["staff_id"] = str(item["staff_id"])
        if item.get("last_login"):
            item["last_login"] = item["last_login"].isoformat()
        staff_list.append(item)

    return staff_list


def create_staff(name, username, email, role, password, phone=None):
    """
    Creates a new staff account:
    1. Validates inputs (role, email, username, password).
    2. Checks uniqueness in staff table.
    3. Creates Supabase Auth user via Admin API (service role key).
    4. Inserts staff row into PostgreSQL.
    5. Compensates (rolls back Supabase user) if DB insert fails.
    """
    name = (name or "").strip()
    username = (username or "").strip()
    email = (email or "").strip().lower()
    role = (role or "").strip().lower()
    phone = (phone or "").strip() or None

    if not name or not username or not email or not role or not password:
        raise validation_error("name, username, email, role, and password are required")

    if role not in VALID_ROLES:
        raise validation_error(f"Invalid role '{role}'. Allowed roles: {', '.join(sorted(VALID_ROLES))}")

    if len(password) < 6:
        raise validation_error("Password must be at least 6 characters long")

    # Check for duplicate username or email in staff table
    with run_in_transaction() as cur:
        cur.execute("SELECT staff_id FROM staff WHERE username = %s OR email = %s;", (username, email))
        existing = cur.fetchone()

    if existing:
        raise ApiError(
            code="DUPLICATE",
            message="A staff member with this username or email already exists.",
            status_code=409,
        )

    if not Config.SUPABASE_URL or not Config.SUPABASE_SERVICE_ROLE_KEY:
        raise ApiError(
            code="CONFIG_ERROR",
            message="Supabase service role credentials not configured on backend.",
            status_code=500,
        )

    # 1. Create user in Supabase Auth via Admin API
    admin_url = f"{Config.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": Config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {Config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "name": name,
            "username": username,
            "role": role,
        },
    }

    try:
        resp = requests.post(admin_url, headers=headers, json=payload, timeout=10)
    except Exception as e:
        raise ApiError("AUTH_ERROR", f"Failed to contact authentication service: {str(e)}", 500)

    if resp.status_code != 200 and resp.status_code != 201:
        err_msg = resp.json().get("msg") or resp.json().get("message") or "Failed to create authentication user"
        if "already registered" in err_msg.lower() or "unique" in err_msg.lower():
            raise ApiError("DUPLICATE", "An account with this email already exists in authentication provider.", 409)
        raise ApiError("AUTH_FAILED", err_msg, 400)

    auth_user = resp.json()
    new_user_id = auth_user.get("id")

    # 2. Insert into PostgreSQL staff table
    try:
        with run_in_transaction() as cur:
            cur.execute(
                """
                INSERT INTO staff (staff_id, username, name, email, phone, role, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, true)
                RETURNING staff_id, username, name, email, phone, role, is_active;
                """,
                (new_user_id, username, name, email, phone, role),
            )
            created_row = cur.fetchone()
    except Exception as db_err:
        # Compensating transaction: remove created Supabase user if SQL insert fails
        try:
            requests.delete(f"{admin_url}/{new_user_id}", headers=headers, timeout=5)
        except Exception:
            pass
        raise ApiError("DATABASE_ERROR", f"Failed to save staff profile: {str(db_err)}", 500)

    result = dict(created_row)
    result["staff_id"] = str(result["staff_id"])
    return result


def update_staff(staff_id, current_user, name=None, phone=None, role=None, is_active=None, password=None):
    """
    Updates staff account details:
    - Protects against self-deactivation and self-demotion.
    - Prevents removing/deactivating the last active administrator.
    - Updates password via Supabase Admin API if supplied.
    """
    with run_in_transaction() as cur:
        cur.execute(
            "SELECT staff_id, username, name, email, phone, role, is_active FROM staff WHERE staff_id = %s;",
            (staff_id,),
        )
        staff = cur.fetchone()

    if not staff:
        raise not_found(f"Staff member with id '{staff_id}' not found.")

    staff_dict = dict(staff)
    target_is_admin = staff_dict["role"] == "admin"
    is_self = str(staff_dict["staff_id"]) == str(current_user["staff_id"])

    # 1. Self-protection checks
    if is_self:
        if is_active is False:
            raise conflict("You cannot deactivate your own admin account.", code="SELF_DEACTIVATION")
        if role and role != "admin":
            raise conflict("You cannot change your own role away from admin.", code="SELF_DEMOTION")

    # 2. Last active admin check
    removing_admin = target_is_admin and ((role and role != "admin") or is_active is False)
    if removing_admin:
        with run_in_transaction() as cur:
            cur.execute(
                "SELECT count(*) AS active_admins FROM staff WHERE role = 'admin' AND is_active = true AND staff_id != %s;",
                (staff_id,),
            )
            count_res = cur.fetchone()
            if count_res and count_res["active_admins"] == 0:
                raise conflict("Cannot deactivate or demote the last remaining active administrator.", code="LAST_ADMIN")

    # 3. Update password in Supabase Auth if provided
    if password:
        if len(password) < 6:
            raise validation_error("New password must be at least 6 characters long.")
        admin_url = f"{Config.SUPABASE_URL}/auth/v1/admin/users/{staff_id}"
        headers = {
            "apikey": Config.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {Config.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.put(admin_url, headers=headers, json={"password": password}, timeout=8)
            if resp.status_code not in (200, 204):
                raise ApiError("AUTH_ERROR", "Failed to update user password in authentication provider.", 400)
        except Exception as e:
            raise ApiError("AUTH_ERROR", f"Password update failed: {str(e)}", 500)

    # 4. Update database fields
    updates = []
    values = []

    if name is not None:
        updates.append("name = %s")
        values.append(name.strip())

    if phone is not None:
        updates.append("phone = %s")
        values.append(phone.strip() or None)

    if role is not None:
        role_clean = role.strip().lower()
        if role_clean not in VALID_ROLES:
            raise validation_error(f"Invalid role '{role_clean}'.")
        updates.append("role = %s")
        values.append(role_clean)

    if is_active is not None:
        updates.append("is_active = %s")
        values.append(bool(is_active))

    if updates:
        values.append(staff_id)
        set_clause = ", ".join(updates)
        with run_in_transaction() as cur:
            cur.execute(
                f"""
                UPDATE staff
                SET {set_clause}
                WHERE staff_id = %s
                RETURNING staff_id, username, name, email, phone, role, is_active;
                """,
                tuple(values),
            )
            updated_row = cur.fetchone()
        result = dict(updated_row)
        result["staff_id"] = str(result["staff_id"])
        return result

    return staff_dict


# =====================================================================
# Menu Services
# =====================================================================

def list_menu_items(category=None, status=None, search=None):
    """
    Retrieves all menu items joined with their kitchen station name.
    Supports filtering by category, status, and search query.
    """
    query = """
        SELECT m.item_id, m.name, m.category, m.description,
               m.price, m.status, m.station_id, s.s_name AS station_name
        FROM menu_item m
        JOIN station s ON m.station_id = s.station_id
        WHERE 1=1
    """
    params = []

    if category:
        query += " AND m.category = %s"
        params.append(category)

    if status:
        query += " AND m.status = %s"
        params.append(status)

    if search:
        search_like = f"%{search.strip()}%"
        query += " AND (m.name ILIKE %s OR m.description ILIKE %s)"
        params.extend([search_like, search_like])

    query += " ORDER BY m.category ASC, m.name ASC;"

    with run_in_transaction() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    items = []
    for r in rows:
        item = dict(r)
        if item.get("price") is not None:
            item["price"] = float(item["price"])
        items.append(item)

    return items


def create_menu_item(name, category, price, station_id, description=None, status="active"):
    """
    Creates a new menu item pointing to an existing kitchen station.
    """
    name = (name or "").strip()
    category = (category or "").strip()
    status = (status or "active").strip().lower()
    description = (description or "").strip() or None

    if not name:
        raise validation_error("Menu item name is required.")

    if category not in VALID_CATEGORIES:
        raise validation_error(f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}")

    if status not in VALID_MENU_STATUSES:
        raise validation_error(f"Status must be one of: {', '.join(sorted(VALID_MENU_STATUSES))}")

    try:
        price_num = float(price)
        if price_num < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise validation_error("Price must be a valid non-negative number.")

    # Verify station exists
    with run_in_transaction() as cur:
        cur.execute("SELECT station_id FROM station WHERE station_id = %s;", (station_id,))
        station = cur.fetchone()
        if not station:
            raise validation_error(f"Station with ID {station_id} does not exist.")

        # Check unique name
        cur.execute("SELECT item_id FROM menu_item WHERE name = %s;", (name,))
        if cur.fetchone():
            raise ApiError("DUPLICATE", f"A menu item named '{name}' already exists.", 409)

        cur.execute(
            """
            INSERT INTO menu_item (name, category, description, price, status, station_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING item_id, name, category, description, price, status, station_id;
            """,
            (name, category, description, price_num, status, station_id),
        )
        created = dict(cur.fetchone())

    created["price"] = float(created["price"])
    return created


def update_menu_item(item_id, name=None, category=None, price=None, station_id=None, description=None, status=None):
    """
    Updates an existing menu item.
    """
    with run_in_transaction() as cur:
        cur.execute("SELECT * FROM menu_item WHERE item_id = %s;", (item_id,))
        item = cur.fetchone()

    if not item:
        raise not_found(f"Menu item with ID {item_id} not found.")

    updates = []
    values = []

    if name is not None:
        name_clean = name.strip()
        if not name_clean:
            raise validation_error("Item name cannot be empty.")
        with run_in_transaction() as cur:
            cur.execute("SELECT item_id FROM menu_item WHERE name = %s AND item_id != %s;", (name_clean, item_id))
            if cur.fetchone():
                raise ApiError("DUPLICATE", f"A menu item named '{name_clean}' already exists.", 409)
        updates.append("name = %s")
        values.append(name_clean)

    if category is not None:
        cat_clean = category.strip()
        if cat_clean not in VALID_CATEGORIES:
            raise validation_error(f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}")
        updates.append("category = %s")
        values.append(cat_clean)

    if price is not None:
        try:
            price_num = float(price)
            if price_num < 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise validation_error("Price must be a valid non-negative number.")
        updates.append("price = %s")
        values.append(price_num)

    if station_id is not None:
        with run_in_transaction() as cur:
            cur.execute("SELECT station_id FROM station WHERE station_id = %s;", (station_id,))
            if not cur.fetchone():
                raise validation_error(f"Station with ID {station_id} does not exist.")
        updates.append("station_id = %s")
        values.append(station_id)

    if description is not None:
        updates.append("description = %s")
        values.append(description.strip() or None)

    if status is not None:
        status_clean = status.strip().lower()
        if status_clean not in VALID_MENU_STATUSES:
            raise validation_error(f"Status must be one of: {', '.join(sorted(VALID_MENU_STATUSES))}")
        updates.append("status = %s")
        values.append(status_clean)

    if not updates:
        res = dict(item)
        res["price"] = float(res["price"])
        return res

    values.append(item_id)
    set_clause = ", ".join(updates)

    with run_in_transaction() as cur:
        cur.execute(
            f"""
            UPDATE menu_item
            SET {set_clause}
            WHERE item_id = %s
            RETURNING item_id, name, category, description, price, status, station_id;
            """,
            tuple(values),
        )
        updated = dict(cur.fetchone())

    updated["price"] = float(updated["price"])
    return updated


# =====================================================================
# Station Services (Temporary)
# =====================================================================

def list_stations():
    """
    TEMPORARY: Returns active kitchen stations ordered by display_order.
    NOTE: Diya owns the /stations endpoint in Module 3 (kitchen.py).
    This temporary function will be decommissioned when Diya's service is integrated.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT station_id, s_name, is_active, display_order, target_prep_minutes
            FROM station
            ORDER BY display_order ASC;
            """
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]
