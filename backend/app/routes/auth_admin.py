"""
app/routes/auth_admin.py
Owner: Girish (Module 1 - Admin, Login and Security)

Flask routes for:
- Authentication & Password Recovery:
    * GET  /health
    * POST /auth/login
    * GET  /auth/me
    * POST /auth/forgot-password
    * POST /auth/reset-password
    * POST /auth/change-password
- Staff Management (Admin):
    * GET   /staff
    * POST  /staff
    * PATCH /staff/<staff_id>
- Menu Item Management:
    * GET   /menu-items
    * POST  /menu-items
    * PATCH /menu-items/<int:item_id>
- Temporary Endpoints:
    * GET   /stations (temporary until Diya implements Module 3)
    * GET   /test/menu (database test)

TODO: Routes for /dashboard, /reports/*, and /audit-log/* will be connected once the
corresponding database views (08_audit.sql and 09_reports.sql) are deployed.
"""

from flask import Blueprint, request, jsonify
import requests
from app.config import Config
from app.db import run_in_transaction
from app.auth import get_current_user, require_role
from app.errors import bad_request, unauthorized, forbidden, validation_error, ApiError
from app.services import admin_service

auth_admin_bp = Blueprint("auth_admin", __name__)


# =====================================================================
# Health & Diagnostic
# =====================================================================

@auth_admin_bp.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"}), 200


@auth_admin_bp.route("/test/menu", methods=["GET"])
def test_menu():
    """Test endpoint verifying database connection and menu items."""
    items = admin_service.list_menu_items()
    return jsonify({"menu_items": items}), 200


# =====================================================================
# Authentication & Recovery Routes
# =====================================================================

@auth_admin_bp.route("/auth/login", methods=["POST"])
def login():
    """
    Staff login endpoint (Screen 1):
    1. Reads username, password, role from request JSON.
    2. Looks up active staff row by username in PostgreSQL.
    3. Verifies that the requested role matches staff.role (else 403).
    4. Authenticates against Supabase Auth (email + password) using grant_type=password.
    5. Returns JWT access_token and user info.
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip()

    if not username or not password or not role:
        raise bad_request("Missing username, password, or role in request body")

    # 1. Lookup staff by username
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT staff_id, name, username, email, role, is_active
            FROM staff
            WHERE username = %s;
            """,
            (username,),
        )
        staff = cur.fetchone()

    if not staff:
        raise unauthorized("Invalid username or password")

    if not staff.get("is_active"):
        raise forbidden("Staff account is inactive. Please contact the administrator.")

    # 2. Check chosen role equals staff.role
    if staff.get("role") != role:
        raise forbidden(
            f"Role mismatch: account '{username}' has role '{staff.get('role')}', "
            f"but you attempted to log in as '{role}'."
        )

    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        raise unauthorized("Supabase auth credentials are not configured on backend")

    # 3. Sign in to Supabase Auth with email and password
    token_url = f"{Config.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": Config.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "email": staff.get("email"),
        "password": password,
    }

    try:
        resp = requests.post(token_url, headers=headers, json=payload, timeout=8)
    except Exception as e:
        raise unauthorized(f"Failed to communicate with authentication service: {str(e)}")

    if resp.status_code != 200:
        raise unauthorized("Invalid username or password")

    auth_data = resp.json()
    access_token = auth_data.get("access_token")
    if not access_token:
        raise unauthorized("Authentication succeeded but no access token was returned")

    return jsonify(
        {
            "access_token": access_token,
            "user": {
                "staff_id": str(staff["staff_id"]),
                "name": staff["name"],
                "username": staff["username"],
                "role": staff["role"],
            },
        }
    ), 200


@auth_admin_bp.route("/auth/me", methods=["GET"])
@require_role("admin", "waiter", "chef", "cashier")
def me():
    """Returns profile of currently authenticated staff member."""
    user = get_current_user()
    return jsonify({"user": user}), 200


@auth_admin_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    """
    Initiates password recovery email via Supabase Auth (Screen 2).
    Always returns generic success message to prevent user enumeration.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        raise validation_error("Email address is required.")

    if Config.SUPABASE_URL and Config.SUPABASE_ANON_KEY:
        recover_url = f"{Config.SUPABASE_URL}/auth/v1/recover"
        headers = {
            "apikey": Config.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }
        try:
            requests.post(recover_url, headers=headers, json={"email": email}, timeout=8)
        except Exception:
            pass  # Fail quietly to maintain generic response

    return jsonify({"message": "If this email is registered, a password recovery link has been sent."}), 200


@auth_admin_bp.route("/auth/reset-password", methods=["POST"])
def reset_password():
    """
    Completes password recovery using token from recovery email (Screen 2.1).
    Body: { access_token, new_password }
    """
    data = request.get_json(silent=True) or {}
    access_token = (data.get("access_token") or "").strip()
    new_password = data.get("new_password") or ""

    if not access_token:
        raise validation_error("Recovery access token is required.")

    if not new_password or len(new_password) < 8:
        raise validation_error("Password must be at least 8 characters long.")

    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        raise ApiError("CONFIG_ERROR", "Supabase credentials not configured on backend.", 500)

    user_url = f"{Config.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": Config.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.put(user_url, headers=headers, json={"password": new_password}, timeout=8)
    except Exception as e:
        raise ApiError("AUTH_ERROR", f"Failed to contact auth provider: {str(e)}", 500)

    if resp.status_code != 200:
        err_msg = resp.json().get("msg") or resp.json().get("message") or "Recovery token invalid or expired"
        raise ApiError("RECOVERY_FAILED", err_msg, 400)

    return jsonify({"message": "Password updated successfully. You can now log in."}), 200


@auth_admin_bp.route("/auth/change-password", methods=["POST"])
@require_role("admin", "waiter", "chef", "cashier")
def change_password():
    """
    Changes password for logged in staff member (Screen 3).
    Body: { current_password, new_password }
    Verifies current password first, then updates via service role.
    """
    current_user = get_current_user()
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password or not new_password:
        raise validation_error("Current password and new password are required.")

    if len(new_password) < 8:
        raise validation_error("New password must be at least 8 characters long.")

    # 1. Verify current password by signing in with user's email
    verify_url = f"{Config.SUPABASE_URL}/auth/v1/token?grant_type=password"
    verify_headers = {
        "apikey": Config.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    try:
        verify_resp = requests.post(
            verify_url,
            headers=verify_headers,
            json={"email": current_user["email"], "password": current_password},
            timeout=8,
        )
    except Exception as e:
        raise ApiError("AUTH_ERROR", f"Failed to verify credentials: {str(e)}", 500)

    if verify_resp.status_code != 200:
        raise unauthorized("Current password is incorrect.")

    # 2. Update to new password via Supabase Admin API
    admin_url = f"{Config.SUPABASE_URL}/auth/v1/admin/users/{current_user['staff_id']}"
    admin_headers = {
        "apikey": Config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {Config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        update_resp = requests.put(
            admin_url,
            headers=admin_headers,
            json={"password": new_password},
            timeout=8,
        )
    except Exception as e:
        raise ApiError("AUTH_ERROR", f"Failed to update password: {str(e)}", 500)

    if update_resp.status_code not in (200, 204):
        err_msg = update_resp.json().get("msg") or "Failed to update password"
        raise ApiError("PASSWORD_UPDATE_FAILED", err_msg, 400)

    return jsonify({"message": "Password changed successfully."}), 200


# =====================================================================
# Staff Management Routes (Screen 18)
# =====================================================================

@auth_admin_bp.route("/staff", methods=["GET"])
@require_role("admin")
def get_staff_list():
    """Lists staff members with filters (role, search, active)."""
    role = request.args.get("role")
    search = request.args.get("search")
    active_param = request.args.get("active")
    active = None
    if active_param is not None:
        active = active_param.lower() in ("true", "1")

    staff = admin_service.list_staff(role=role, search=search, active=active)
    return jsonify({"staff": staff}), 200


@auth_admin_bp.route("/staff", methods=["POST"])
@require_role("admin")
def create_staff_account():
    """Creates a new staff user in Supabase Auth and PostgreSQL."""
    data = request.get_json(silent=True) or {}
    new_staff = admin_service.create_staff(
        name=data.get("name"),
        username=data.get("username"),
        email=data.get("email"),
        role=data.get("role"),
        password=data.get("password"),
        phone=data.get("phone"),
    )
    return jsonify({"staff": new_staff}), 201


@auth_admin_bp.route("/staff/<staff_id>", methods=["PATCH"])
@require_role("admin")
def update_staff_account(staff_id):
    """Updates staff name, phone, role, is_active, and optional new password."""
    current_user = get_current_user()
    data = request.get_json(silent=True) or {}
    updated = admin_service.update_staff(
        staff_id=staff_id,
        current_user=current_user,
        name=data.get("name"),
        phone=data.get("phone"),
        role=data.get("role"),
        is_active=data.get("is_active"),
        password=data.get("password"),
    )
    return jsonify({"staff": updated}), 200


# =====================================================================
# Menu Items Routes (Screen 17)
# =====================================================================

@auth_admin_bp.route("/menu-items", methods=["GET"])
def get_menu_items():
    """Lists menu items joined with kitchen station name."""
    category = request.args.get("category")
    status = request.args.get("status")
    search = request.args.get("search")
    items = admin_service.list_menu_items(category=category, status=status, search=search)
    return jsonify({"menu_items": items}), 200


@auth_admin_bp.route("/menu-items", methods=["POST"])
@require_role("admin")
def create_menu_item():
    """Creates a new menu item assigned to a kitchen station."""
    data = request.get_json(silent=True) or {}
    created = admin_service.create_menu_item(
        name=data.get("name"),
        category=data.get("category"),
        price=data.get("price"),
        station_id=data.get("station_id"),
        description=data.get("description"),
        status=data.get("status", "active"),
    )
    return jsonify({"menu_item": created}), 201


@auth_admin_bp.route("/menu-items/<int:item_id>", methods=["PATCH"])
@require_role("admin")
def update_menu_item(item_id):
    """Updates an existing menu item or deactivates it (status: inactive)."""
    data = request.get_json(silent=True) or {}
    updated = admin_service.update_menu_item(
        item_id=item_id,
        name=data.get("name"),
        category=data.get("category"),
        price=data.get("price"),
        station_id=data.get("station_id"),
        description=data.get("description"),
        status=data.get("status"),
    )
    return jsonify({"menu_item": updated}), 200


# =====================================================================
# Stations Route: Implemented by Diya in kitchen.py
# =====================================================================


# =====================================================================
# Placeholders for Dashboard, Reports, and Audit Log
# =====================================================================
# TODO: Connect real backend routes for /dashboard, /reports/*, and /audit-log/*
# once 08_audit.sql and 09_reports.sql are executed on the database.
# For now, these screens consume mock data via src/api/admin.js.
