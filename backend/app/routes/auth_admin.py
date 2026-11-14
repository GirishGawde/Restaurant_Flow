"""
app/routes/auth_admin.py
Owner: Girish (Module 1 - Admin, Login and Security)

Endpoints for:
- GET  /health: health check endpoint (returns {"status": "ok"})
- GET  /test/menu: verifies database connectivity by returning menu items with stations (temporary)
- POST /auth/login: verifies role, authenticates staff via Supabase, and returns access_token + user info
- GET  /auth/me: returns authenticated staff profile
"""

from flask import Blueprint, request, jsonify
import requests
from app.config import Config
from app.db import run_in_transaction
from app.auth import get_current_user, require_role
from app.errors import bad_request, unauthorized, forbidden

auth_admin_bp = Blueprint("auth_admin", __name__)


@auth_admin_bp.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint to verify backend is up and running."""
    return jsonify({"status": "ok"}), 200


@auth_admin_bp.route("/test/menu", methods=["GET"])
def test_menu():
    """
    Test endpoint to verify database connection and join between menu_item and station.
    NOTE: Delete or replace this endpoint when full menu routes are created.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT m.item_id, m.name, m.category, m.description,
                   m.price, m.status, s.s_name AS station_name
            FROM menu_item m
            JOIN station s ON s.station_id = m.station_id
            ORDER BY m.category, m.name;
            """
        )
        items = cur.fetchall()

    # Convert Decimal prices to float for JSON serialization
    serialized_items = []
    for row in items:
        item = dict(row)
        if item.get("price") is not None:
            item["price"] = float(item["price"])
        serialized_items.append(item)

    return jsonify({"menu_items": serialized_items}), 200


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
        raise unauthorized("Supabase auth credentials are not configured on the backend")

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
        # Supabase returned 400/401 for wrong credentials
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
    """
    Returns current authenticated staff user profile.
    Accessible to any logged-in role.
    """
    user = get_current_user()
    return jsonify({"user": user}), 200
