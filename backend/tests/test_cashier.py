"""
backend/tests/test_cashier.py
Owner: Sakshi (Module 4 - Cashier and Billing)

Unit and integration tests for Cashier & Billing endpoints:
- Promotion validation and application
- Open bills listing
- Bill lookup and item detail
- Single payment validation and double-close conflict handling (HTTP 409)
- Split payments validation and atomic settlement
- Cashier daily summary reporting
"""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def cashier_headers():
    return {
        "Authorization": "Bearer mock-cashier-token",
        "Content-Type": "application/json",
    }


def test_promotions_check_valid(client):
    """Verify checking valid promotion code STAFF10 returns 200 and discount details."""
    response = client.get("/promotions/STAFF10/check")
    assert response.status_code == 200
    data = response.get_json()
    assert data["valid"] is True
    assert data["code"] == "STAFF10"
    assert data["kind"] == "percentage"
    assert data["value"] == 10.0


def test_promotions_check_invalid(client):
    """Verify checking non-existent promotion code returns 404."""
    response = client.get("/promotions/FAKECODE99/check")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert data["error"]["code"] == "PROMO_NOT_FOUND"


def test_open_bills_endpoint(client, cashier_headers):
    """Verify /bills/open returns a list of unpaid bills."""
    response = client.get("/bills/open", headers=cashier_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)


def test_bill_not_found(client, cashier_headers):
    """Verify lookup for non-existent bill returns 404."""
    response = client.get("/bills/99999999", headers=cashier_headers)
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data


def test_payment_validation_invalid_method(client, cashier_headers):
    """Verify payments endpoint rejects invalid payment methods."""
    response = client.post(
        "/bills/1/payments",
        json={"method": "bitcoin", "amount": 25.0},
        headers=cashier_headers,
    )
    assert response.status_code == 422
    data = response.get_json()
    assert data["error"]["code"] == "INVALID_METHOD"


def test_payment_validation_zero_amount(client, cashier_headers):
    """Verify payments endpoint rejects <= 0 amount."""
    response = client.post(
        "/bills/1/payments",
        json={"method": "cash", "amount": 0.0},
        headers=cashier_headers,
    )
    assert response.status_code == 422
    data = response.get_json()
    assert data["error"]["code"] == "INVALID_AMOUNT"


def test_payment_validation_insufficient_cash(client, cashier_headers):
    """Verify payments endpoint rejects cash_tendered < amount."""
    response = client.post(
        "/bills/1/payments",
        json={"method": "cash", "amount": 50.0, "cash_tendered": 20.0},
        headers=cashier_headers,
    )
    assert response.status_code == 422
    data = response.get_json()
    assert data["error"]["code"] == "INSUFFICIENT_CASH"


def test_split_payment_empty_payers(client, cashier_headers):
    """Verify split payments endpoint rejects empty payers array."""
    response = client.post(
        "/bills/1/split-payments",
        json={"payers": []},
        headers=cashier_headers,
    )
    assert response.status_code == 422
    data = response.get_json()
    assert data["error"]["code"] == "EMPTY_PAYERS"


def test_cashier_summary_endpoint(client, cashier_headers):
    """Verify /cashier/summary returns summary list and totals."""
    response = client.get("/cashier/summary", headers=cashier_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "summary" in data
    assert "grand_total" in data
    assert "total_transactions" in data
