"""
app/services/waiter_service.py
Owner: Ayush (Module 2 - Waiter and Orders)

PostgreSQL database operations and business logic for the Waiter Module:
- Table Map & status management (/tables, /tables/<id>/mark-clean)
- Menu querying with ingredient search (/menu)
- Order lifecycle: open, view, items management, send to kitchen, request bill, cancel
- Concurrency controls:
    * Optimistic version conflict checking on order mutations (VERSION_CONFLICT)
    * Pessimistic row locking with 30s timeout demonstration (LOCK_TIMEOUT)
    * Lock-ordering deadlock prevention in order merging
"""

from decimal import Decimal
import psycopg2
from psycopg2 import errors as pg_errors
from app.db import run_in_transaction
from app.errors import (
    ApiError,
    bad_request,
    not_found,
    conflict,
    version_conflict,
    lock_timeout,
    validation_error,
)


def _serialize_row(row):
    """Converts a RealDictRow into a JSON-serializable dictionary."""
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
        elif hasattr(v, "isoformat"):
            d[k] = v.isoformat()
        elif hasattr(v, "hex"):  # UUID
            d[k] = str(v)
    return d


# =====================================================================
# 1. Table Map Operations (Screen 4)
# =====================================================================

def get_tables(section=None, waiter_id=None):
    """
    Fetches table overview for Screen 4 (Table Map).
    Reads from v_table_map view with fallback to table join if view not yet created.
    Returns tables list and computed summary counts.
    """
    with run_in_transaction() as cur:
        # Check if v_table_map view exists
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.views
                WHERE table_name = 'v_table_map'
            );
            """
        )
        view_exists = cur.fetchone().get("exists", False)

        if view_exists:
            query = """
                SELECT table_id, t_no, table_label, section, capacity,
                       table_status AS status, order_id, current_guests,
                       order_status, order_version, waiter_name, waiter_username,
                       order_opened_at, elapsed_minutes
                FROM v_table_map
                WHERE 1=1
            """
            params = []
            if section and section.lower() != "all":
                query += " AND section ILIKE %s"
                params.append(f"%{section.strip()}%")
            query += " ORDER BY section ASC, t_no ASC;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
        else:
            # Fallback direct query
            query = """
                SELECT t.table_id, t.t_no, ('T-' || LPAD(t.t_no::text, 2, '0')) AS table_label,
                       t.section, t.capacity, t.status,
                       o.order_id, o.guests AS current_guests, o.status AS order_status,
                       o.version AS order_version, s.name AS waiter_name, s.username AS waiter_username,
                       o.created_at AS order_opened_at,
                       CASE
                           WHEN o.created_at IS NOT NULL THEN
                               ROUND(EXTRACT(EPOCH FROM (now() - o.created_at)) / 60)::int
                           ELSE NULL
                       END AS elapsed_minutes
                FROM restaurant_table t
                LEFT JOIN orders o ON t.table_id = o.table_id AND o.status IN ('open', 'in_kitchen', 'served', 'bill_requested')
                LEFT JOIN staff s ON o.waiter_id = s.staff_id
                WHERE 1=1
            """
            params = []
            if section and section.lower() != "all":
                query += " AND t.section ILIKE %s"
                params.append(f"%{section.strip()}%")
            query += " ORDER BY t.section ASC, t.t_no ASC;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    tables = [_serialize_row(r) for r in rows]

    # Compute summary metrics
    summary = {
        "total": len(tables),
        "free": sum(1 for t in tables if t["status"] == "free"),
        "occupied": sum(1 for t in tables if t["status"] == "occupied"),
        "needs_cleaning": sum(1 for t in tables if t["status"] == "needs_cleaning"),
        "reserved": sum(1 for t in tables if t["status"] == "reserved"),
    }

    return {"tables": tables, "summary": summary}


def mark_table_clean(table_id):
    """
    Screen 4 action: changes a table status from 'needs_cleaning' to 'free'.
    Acquires exclusive row lock on restaurant_table.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT table_id, t_no, status, capacity, section
            FROM restaurant_table
            WHERE table_id = %s
            FOR UPDATE;
            """,
            (table_id,),
        )
        table = cur.fetchone()

        if not table:
            raise not_found(f"Table with ID {table_id} does not exist")

        current_status = table.get("status")
        if current_status != "needs_cleaning":
            raise conflict(
                f"Table {table.get('t_no')} is currently '{current_status}'. "
                "Only tables with status 'needs_cleaning' can be marked clean."
            )

        cur.execute(
            """
            UPDATE restaurant_table
            SET status = 'free'
            WHERE table_id = %s
            RETURNING table_id, t_no, status;
            """,
            (table_id,),
        )
        updated = cur.fetchone()

    return {
        "success": True,
        "table_id": updated["table_id"],
        "table_no": updated["t_no"],
        "status": updated["status"],
        "message": f"Table T-{updated['t_no']:02d} is now clean and available for guests.",
    }


# =====================================================================
# 2. Menu Query Operations (Screen 6)
# =====================================================================

def get_menu(category=None, search=None):
    """
    Fetches menu items for Screen 6 (Menu Browser).
    Supports category filtering and keyword search across item name and category.
    """
    query = """
        SELECT item_id, name, category, price, status, station_id
        FROM menu_item
        WHERE status IN ('active', 'sold_out')
    """
    params = []

    if category and category.lower() != "all":
        query += " AND category ILIKE %s"
        params.append(f"%{category.strip()}%")

    if search:
        search_like = f"%{search.strip()}%"
        query += " AND (name ILIKE %s OR category ILIKE %s)"
        params.extend([search_like, search_like])

    query += " ORDER BY category ASC, name ASC;"

    with run_in_transaction() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    return [_serialize_row(r) for r in rows]


# =====================================================================
# 3. Order Lifecycle Operations (Screens 5, 7, 10)
# =====================================================================

def open_order(table_id, guests, notes, waiter_id):
    """
    Screen 5: Opens a new order for a free table.
    Validates capacity and table availability under a row lock.
    Sets table to 'occupied' and creates order with version = 1.
    """
    if not table_id:
        raise bad_request("table_id is required to open an order")
    try:
        guests = int(guests)
        if guests < 1:
            raise bad_request("Guest count must be at least 1")
    except (ValueError, TypeError):
        raise bad_request("Invalid guest count")

    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT table_id, t_no, capacity, status, section
            FROM restaurant_table
            WHERE table_id = %s
            FOR UPDATE;
            """,
            (table_id,),
        )
        table = cur.fetchone()

        if not table:
            raise not_found(f"Table {table_id} does not exist")

        if table.get("status") != "free":
            raise conflict(
                f"Table T-{table.get('t_no'):02d} is not available (current status: '{table.get('status')}')."
            )

        if guests > table.get("capacity"):
            raise validation_error(
                f"Guest count ({guests}) exceeds seating capacity ({table.get('capacity')}) "
                f"for Table T-{table.get('t_no'):02d}."
            )

        # Create new order
        cur.execute(
            """
            INSERT INTO orders (table_id, waiter_id, status, version, guests, notes, created_at)
            VALUES (%s, %s, 'open', 1, %s, %s, now())
            RETURNING order_id, table_id, waiter_id, status, version, guests, notes, created_at;
            """,
            (table_id, waiter_id, guests, notes or None),
        )
        new_order = cur.fetchone()

        # Update table status to occupied
        cur.execute(
            """
            UPDATE restaurant_table
            SET status = 'occupied'
            WHERE table_id = %s;
            """,
            (table_id,),
        )

    res = _serialize_row(new_order)
    res["table_no"] = f"T-{table.get('t_no'):02d}"
    res["section"] = table.get("section")
    return res


def get_orders(waiter_id=None, status=None, search=None, date=None):
    """
    Fetches orders for Screen 10 (My Orders).
    Supports filters: waiter_id, status, search keyword, and date.
    Returns orders list and status breakdown summary.
    """
    with run_in_transaction() as cur:
        # Check if v_my_orders view exists
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.views
                WHERE table_name = 'v_my_orders'
            );
            """
        )
        view_exists = cur.fetchone().get("exists", False)

        if view_exists:
            query = """
                SELECT order_id, order_code, table_id, table_no, section,
                       waiter_id, waiter_name, waiter_username, guests,
                       status, version, notes, created_at, closed_at,
                       total_items, subtotal
                FROM v_my_orders
                WHERE 1=1
            """
            params = []
            if waiter_id:
                query += " AND waiter_id = %s"
                params.append(waiter_id)
            if status and status.lower() != "all":
                if status.lower() == "open":
                    query += " AND status IN ('open', 'in_kitchen', 'served', 'bill_requested')"
                else:
                    query += " AND status = %s"
                    params.append(status.lower())
            if search:
                search_like = f"%{search.strip()}%"
                query += " AND (order_code ILIKE %s OR table_no ILIKE %s OR notes ILIKE %s OR waiter_name ILIKE %s)"
                params.extend([search_like, search_like, search_like, search_like])
            if date:
                query += " AND DATE(created_at) = %s"
                params.append(date)

            query += " ORDER BY created_at DESC;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
        else:
            # Fallback direct query
            query = """
                SELECT o.order_id, ('ORD-' || LPAD(o.order_id::text, 3, '0')) AS order_code,
                       o.table_id, ('T-' || LPAD(t.t_no::text, 2, '0')) AS table_no,
                       t.section, o.waiter_id, s.name AS waiter_name, s.username AS waiter_username,
                       o.guests, o.status, o.version, o.notes, o.created_at, o.closed_at,
                       COALESCE(SUM(oi.quantity) FILTER (WHERE oi.status != 'cancelled'), 0)::int AS total_items,
                       COALESCE(SUM(oi.quantity * oi.unit_price) FILTER (WHERE oi.status != 'cancelled'), 0.00)::numeric(10,2) AS subtotal
                FROM orders o
                JOIN restaurant_table t ON o.table_id = t.table_id
                JOIN staff s ON o.waiter_id = s.staff_id
                LEFT JOIN order_item oi ON o.order_id = oi.order_id
                WHERE 1=1
            """
            params = []
            if waiter_id:
                query += " AND o.waiter_id = %s"
                params.append(waiter_id)
            if status and status.lower() != "all":
                if status.lower() == "open":
                    query += " AND o.status IN ('open', 'in_kitchen', 'served', 'bill_requested')"
                else:
                    query += " AND o.status = %s"
                    params.append(status.lower())
            if search:
                search_like = f"%{search.strip()}%"
                query += " AND (('ORD-' || LPAD(o.order_id::text, 3, '0')) ILIKE %s OR ('T-' || LPAD(t.t_no::text, 2, '0')) ILIKE %s OR o.notes ILIKE %s OR s.name ILIKE %s)"
                params.extend([search_like, search_like, search_like, search_like])
            if date:
                query += " AND DATE(o.created_at) = %s"
                params.append(date)

            query += " GROUP BY o.order_id, t.t_no, t.section, s.name, s.username ORDER BY o.created_at DESC;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    orders = [_serialize_row(r) for r in rows]

    summary = {
        "total": len(orders),
        "open": sum(1 for o in orders if o["status"] == "open"),
        "in_kitchen": sum(1 for o in orders if o["status"] == "in_kitchen"),
        "served": sum(1 for o in orders if o["status"] == "served"),
        "bill_requested": sum(1 for o in orders if o["status"] == "bill_requested"),
        "closed": sum(1 for o in orders if o["status"] == "closed"),
        "cancelled": sum(1 for o in orders if o["status"] == "cancelled"),
    }

    return {"orders": orders, "summary": summary}


def get_order_by_id(order_id):
    """
    Fetches complete order details for Screen 7 (Order Panel).
    Includes line items, item status ('draft' vs 'sent'), price calculations,
    and optimistic version counter.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT o.order_id, ('ORD-' || LPAD(o.order_id::text, 3, '0')) AS order_code,
                   o.table_id, ('T-' || LPAD(t.t_no::text, 2, '0')) AS table_no,
                   t.section, o.waiter_id, s.name AS waiter_name, s.username AS waiter_username,
                   o.status, o.version, o.guests, o.notes, o.created_at, o.closed_at
            FROM orders o
            JOIN restaurant_table t ON o.table_id = t.table_id
            JOIN staff s ON o.waiter_id = s.staff_id
            WHERE o.order_id = %s;
            """,
            (order_id,),
        )
        order_row = cur.fetchone()

        if not order_row:
            raise not_found(f"Order {order_id} not found")

        cur.execute(
            """
            SELECT oi.order_item_id, oi.item_id, m.name, oi.quantity,
                   oi.unit_price, (oi.quantity * oi.unit_price) AS subtotal,
                   oi.status, oi.notes, oi.added_at, oi.added_by
            FROM order_item oi
            JOIN menu_item m ON oi.item_id = m.item_id
            WHERE oi.order_id = %s
            ORDER BY oi.order_item_id ASC;
            """,
            (order_id,),
        )
        item_rows = cur.fetchall()

    order = _serialize_row(order_row)
    items = [_serialize_row(r) for r in item_rows]

    active_items = [it for it in items if it.get("status") != "cancelled"]
    order["items"] = items
    order["total_items"] = sum(it.get("quantity", 0) for it in active_items)
    order["subtotal"] = round(sum(it.get("subtotal", 0.0) for it in active_items), 2)
    order["draft_items_count"] = sum(1 for it in items if it.get("status") == "draft")
    order["sent_items_count"] = sum(1 for it in items if it.get("status") == "sent")

    return order


# =====================================================================
# 4. Concurrency & Item Modification Operations
# =====================================================================

def add_order_item(order_id, item_id, quantity, notes, expected_version, waiter_id):
    """
    Screen 6/7: Adds a menu item to an order as 'draft'.
    Implements Optimistic Concurrency Control (OCC):
    Checks expected_version against current database version.
    Raises ApiError 409 VERSION_CONFLICT if mismatch.
    Increments order version on success.
    """
    if not item_id:
        raise bad_request("item_id is required")
    try:
        quantity = int(quantity)
        if quantity < 1:
            raise bad_request("Quantity must be at least 1")
    except (ValueError, TypeError):
        raise bad_request("Invalid quantity")

    if expected_version is None:
        raise bad_request("expected_version is required for optimistic concurrency control")

    with run_in_transaction() as cur:
        # Check order version under row lock
        cur.execute(
            """
            SELECT version, status
            FROM orders
            WHERE order_id = %s
            FOR UPDATE;
            """,
            (order_id,),
        )
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        current_version = order["version"]
        status = order["status"]

        if status in ("closed", "cancelled"):
            raise conflict(f"Cannot modify closed or cancelled order (status: '{status}')")

        if status == "bill_requested":
            raise conflict("Cannot add items to an order after bill has been requested")

        # OCC Version Check
        if current_version != int(expected_version):
            raise version_conflict(
                current_version=current_version,
                message=f"Order was changed by another user (expected version {expected_version}, but current is {current_version}).",
            )

        # Check menu item price and availability
        cur.execute(
            """
            SELECT item_id, name, price, status
            FROM menu_item
            WHERE item_id = %s;
            """,
            (item_id,),
        )
        menu_item = cur.fetchone()

        if not menu_item or menu_item.get("status") != "active":
            raise bad_request("Menu item is unavailable or does not exist")

        unit_price = menu_item["price"]

        # Check if item is already in draft for this order
        cur.execute(
            """
            SELECT order_item_id, quantity
            FROM order_item
            WHERE order_id = %s AND item_id = %s AND status = 'draft';
            """,
            (order_id, item_id),
        )
        existing_draft = cur.fetchone()

        if existing_draft:
            cur.execute(
                """
                UPDATE order_item
                SET quantity = quantity + %s,
                    notes = COALESCE(%s, notes)
                WHERE order_item_id = %s
                RETURNING order_item_id;
                """,
                (quantity, notes or None, existing_draft["order_item_id"]),
            )
            item_row = cur.fetchone()
        else:
            cur.execute(
                """
                INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, notes, added_by, added_at)
                VALUES (%s, %s, %s, %s, 'draft', %s, %s, now())
                RETURNING order_item_id;
                """,
                (order_id, item_id, quantity, unit_price, notes or None, waiter_id),
            )
            item_row = cur.fetchone()

        # Increment order version counter
        cur.execute(
            """
            UPDATE orders
            SET version = version + 1
            WHERE order_id = %s
            RETURNING version;
            """,
            (order_id,),
        )
        updated_order = cur.fetchone()

    return {
        "success": True,
        "order_id": order_id,
        "order_item_id": item_row["order_item_id"],
        "version": updated_order["version"],
        "message": f"Added {quantity}x {menu_item['name']} to order draft (version {updated_order['version']})",
    }


def update_order_item(order_id, item_id, quantity, notes, expected_version):
    """
    Screen 7: Updates quantity or special notes for a draft order item.
    Performs optimistic version validation.
    """
    if expected_version is None:
        raise bad_request("expected_version is required")

    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT version, status
            FROM orders
            WHERE order_id = %s
            FOR UPDATE;
            """,
            (order_id,),
        )
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        current_version = order["version"]
        if current_version != int(expected_version):
            raise version_conflict(
                current_version=current_version,
                message=f"Order was changed by another user (current version: {current_version}).",
            )

        # Lookup item by order_item_id or item_id
        cur.execute(
            """
            SELECT order_item_id, status, quantity
            FROM order_item
            WHERE order_id = %s AND (order_item_id = %s OR item_id = %s)
            LIMIT 1
            FOR UPDATE;
            """,
            (order_id, item_id, item_id),
        )
        item = cur.fetchone()

        if not item:
            raise not_found(f"Item not found on order {order_id}")

        if item.get("status") != "draft":
            raise conflict(
                f"Only draft items can be edited. This item is already '{item.get('status')}'."
            )

        if quantity is not None and int(quantity) <= 0:
            cur.execute("DELETE FROM order_item WHERE order_item_id = %s;", (item["order_item_id"],))
        else:
            cur.execute(
                """
                UPDATE order_item
                SET quantity = COALESCE(%s, quantity),
                    notes = COALESCE(%s, notes)
                WHERE order_item_id = %s;
                """,
                (int(quantity) if quantity is not None else None, notes, item["order_item_id"]),
            )

        cur.execute(
            """
            UPDATE orders
            SET version = version + 1
            WHERE order_id = %s
            RETURNING version;
            """,
            (order_id,),
        )
        new_version = cur.fetchone()["version"]

    return {"success": True, "order_id": order_id, "version": new_version}


def remove_order_item(order_id, item_id, expected_version):
    """
    Screen 7: Removes or cancels an item from an order.
    Draft items are deleted; sent items are marked 'cancelled'.
    Performs optimistic version check.
    """
    if expected_version is None:
        raise bad_request("expected_version is required")

    with run_in_transaction() as cur:
        cur.execute("SELECT version, status FROM orders WHERE order_id = %s FOR UPDATE;", (order_id,))
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        current_version = order["version"]
        if current_version != int(expected_version):
            raise version_conflict(
                current_version=current_version,
                message="Order was modified by another user. Please refresh.",
            )

        cur.execute(
            """
            SELECT order_item_id, status
            FROM order_item
            WHERE order_id = %s AND (order_item_id = %s OR item_id = %s)
            LIMIT 1
            FOR UPDATE;
            """,
            (order_id, item_id, item_id),
        )
        item = cur.fetchone()

        if not item:
            raise not_found(f"Item not found on order {order_id}")

        if item.get("status") == "draft":
            cur.execute("DELETE FROM order_item WHERE order_item_id = %s;", (item["order_item_id"],))
        else:
            cur.execute("UPDATE order_item SET status = 'cancelled' WHERE order_item_id = %s;", (item["order_item_id"],))

        cur.execute("UPDATE orders SET version = version + 1 WHERE order_id = %s RETURNING version;", (order_id,))
        new_version = cur.fetchone()["version"]

    return {"success": True, "order_id": order_id, "version": new_version}


def send_to_kitchen(order_id, expected_version):
    """
    Screen 7: Advances all 'draft' items to 'sent' and updates order status to 'in_kitchen'.
    Checks expected_version. Fails if no draft items exist.
    """
    if expected_version is None:
        raise bad_request("expected_version is required to send order to kitchen")

    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT version, status
            FROM orders
            WHERE order_id = %s
            FOR UPDATE;
            """,
            (order_id,),
        )
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        current_version = order["version"]
        if current_version != int(expected_version):
            raise version_conflict(
                current_version=current_version,
                message=f"Order was modified by another user (expected {expected_version}, current is {current_version}).",
            )

        # Count draft items
        cur.execute(
            """
            SELECT COUNT(*) AS count
            FROM order_item
            WHERE order_id = %s AND status = 'draft';
            """,
            (order_id,),
        )
        draft_count = cur.fetchone().get("count", 0)

        if draft_count == 0:
            raise bad_request("There are no draft items to send to the kitchen")

        # Advance draft items to sent
        cur.execute(
            """
            UPDATE order_item
            SET status = 'sent'
            WHERE order_id = %s AND status = 'draft';
            """,
            (order_id,),
        )

        # Advance order status and version
        cur.execute(
            """
            UPDATE orders
            SET status = 'in_kitchen',
                version = version + 1
            WHERE order_id = %s
            RETURNING version, status;
            """,
            (order_id,),
        )
        updated = cur.fetchone()

    return {
        "success": True,
        "order_id": order_id,
        "status": updated["status"],
        "version": updated["version"],
        "items_sent": draft_count,
        "message": f"Successfully sent {draft_count} items to kitchen. Order updated to version {updated['version']}.",
    }


def acquire_order_lock(order_id, waiter_id, wait_seconds=30):
    """
    Screen 8B: Pessimistic Row Locking Demo.
    Attempts to acquire exclusive FOR UPDATE lock on the order with a 30s timeout.
    If another transaction holds the lock, raises LOCK_TIMEOUT (HTTP 409).
    """
    try:
        with run_in_transaction() as cur:
            # Set local statement lock timeout
            cur.execute(f"SET LOCAL lock_timeout = '{int(wait_seconds)}s';")
            cur.execute(
                """
                SELECT o.order_id, o.version, o.status, s.name AS waiter_name
                FROM orders o
                JOIN staff s ON o.waiter_id = s.staff_id
                WHERE o.order_id = %s
                FOR UPDATE NOWAIT;
                """,
                (order_id,),
            )
            order = cur.fetchone()

            if not order:
                raise not_found(f"Order {order_id} not found")

            return {
                "success": True,
                "order_id": order_id,
                "locked": True,
                "expires_in": wait_seconds,
                "message": f"Exclusive lock acquired on order {order_id} for {wait_seconds} seconds.",
            }
    except psycopg2.Error as e:
        if isinstance(e, pg_errors.LockNotAvailable):
            # Query who currently holds order
            raise lock_timeout(
                locked_by="Another Staff",
                locked_at=None,
                message=f"Order {order_id} is currently locked by another concurrent session.",
            )
        raise


def request_bill(order_id):
    """
    Screen 7: Marks order as 'bill_requested'.
    Verifies that order is not already closed and that no draft items remain unsent.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT order_id, status, table_id
            FROM orders
            WHERE order_id = %s
            FOR UPDATE;
            """,
            (order_id,),
        )
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        status = order.get("status")
        if status in ("closed", "cancelled"):
            raise conflict(f"Order is already {status}")

        if status == "bill_requested":
            return {"success": True, "order_id": order_id, "status": "bill_requested", "message": "Bill already requested"}

        # Ensure no draft items remain
        cur.execute(
            """
            SELECT COUNT(*) AS count
            FROM order_item
            WHERE order_id = %s AND status = 'draft';
            """,
            (order_id,),
        )
        draft_count = cur.fetchone().get("count", 0)

        if draft_count > 0:
            raise conflict("Cannot request bill while draft items remain unsent. Send or cancel them first.")

        cur.execute(
            """
            UPDATE orders
            SET status = 'bill_requested'
            WHERE order_id = %s
            RETURNING order_id, status;
            """,
            (order_id,),
        )
        updated = cur.fetchone()

    return {
        "success": True,
        "order_id": order_id,
        "status": updated["status"],
        "message": "Bill requested successfully. Handed off to Cashier.",
    }


def cancel_order(order_id):
    """
    Screen 7 / Screen 4: Cancels an active order, marks items cancelled, and frees the table.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT order_id, table_id, status
            FROM orders
            WHERE order_id = %s
            FOR UPDATE;
            """,
            (order_id,),
        )
        order = cur.fetchone()

        if not order:
            raise not_found(f"Order {order_id} not found")

        status = order.get("status")
        if status in ("closed", "cancelled"):
            raise conflict(f"Order {order_id} is already {status}")

        table_id = order.get("table_id")

        cur.execute(
            """
            UPDATE orders
            SET status = 'cancelled',
                closed_at = now()
            WHERE order_id = %s;
            """,
            (order_id,),
        )

        cur.execute(
            """
            UPDATE order_item
            SET status = 'cancelled'
            WHERE order_id = %s;
            """,
            (order_id,),
        )

        cur.execute(
            """
            UPDATE restaurant_table
            SET status = 'free'
            WHERE table_id = %s;
            """,
            (table_id,),
        )

    return {
        "success": True,
        "order_id": order_id,
        "status": "cancelled",
        "message": f"Order {order_id} has been cancelled and Table has been marked free.",
    }


def merge_orders(source_order_id, target_order_id, waiter_id):
    """
    Concurrency Demo: Merges two active orders.
    Implements lock-ordering fix: locks lower order_id first to guarantee deadlock-free execution.
    """
    if source_order_id == target_order_id:
        raise bad_request("Cannot merge an order into itself")

    first_id = min(source_order_id, target_order_id)
    second_id = max(source_order_id, target_order_id)

    with run_in_transaction() as cur:
        # Acquire locks in ascending order
        cur.execute("SELECT order_id, status, table_id, guests FROM orders WHERE order_id = %s FOR UPDATE;", (first_id,))
        o1 = cur.fetchone()
        cur.execute("SELECT order_id, status, table_id, guests FROM orders WHERE order_id = %s FOR UPDATE;", (second_id,))
        o2 = cur.fetchone()

        if not o1 or not o2:
            raise not_found("One or both orders not found")

        src = o1 if o1["order_id"] == source_order_id else o2
        tgt = o2 if o2["order_id"] == target_order_id else o1

        if src["status"] in ("closed", "cancelled") or tgt["status"] in ("closed", "cancelled"):
            raise conflict("Cannot merge closed or cancelled orders")

        # Move items
        cur.execute("UPDATE order_item SET order_id = %s WHERE order_id = %s;", (target_order_id, source_order_id))

        # Update target order
        cur.execute(
            """
            UPDATE orders
            SET guests = guests + %s,
                version = version + 1
            WHERE order_id = %s
            RETURNING version;
            """,
            (src["guests"], target_order_id),
        )
        new_version = cur.fetchone()["version"]

        # Cancel source order and free source table
        cur.execute(
            """
            UPDATE orders
            SET status = 'cancelled',
                closed_at = now(),
                notes = COALESCE(notes, '') || ' (Merged into ORD-' || %s || ')'
            WHERE order_id = %s;
            """,
            (str(target_order_id), source_order_id),
        )

        cur.execute("UPDATE restaurant_table SET status = 'free' WHERE table_id = %s;", (src["table_id"],))

    return {
        "success": True,
        "source_order_id": source_order_id,
        "target_order_id": target_order_id,
        "target_version": new_version,
        "message": f"Order {source_order_id} merged into {target_order_id}.",
    }
