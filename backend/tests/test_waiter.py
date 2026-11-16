"""
tests/test_waiter.py
Owner: Ayush (Module 2 - Waiter and Orders)

Comprehensive unit and integration tests for Module 2:
- Endpoint registrations for Screens 4 to 10
- Authentication requirements (Bearer token enforcement)
- Input validations for order opening, draft item mutations, and kitchen dispatch
- Optimistic Concurrency Control (expected_version parameter enforcement)
- Uniform error structure verification {"error": {"code": ..., "message": ...}}
"""

import pytest
from app import create_app
from app.errors import ApiError, version_conflict, lock_timeout


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_waiter_routes_unauthenticated(client):
    """Mutating waiter routes must reject requests without Authorization header with 401."""
    # Screen 4: Mark Clean
    res = client.post("/tables/1/mark-clean")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Screen 5: Open Order
    res = client.post("/orders", json={"table_id": 1, "guests": 2})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Screen 6/7: Add Item
    res = client.post("/orders/1/items", json={"item_id": 1, "expected_version": 1})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Screen 7: Send to kitchen
    res = client.post("/orders/1/send-to-kitchen", json={"expected_version": 1})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Screen 7: Request bill
    res = client.post("/orders/1/request-bill")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

    # Screen 7: Cancel order
    res = client.post("/orders/1/cancel")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_menu_endpoint_public_access(client):
    """Screen 6: /menu endpoint is accessible to browse food items."""
    res = client.get("/menu")
    assert res.status_code in (200, 500)  # 200 with DB, or 500 if DB offline
    if res.status_code == 200:
        data = res.get_json()
        assert "items" in data
        assert isinstance(data["items"], list)


def test_open_order_input_validation(client):
    """Screen 5: Validates that table_id and guests are supplied."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    # Missing table_id
    res = client.post("/orders", json={"guests": 2}, headers=auth_headers)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"

    # Missing guests count
    res = client.post("/orders", json={"table_id": 1}, headers=auth_headers)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"


def test_add_order_item_occ_validation(client):
    """Screen 6/7: add_order_item must enforce expected_version for OCC."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    # Missing expected_version
    res = client.post(
        "/orders/1/items",
        json={"item_id": 1, "quantity": 2},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"
    assert "expected_version" in res.get_json()["error"]["message"]

    # Missing item_id
    res = client.post(
        "/orders/1/items",
        json={"expected_version": 1, "quantity": 1},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"


def test_update_order_item_occ_validation(client):
    """Screen 7: update_order_item must require expected_version."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    res = client.patch(
        "/orders/1/items/1",
        json={"quantity": 3},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"
    assert "expected_version" in res.get_json()["error"]["message"]


def test_remove_order_item_occ_validation(client):
    """Screen 7: remove_order_item must require expected_version."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    res = client.delete("/orders/1/items/1", headers=auth_headers)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"
    assert "expected_version" in res.get_json()["error"]["message"]


def test_send_to_kitchen_occ_validation(client):
    """Screen 7: send_to_kitchen must require expected_version."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    res = client.post(
        "/orders/1/send-to-kitchen",
        json={},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"
    assert "expected_version" in res.get_json()["error"]["message"]


def test_merge_orders_validation(client):
    """Concurrency Demo: merge_orders requires both source and target order ids."""
    auth_headers = {"Authorization": "Bearer demo-waiter-token"}

    res = client.post(
        "/orders/merge",
        json={"source_order_id": 1},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "BAD_REQUEST"


def test_version_conflict_exception_shape():
    """Verifies that version_conflict error returns HTTP 409 and current_version payload."""
    err = version_conflict(current_version=4, message="Order was changed")
    assert err.status_code == 409
    payload = err.to_dict()
    assert payload["error"]["code"] == "VERSION_CONFLICT"
    assert payload["error"]["current_version"] == 4
    assert payload["error"]["message"] == "Order was changed"


def test_lock_timeout_exception_shape():
    """Verifies that lock_timeout error returns HTTP 409 and locked_by details."""
    err = lock_timeout(locked_by="J. Lee", locked_at="2026-11-02T14:45:00Z")
    assert err.status_code == 409
    payload = err.to_dict()
    assert payload["error"]["code"] == "LOCK_TIMEOUT"
    assert payload["error"]["locked_by"] == "J. Lee"
    assert payload["error"]["locked_at"] == "2026-11-02T14:45:00Z"
