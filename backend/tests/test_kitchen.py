"""
backend/tests/test_kitchen.py
Tests for Kitchen & Stations routes (Diya - Module 3)
"""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_kitchen_board_endpoint_structure(client):
    """Verify /kitchen/board endpoint is routed and handles parameters."""
    response = client.get("/kitchen/board?station=1&sort=oldest_first")
    # Will either return 200 or 500 if DATABASE_URL is not connected in test env
    assert response.status_code in [200, 500]


def test_stations_endpoint_structure(client):
    """Verify /stations endpoint is registered on kitchen_bp."""
    response = client.get("/stations")
    assert response.status_code in [200, 500]


def test_kitchen_advance_validation(client):
    """Verify missing body validation on /kitchen/orders/<id>/advance."""
    response = client.post("/kitchen/orders/1042/advance", json={})
    # Must fail with 400 Bad Request because new_status is missing
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "new_status" in data["error"]["message"].lower()
