"""
tests/test_auth_admin.py
Unit tests verifying endpoint registrations, input validation, and error structures for Module 1.
"""

from app import create_app


def test_forgot_password_validation():
    app = create_app()
    client = app.test_client()

    # Missing email should return 422
    res = client.post("/auth/forgot-password", json={})
    assert res.status_code == 422
    data = res.get_json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"

    # Valid email format returns generic 200
    res = client.post("/auth/forgot-password", json={"email": "jlee@resto.test"})
    assert res.status_code == 200
    assert "message" in res.get_json()


def test_reset_password_validation():
    app = create_app()
    client = app.test_client()

    # Short password (< 8 chars) should return 422
    res = client.post(
        "/auth/reset-password",
        json={"access_token": "some-token", "new_password": "short"},
    )
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_menu_items_input_validation():
    app = create_app()
    client = app.test_client()

    # Unauthenticated POST should return 401
    res = client.post("/menu-items", json={"name": "Test"})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"
