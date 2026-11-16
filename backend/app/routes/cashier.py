"""
app/routes/cashier.py
Owner: Sakshi (Module 4 - Cashier and Billing)

REST API Endpoints for Cashier Module (Screens 13 to 15.1):
- Bills & Lifecycle:
    * GET    /bills/open               (Screen: Open Bills List)
    * GET    /bills/<bill_or_order_id> (Screen 13: Bill & Payment Details)
    * GET    /bills/<bill_id>/receipt  (Screen 15: Receipt Data)
- Promotions:
    * POST   /bills/<bill_id>/promotion (Screen 9/13: Apply Promo Code)
    * DELETE /bills/<bill_id>/promotion (Screen 13: Remove Promo Code)
    * GET    /promotions/<code>/check   (Promo code validation)
- Payments:
    * POST   /bills/<bill_id>/payments       (Screen 13->15: Single Payer Payment)
    * POST   /bills/<bill_id>/split-payments (Screen 14->15: Multi-Payer Split Payment)
- Reports:
    * GET    /cashier/summary                (Daily Cash Summary)
"""

from flask import Blueprint, request, jsonify, g
from app.auth import require_role, get_current_user
from app.errors import bad_request
from app.services import cashier_service

cashier_bp = Blueprint("cashier", __name__)


# =====================================================================
# Bills Endpoints
# =====================================================================

@cashier_bp.route("/bills/open", methods=["GET"])
@require_role("cashier", "admin")
def list_open_bills():
    """
    Returns list of open bills awaiting payment.
    """
    bills = cashier_service.get_open_bills()
    return jsonify(bills), 200


@cashier_bp.route("/bills/<path:bill_or_order_id>", methods=["GET"])
@require_role("cashier", "admin", "waiter")
def get_bill(bill_or_order_id):
    """
    Screen 13: Fetches detailed bill by order ID, bill ID, or receipt number.
    Handles 'receipt' subpath fallback if routed here.
    """
    s = str(bill_or_order_id).strip()
    if s.endswith("/receipt"):
        real_id = s.replace("/receipt", "").strip()
        receipt = cashier_service.get_receipt(real_id)
        return jsonify(receipt), 200

    bill = cashier_service.get_bill_by_id(s)
    return jsonify(bill), 200


@cashier_bp.route("/bills/<path:bill_id>/receipt", methods=["GET"])
@require_role("cashier", "admin", "waiter")
def get_bill_receipt(bill_id):
    """
    Screen 15: Returns receipt data for printing or customer copy.
    """
    receipt = cashier_service.get_receipt(bill_id)
    return jsonify(receipt), 200


# =====================================================================
# Promotions Endpoints
# =====================================================================

@cashier_bp.route("/promotions/<string:code>/check", methods=["GET"])
def check_promotion(code):
    """
    Validates a promotion code against the database.
    """
    promo = cashier_service.check_promo(code)
    return jsonify(promo), 200


@cashier_bp.route("/bills/<path:bill_id>/promotion", methods=["POST"])
@require_role("cashier", "admin")
def apply_promotion(bill_id):
    """
    Screen 9 / Screen 13: Applies a promotion code to an open bill.
    """
    data = request.get_json(silent=True) or {}
    promo_code = data.get("promo_code") or data.get("code")
    if not promo_code:
        raise bad_request("Missing 'promo_code' in request body")

    real_bill_id = cashier_service.parse_bill_id(bill_id)
    cashier_id = g.user["staff_id"]

    updated = cashier_service.apply_promo(real_bill_id, promo_code, cashier_id)
    return jsonify(updated), 200


@cashier_bp.route("/bills/<path:bill_id>/promotion", methods=["DELETE"])
@require_role("cashier", "admin")
def remove_promotion(bill_id):
    """
    Screen 13: Removes applied promotion from an open bill.
    """
    real_bill_id = cashier_service.parse_bill_id(bill_id)
    cashier_id = g.user["staff_id"]

    updated = cashier_service.remove_promo(real_bill_id, cashier_id)
    return jsonify(updated), 200


# =====================================================================
# Payment & Settlement Endpoints
# =====================================================================

@cashier_bp.route("/bills/<path:bill_id>/payments", methods=["POST"])
@require_role("cashier", "admin")
def record_payment(bill_id):
    """
    Screen 13 -> Screen 15: Settle bill with single payment (cash, card, upi).
    Enforces double-close concurrency check (Screen 15.1 -> HTTP 409 ALREADY_PAID).
    """
    data = request.get_json(silent=True) or {}
    real_bill_id = cashier_service.parse_bill_id(bill_id)
    cashier_id = g.user["staff_id"]

    result = cashier_service.record_single_payment(real_bill_id, data, cashier_id)
    return jsonify(result), 200


@cashier_bp.route("/bills/<path:bill_id>/split-payments", methods=["POST"])
@require_role("cashier", "admin")
def record_split_payments(bill_id):
    """
    Screen 14 -> Screen 15: Settle bill with multiple payers in a single atomic transaction.
    """
    data = request.get_json(silent=True) or {}
    payers = data.get("payers")
    real_bill_id = cashier_service.parse_bill_id(bill_id)
    cashier_id = g.user["staff_id"]

    result = cashier_service.record_split_payments(real_bill_id, payers, cashier_id)
    return jsonify(result), 200


# =====================================================================
# Cashier Summary Report
# =====================================================================

@cashier_bp.route("/cashier/summary", methods=["GET"])
@require_role("cashier", "admin")
def get_daily_summary():
    """
    Screen: Daily Cash Summary Report.
    """
    summary = cashier_service.get_daily_cash_summary()
    return jsonify(summary), 200
