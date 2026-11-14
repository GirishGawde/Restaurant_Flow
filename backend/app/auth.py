"""
app/auth.py
Owner: Girish (Module 1 - Admin & Auth)

Authentication and role-based authorization helpers.
- get_current_user(): verifies Bearer token against Supabase Auth API and loads active staff profile.
- @require_role(*roles): decorator enforcing staff role permissions for endpoints.
"""

from functools import wraps
from flask import request, g
import requests
from app.config import Config
from app.db import run_in_transaction
from app.errors import unauthorized, forbidden


def get_current_user():
    """
    Reads the Bearer token from the HTTP Authorization header, verifies it with
    Supabase Auth, and fetches the staff row from PostgreSQL.

    Returns:
        dict: staff profile dictionary {staff_id, name, username, role, is_active}

    Raises:
        ApiError (401): if the token is missing, expired, or invalid.
        ApiError (403): if the staff record is not found or is deactivated.
    """
    # Reuse cached user in request context if already authenticated
    if hasattr(g, "user") and g.user:
        return g.user

    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise unauthorized("Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise unauthorized("Bearer token is empty")

    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        raise unauthorized("Supabase auth credentials not configured on backend")

    # Verify token with Supabase Auth GET /auth/v1/user
    verify_url = f"{Config.SUPABASE_URL}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": Config.SUPABASE_ANON_KEY,
    }

    try:
        response = requests.get(verify_url, headers=headers, timeout=5)
    except Exception as e:
        raise unauthorized(f"Failed to reach Supabase Auth server: {str(e)}")

    if response.status_code != 200:
        raise unauthorized("Invalid or expired session token")

    auth_data = response.json()
    user_id = auth_data.get("id")
    if not user_id:
        raise unauthorized("User ID missing from authentication provider")

    # Look up staff row in PostgreSQL
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT staff_id, name, username, role, is_active
            FROM staff
            WHERE staff_id = %s;
            """,
            (user_id,),
        )
        staff = cur.fetchone()

    if not staff:
        raise forbidden("No staff profile found for this user account")

    if not staff.get("is_active"):
        raise forbidden("Staff account has been deactivated")

    user_dict = dict(staff)
    user_dict["staff_id"] = str(user_dict["staff_id"])

    # Store on Flask context g for access in views
    g.user = user_dict
    g.staff = user_dict
    return user_dict


def require_role(*roles):
    """
    Decorator for Flask routes requiring one or more specific roles
    (e.g. @require_role("admin"), @require_role("waiter", "admin")).

    Calls get_current_user() and raises 403 Forbidden if user's role is not in allowed roles.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if roles and user.get("role") not in roles:
                allowed_str = ", ".join(roles)
                raise forbidden(f"Access forbidden. Required role: {allowed_str}; current role: {user.get('role')}")
            return f(*args, **kwargs)
        return wrapper
    return decorator
