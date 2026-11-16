"""
app/routes/kitchen.py
Owner: Diya (Module 3 - Kitchen)

REST API endpoints for:
- GET /stations: list all kitchen stations (used by Kitchen, Waiter, Screen 17 Menu Admin)
- POST /stations: create a station (Admin/Chef)
- PATCH /stations/<id>: update station details, display order, target prep time, active flag
- GET /kitchen/board: live kitchen display cards grouped by order, with filters and metrics
- GET /kitchen/orders/<order_id>/ticket: ticket details with checklist, notes, history timeline
- POST /kitchen/orders/<order_id>/advance: card-level status advance (New -> Preparing -> Ready -> Served)
- PATCH /kitchen/tickets/<id>/status: single-item status step
- POST /kitchen/tickets/<id>/issue: report issue on ticket
- GET /kitchen/stats: station load and prep time analytics
"""

from flask import Blueprint, request, jsonify, g
from app.auth import get_current_user, require_role
from app.errors import bad_request
from app.services import kitchen_service

kitchen_bp = Blueprint("kitchen", __name__)


def _get_actor_id():
    """Extract authenticated staff_id or fallback for tests/local simulation."""
    if hasattr(g, "user") and g.user and "staff_id" in g.user:
        return g.user["staff_id"]
    try:
        user = get_current_user()
        return user.get("staff_id")
    except Exception:
        # Fallback UUID for testing/development if no auth header
        return "00000000-0000-0000-0000-000000000003"


# =====================================================================
# Stations Endpoints (Diya owns station table & endpoints)
# =====================================================================

@kitchen_bp.route("/stations", methods=["GET"])
def get_stations():
    """
    Returns list of kitchen stations for kitchen display, station selector,
    and admin menu management.
    """
    active_only = request.args.get("active_only", "false").lower() == "true"
    stations = kitchen_service.get_stations(active_only=active_only)
    return jsonify({"stations": stations}), 200


@kitchen_bp.route("/stations", methods=["POST"])
@require_role("chef", "admin")
def create_station():
    """
    Creates a new kitchen station.
    """
    data = request.get_json(silent=True) or {}
    staff_id = _get_actor_id()
    station = kitchen_service.create_station(data, staff_id=staff_id)
    return jsonify({"station": station}), 201


@kitchen_bp.route("/stations/<int:station_id>", methods=["PATCH"])
@require_role("chef", "admin")
def update_station(station_id):
    """
    Updates an existing kitchen station.
    """
    data = request.get_json(silent=True) or {}
    staff_id = _get_actor_id()
    station = kitchen_service.update_station(station_id, data, staff_id=staff_id)
    return jsonify({"station": station}), 200


# =====================================================================
# Kitchen Display & Ticket Endpoints (Screens 11 & 12)
# =====================================================================

@kitchen_bp.route("/kitchen/board", methods=["GET"])
def get_kitchen_board():
    """
    Returns grouped kitchen cards from v_kitchen_board with status counts
    and average prep time.
    Query parameters:
    - station: optional station_id filter
    - sort: 'oldest_first' (default), 'newest_first', 'table'
    """
    station_id = request.args.get("station")
    sort = request.args.get("sort", "oldest_first")
    board = kitchen_service.get_kitchen_board(station_id=station_id, sort=sort)
    return jsonify(board), 200


@kitchen_bp.route("/kitchen/orders/<int:order_id>/ticket", methods=["GET"])
def get_order_ticket(order_id):
    """
    Ticket detail view (Screen 12):
    Order header, allergy/special notes, individual items with statuses and stations,
    and stage history timeline.
    """
    detail = kitchen_service.get_order_ticket(order_id)
    return jsonify(detail), 200


@kitchen_bp.route("/kitchen/orders/<int:order_id>/advance", methods=["POST"])
def advance_order_tickets(order_id):
    """
    Advances all tickets of an order together to new_status
    ('cooking', 'ready', 'served') using advance_order_tickets().
    """
    data = request.get_json(silent=True) or {}
    new_status = data.get("new_status")
    if not new_status:
        raise bad_request("Missing 'new_status' ('cooking', 'ready', 'served').")

    staff_id = _get_actor_id()
    result = kitchen_service.advance_order(order_id, new_status, staff_id)
    return jsonify(result), 200


@kitchen_bp.route("/kitchen/tickets/<int:ticket_id>/status", methods=["PATCH"])
def update_ticket_status(ticket_id):
    """
    Advances a single kitchen ticket one step using update_ticket_status().
    """
    data = request.get_json(silent=True) or {}
    new_status = data.get("status") or data.get("new_status")
    if not new_status:
        raise bad_request("Missing 'status' in body.")

    staff_id = _get_actor_id()
    updated = kitchen_service.update_ticket(ticket_id, new_status, staff_id)
    return jsonify({"ticket": updated}), 200


@kitchen_bp.route("/kitchen/tickets/<int:ticket_id>/issue", methods=["POST"])
def report_ticket_issue(ticket_id):
    """
    Records an issue note on a ticket (Report Issue dialog on Screen 12).
    """
    data = request.get_json(silent=True) or {}
    note = data.get("note", "").strip()
    if not note:
        raise bad_request("Issue description 'note' cannot be empty.")

    staff_id = _get_actor_id()
    result = kitchen_service.report_issue(ticket_id, note, staff_id)
    return jsonify(result), 200


@kitchen_bp.route("/kitchen/stats", methods=["GET"])
def get_kitchen_stats():
    """
    Returns live kitchen load, capacity %, and prep time statistics per station.
    """
    stats = kitchen_service.get_kitchen_stats()
    return jsonify(stats), 200
