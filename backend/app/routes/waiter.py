"""
app/routes/waiter.py
Owner: Ayush (Module 2 - Waiter and Orders)

REST API Endpoints for Waiter Module (Screens 4 to 10):
- Table Map & Cleaning:
    * GET  /tables                     (Screen 4: Table Map)
    * POST /tables/<id>/mark-clean     (Screen 4: Mark Needs Cleaning -> Free)
- Menu Search:
    * GET  /menu                       (Screen 6: Menu Browser)
- Order Lifecycle:
    * POST   /orders                   (Screen 5: Open New Order)
    * GET    /orders                   (Screen 10: My Orders)
    * GET    /orders/<id>              (Screen 7: Order Panel)
    * POST   /orders/<id>/items        (Screen 6/7: Add Draft Item with OCC check)
    * PATCH  /orders/<id>/items/<item_id> (Screen 7: Edit Quantity / Notes)
    * DELETE /orders/<id>/items/<item_id> (Screen 7: Cancel / Delete Item)
    * POST   /orders/<id>/send-to-kitchen (Screen 7: Send Draft Items to Kitchen)
    * POST   /orders/<id>/lock         (Screen 8B: Lock Acquisition Demo)
    * POST   /orders/<id>/request-bill (Screen 7: Request Bill from Cashier)
    * POST   /orders/<id>/cancel       (Screen 7/4: Cancel Active Order)
    * POST   /orders/merge             (Deadlock-Free Order Merge Demo)
"""

from flask import Blueprint, request, jsonify, g
from app.auth import require_role, get_current_user
from app.errors import bad_request, not_found
from app.services import waiter_service

waiter_bp = Blueprint("waiter", __name__)


def _parse_order_id(raw_id):
    """
    Parses flexible order identifiers (integers, 'ORD-101', 'ORD-2', or 'current').
    """
    s = str(raw_id).strip()
    if s.lower() in ("current", "latest"):
        active = waiter_service.get_orders(status="open")
        orders = active.get("orders", [])
        if orders:
            return orders[0]["order_id"]
        all_orders = waiter_service.get_orders().get("orders", [])
        if all_orders:
            return all_orders[0]["order_id"]
        raise not_found("No orders found in database")

    clean = s.replace("ORD-", "").strip()
    try:
        return int(clean)
    except ValueError:
        raise bad_request(f"Invalid order id: {raw_id}")


# =====================================================================
# Table Management Routes (Screen 4)
# =====================================================================

@waiter_bp.route("/tables", methods=["GET"])
@require_role("waiter", "admin", "cashier", "chef")
def get_tables():
    """
    Screen 4: Table Map Overview.
    Returns table status cards and aggregate count metrics.
    Query params: section, waiter_id
    """
    section = request.args.get("section")
    waiter_id = request.args.get("waiter_id")
    data = waiter_service.get_tables(section=section, waiter_id=waiter_id)
    return jsonify(data), 200


@waiter_bp.route("/tables/<int:table_id>/mark-clean", methods=["POST"])
@require_role("waiter", "admin")
def mark_table_clean(table_id):
    """
    Screen 4: Marks a 'needs_cleaning' table as 'free'.
    """
    result = waiter_service.mark_table_clean(table_id)
    return jsonify(result), 200


# =====================================================================
# Menu Query Routes (Screen 6)
# =====================================================================

@waiter_bp.route("/menu", methods=["GET"])
def get_menu():
    """
    Screen 6: Menu Browser.
    Query params:
      - category: filter by food category (Starters, Mains, Desserts, etc.)
      - search: search keyword matching item name or category
    """
    category = request.args.get("category")
    search = request.args.get("search")
    items = waiter_service.get_menu(category=category, search=search)
    return jsonify({"items": items}), 200


# =====================================================================
# Order Lifecycle Routes (Screens 5, 7, 10)
# =====================================================================

@waiter_bp.route("/orders", methods=["POST"])
@require_role("waiter", "admin")
def open_order():
    """
    Screen 5: Open New Order.
    Body JSON:
      - table_id: int (required)
      - guests: int (required, 1 <= guests <= capacity)
      - notes: string (optional)
    """
    data = request.get_json(silent=True) or {}
    table_id = data.get("table_id")
    guests = data.get("guests")
    notes = data.get("notes")

    if not table_id:
        raise bad_request("table_id is required to open an order")
    if guests is None:
        raise bad_request("guests count is required")

    waiter = get_current_user()
    waiter_id = waiter.get("staff_id")

    order = waiter_service.open_order(
        table_id=table_id,
        guests=guests,
        notes=notes,
        waiter_id=waiter_id,
    )
    return jsonify(order), 201


@waiter_bp.route("/orders", methods=["GET"])
@require_role("waiter", "admin", "cashier", "chef")
def list_orders():
    """
    Screen 10: My Orders list.
    Query params:
      - waiter_id: UUID string
      - status: 'open', 'in_kitchen', 'served', 'bill_requested', 'closed', 'cancelled'
      - search: keyword search
      - date: YYYY-MM-DD
    """
    waiter_id = request.args.get("waiter_id")
    status = request.args.get("status")
    search = request.args.get("search")
    date = request.args.get("date")

    data = waiter_service.get_orders(
        waiter_id=waiter_id,
        status=status,
        search=search,
        date=date,
    )
    return jsonify(data), 200


@waiter_bp.route("/orders/<order_id>", methods=["GET"])
@require_role("waiter", "admin", "cashier", "chef")
def get_order(order_id):
    """
    Screen 7: Order details, items breakdown, totals, and current optimistic version.
    """
    oid = _parse_order_id(order_id)
    order = waiter_service.get_order_by_id(oid)
    return jsonify(order), 200


# =====================================================================
# Order Item Mutation Routes (OCC Protected)
# =====================================================================

@waiter_bp.route("/orders/<order_id>/items", methods=["POST"])
@require_role("waiter", "admin")
def add_order_item(order_id):
    """
    Screen 6/7: Add draft item to order.
    Body JSON:
      - item_id: int (required)
      - quantity: int (default 1)
      - notes: string (optional)
      - expected_version: int (required)
    """
    oid = _parse_order_id(order_id)
    data = request.get_json(silent=True) or {}
    item_id = data.get("item_id")
    quantity = data.get("quantity", 1)
    notes = data.get("notes")
    expected_version = data.get("expected_version")

    if not item_id:
        raise bad_request("item_id is required")
    if expected_version is None:
        raise bad_request("expected_version is required for optimistic concurrency checking")

    waiter = get_current_user()
    waiter_id = waiter.get("staff_id")

    result = waiter_service.add_order_item(
        order_id=oid,
        item_id=item_id,
        quantity=quantity,
        notes=notes,
        expected_version=expected_version,
        waiter_id=waiter_id,
    )
    return jsonify(result), 200


@waiter_bp.route("/orders/<order_id>/items/<int:item_id>", methods=["PATCH"])
@require_role("waiter", "admin")
def update_order_item(order_id, item_id):
    """
    Screen 7: Update draft item quantity or notes.
    Body JSON:
      - quantity: int (optional)
      - notes: string (optional)
      - expected_version: int (required)
    """
    oid = _parse_order_id(order_id)
    data = request.get_json(silent=True) or {}
    quantity = data.get("quantity")
    notes = data.get("notes")
    expected_version = data.get("expected_version")

    if expected_version is None:
        raise bad_request("expected_version is required")

    result = waiter_service.update_order_item(
        order_id=oid,
        item_id=item_id,
        quantity=quantity,
        notes=notes,
        expected_version=expected_version,
    )
    return jsonify(result), 200


@waiter_bp.route("/orders/<order_id>/items/<int:item_id>", methods=["DELETE"])
@require_role("waiter", "admin")
def remove_order_item(order_id, item_id):
    """
    Screen 7: Remove or cancel an item from order.
    Query or Body JSON:
      - expected_version: int (required)
    """
    oid = _parse_order_id(order_id)
    data = request.get_json(silent=True) or {}
    expected_version = data.get("expected_version") or request.args.get("expected_version")

    if expected_version is None:
        raise bad_request("expected_version is required")

    result = waiter_service.remove_order_item(
        order_id=oid,
        item_id=item_id,
        expected_version=int(expected_version),
    )
    return jsonify(result), 200


# =====================================================================
# Workflow State Transition Routes
# =====================================================================

@waiter_bp.route("/orders/<order_id>/send-to-kitchen", methods=["POST"])
@require_role("waiter", "admin")
def send_to_kitchen(order_id):
    """
    Screen 7: Send draft items to kitchen.
    Body JSON:
      - expected_version: int (required)
    """
    oid = _parse_order_id(order_id)
    data = request.get_json(silent=True) or {}
    expected_version = data.get("expected_version")

    if expected_version is None:
        raise bad_request("expected_version is required")

    result = waiter_service.send_to_kitchen(order_id=oid, expected_version=expected_version)
    return jsonify(result), 200


@waiter_bp.route("/orders/<order_id>/lock", methods=["POST"])
@require_role("waiter", "admin")
def lock_order(order_id):
    """
    Screen 8B: Lock Acquisition Demo.
    Demonstrates pessimistic row-locking on the order with a 30s timeout.
    """
    oid = _parse_order_id(order_id)
    data = request.get_json(silent=True) or {}
    wait_seconds = data.get("wait_seconds", 30)

    waiter = get_current_user()
    waiter_id = waiter.get("staff_id")

    result = waiter_service.acquire_order_lock(
        order_id=oid,
        waiter_id=waiter_id,
        wait_seconds=wait_seconds,
    )
    return jsonify(result), 200


@waiter_bp.route("/orders/<order_id>/request-bill", methods=["POST"])
@require_role("waiter", "admin")
def request_bill(order_id):
    """
    Screen 7: Move order status to 'bill_requested'.
    Enabled once all kitchen items are served.
    """
    oid = _parse_order_id(order_id)
    result = waiter_service.request_bill(oid)
    return jsonify(result), 200


@waiter_bp.route("/orders/<order_id>/cancel", methods=["POST"])
@require_role("waiter", "admin")
def cancel_order(order_id):
    """
    Screen 7 / Screen 4: Cancels active order and frees table.
    """
    oid = _parse_order_id(order_id)
    result = waiter_service.cancel_order(oid)
    return jsonify(result), 200


@waiter_bp.route("/orders/merge", methods=["POST"])
@require_role("waiter", "admin")
def merge_orders():
    """
    Concurrency Demo: Merge two orders without deadlock using lock-ordering.
    Body JSON:
      - source_order_id: int
      - target_order_id: int
    """
    data = request.get_json(silent=True) or {}
    source_order_id = data.get("source_order_id")
    target_order_id = data.get("target_order_id")

    if not source_order_id or not target_order_id:
        raise bad_request("source_order_id and target_order_id are required")

    waiter = get_current_user()
    waiter_id = waiter.get("staff_id")

    result = waiter_service.merge_orders(
        source_order_id=source_order_id,
        target_order_id=target_order_id,
        waiter_id=waiter_id,
    )
    return jsonify(result), 200
