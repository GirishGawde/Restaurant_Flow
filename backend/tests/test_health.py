"""
tests/test_health.py
Basic health check and initialization test for Flask backend.
"""

from app import create_app


def test_health_endpoint():
    app = create_app()
    client = app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_error_handler_404():
    app = create_app()
    client = app.test_client()
    response = client.get("/non-existent-route")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert "code" in data["error"]
