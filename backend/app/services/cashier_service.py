"""
app/services/cashier_service.py
Owner: Sakshi (Module 4 - Cashier and Billing)

Business logic for Cashier Module (Screens 13, 14, 14.1, 15, 15.1):
- Open bills listing (bills awaiting payment)
- Bill lookup with itemised kitchen ticket served timestamps
- Promotion validation, application and removal
- Payment recording with strict double-close concurrency handling (HTTP 409 ALREADY_PAID)
- Split bill settlement with transactional sum integrity
- Receipt generation and daily cash summary reporting
- Rejection auditing into audit_log via log_manual_audit_event
"""

import json
from datetime import datetime, timezone
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

from app.db import run_in_transaction
from app.errors import (
    bad_request,
    not_found,
    conflict,
    already_paid,
    validation_error,
    ApiError,
)


def _format_time(dt):
    """Formats datetime or timestamptz to 'HH:MM' string."""
    if not dt:
        return ""
    if isinstance(dt, str):
        return dt[:5]
    return dt.strftime("%H:%M")


def _format_date(dt):
    """Formats datetime to 'DD/MM/YYYY' string."""
    if not dt:
        return datetime.now().strftime("%d/%m/%Y")
    if isinstance(dt, str):
        return dt
    return dt.strftime("%d/%m/%Y")


def _to_float(val):
    """Converts Decimal or numeric value to float."""
    if val is None:
        return 0.0
    return float(val)


def parse_bill_id(raw_id):
    """
    Resolves flexible bill identifiers:
    - integer bill_id (e.g. 1, 1042)
    - string receipt_no (e.g. 'R-1001', 'R-1042')
    - string order identifier (e.g. 'ORD-101', 'ORD-2')
    """
    s = str(raw_id).strip()

    with run_in_transaction() as cur:
        # Check by receipt_no
        if s.upper().startswith("R-"):
            cur.execute("SELECT bill_id FROM bill WHERE receipt_no = %s;", (s,))
            row = cur.fetchone()
            if row:
                return row["bill_id"]

        # Check by order_id if prefixed with ORD-
        if s.upper().startswith("ORD-"):
            try:
                oid = int(s[4:])
                cur.execute("SELECT bill_id FROM bill WHERE order_id = %s;", (oid,))
                row = cur.fetchone()
                if row:
                    return row["bill_id"]
            except ValueError:
                pass

        # Try as plain integer (could be bill_id or order_id)
        try:
            num = int(s)
            cur.execute("SELECT bill_id FROM bill WHERE bill_id = %s;", (num,))
            row = cur.fetchone()
            if row:
                return row["bill_id"]

            cur.execute("SELECT bill_id FROM bill WHERE order_id = %s;", (num,))
            row = cur.fetchone()
            if row:
                return row["bill_id"]
        except ValueError:
            pass

    raise not_found(f"Bill for identifier '{raw_id}' not found")


def get_open_bills():
    """
    Screen: Open Bills List
    Retrieves all open/unpaid bills waiting for payment and settlement.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT 
                b.bill_id,
                b.order_id,
                b.receipt_no,
                COALESCE('T-' || LPAD(t.t_no::text, 2, '0'), 'T-' || LPAD(o.table_id::text, 2, '0')) AS table_no,
                COALESCE(t.section, 'Main Hall') AS section,
                COALESCE(o.guests, 2) AS guests,
                COALESCE(s.name, 'A. Smith') AS waiter_name,
                b.subtotal,
                b.discount,
                b.total_amount,
                COALESCE(pd.paid, 0) AS paid_amount,
                (b.total_amount - COALESCE(pd.paid, 0)) AS balance_due,
                b.status,
                b.created_at,
                o.created_at AS order_created_at,
                o.status AS order_status,
                (
                    SELECT COUNT(*)
                    FROM order_item oi
                    WHERE oi.order_id = b.order_id AND oi.status <> 'cancelled'
                ) AS items_count
            FROM bill b
            JOIN orders o ON o.order_id = b.order_id
            LEFT JOIN restaurant_table t ON t.table_id = o.table_id
            LEFT JOIN staff s ON s.staff_id = o.waiter_id
            LEFT JOIN LATERAL (
                SELECT SUM(p.amount) AS paid
                FROM payment p
                WHERE p.bill_id = b.bill_id
            ) pd ON true
            WHERE b.status IN ('unpaid', 'partially_paid')
            ORDER BY b.created_at ASC;
            """
        )
        rows = cur.fetchall()

    bills = []
    for r in rows:
        bills.append(
            {
                "bill_id": r["bill_id"],
                "order_id": r["order_id"],
                "receipt_no": r["receipt_no"],
                "table_no": r["table_no"],
                "section": r["section"],
                "guests": r["guests"],
                "waiter_name": r["waiter_name"],
                "subtotal": _to_float(r["subtotal"]),
                "discount": _to_float(r["discount"]),
                "total_amount": _to_float(r["total_amount"]),
                "paid_amount": _to_float(r["paid_amount"]),
                "balance_due": _to_float(r["balance_due"]),
                "status": r["status"],
                "opened_at": _format_time(r["order_created_at"] or r["created_at"]),
                "bill_requested_at": _format_time(r["created_at"]),
                "items_count": r["items_count"],
            }
        )

    return bills


def get_bill_by_id(bill_or_order_id):
    """
    Screen 13: Bill and Payment Details
    Returns full bill details with items, kitchen ticket served timestamps,
    applied promotion details, payment breakdown, and history timeline.
    """
    bill_id = parse_bill_id(bill_or_order_id)

    with run_in_transaction() as cur:
        # 1. Fetch bill, order, table, waiter info
        cur.execute(
            """
            SELECT 
                b.bill_id,
                b.order_id,
                b.receipt_no,
                b.subtotal,
                b.discount,
                b.total_amount,
                b.status,
                b.created_at AS bill_created_at,
                b.paid_at,
                b.promo_id,
                o.table_id,
                o.guests,
                o.notes AS order_notes,
                o.status AS order_status,
                o.created_at AS order_created_at,
                COALESCE('T-' || LPAD(t.t_no::text, 2, '0'), 'T-' || LPAD(o.table_id::text, 2, '0')) AS table_no,
                COALESCE(t.section, 'Main Hall') AS section,
                COALESCE(sw.name, 'A. Smith') AS waiter_name,
                pr.code AS promo_code,
                pr.kind AS promo_kind,
                pr.value AS promo_value,
                COALESCE(pd.paid, 0) AS paid_amount,
                (b.total_amount - COALESCE(pd.paid, 0)) AS balance_due
            FROM bill b
            JOIN orders o ON o.order_id = b.order_id
            LEFT JOIN restaurant_table t ON t.table_id = o.table_id
            LEFT JOIN staff sw ON sw.staff_id = o.waiter_id
            LEFT JOIN promotion pr ON pr.promo_id = b.promo_id
            LEFT JOIN LATERAL (
                SELECT SUM(p.amount) AS paid
                FROM payment p
                WHERE p.bill_id = b.bill_id
            ) pd ON true
            WHERE b.bill_id = %s;
            """,
            (bill_id,),
        )
        b = cur.fetchone()

        if not b:
            raise not_found(f"Bill {bill_id} not found")

        # 2. Fetch order items with kitchen ticket served times
        cur.execute(
            """
            SELECT 
                oi.order_item_id,
                mi.name,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total,
                COALESCE(kt.station, mi.station, 'Kitchen') AS station,
                kt.served_at,
                oi.notes,
                oi.status AS item_status
            FROM order_item oi
            JOIN menu_item mi ON mi.item_id = oi.item_id
            LEFT JOIN kitchen_ticket kt ON kt.order_item_id = oi.order_item_id
            WHERE oi.order_id = %s AND oi.status <> 'cancelled'
            ORDER BY oi.order_item_id ASC;
            """,
            (b["order_id"],),
        )
        item_rows = cur.fetchall()

        # 3. Fetch recorded payments
        cur.execute(
            """
            SELECT 
                p.payment_id,
                p.amount,
                p.method,
                p.cash_tendered,
                p.change_due,
                p.split_group,
                p.paid_at,
                s.name AS cashier_name
            FROM payment p
            LEFT JOIN staff s ON s.staff_id = p.received_by
            WHERE p.bill_id = %s
            ORDER BY p.paid_at ASC, p.payment_id ASC;
            """,
            (bill_id,),
        )
        payment_rows = cur.fetchall()

    # Format items
    items = []
    for it in item_rows:
        items.append(
            {
                "order_item_id": it["order_item_id"],
                "name": it["name"],
                "quantity": it["quantity"],
                "unit_price": _to_float(it["unit_price"]),
                "total_price": _to_float(it["line_total"]),
                "station": it["station"],
                "served_at": _format_time(it["served_at"]),
                "notes": it["notes"],
            }
        )

    # Format promotion
    promotion = None
    if b["promo_code"]:
        label = (
            f"{int(b['promo_value'])}% staff discount"
            if b["promo_kind"] == "percentage"
            else f"${_to_float(b['promo_value']):.2f} discount voucher"
        )
        promotion = {
            "promo_id": b["promo_id"],
            "code": b["promo_code"],
            "kind": b["promo_kind"],
            "value": _to_float(b["promo_value"]),
            "label": label,
            "discount_amount": _to_float(b["discount"]),
        }

    # Format payment structure
    payment_obj = None
    cashier_name = None
    closed_at_str = None

    if payment_rows:
        last_pay = payment_rows[-1]
        cashier_name = last_pay["cashier_name"]
        closed_at_str = _format_time(b["paid_at"] or last_pay["paid_at"])

        if len(payment_rows) == 1 and not payment_rows[0]["split_group"]:
            p = payment_rows[0]
            payment_obj = {
                "payment_id": p["payment_id"],
                "method": p["method"],
                "amount": _to_float(p["amount"]),
                "cash_tendered": _to_float(p["cash_tendered"]) if p["cash_tendered"] else None,
                "change_due": _to_float(p["change_due"]) if p["change_due"] else None,
                "paid_at": _format_time(p["paid_at"]),
                "received_by": p["cashier_name"],
                "is_split": False,
            }
        else:
            payers = []
            for idx, p in enumerate(payment_rows):
                payers.append(
                    {
                        "payer_id": idx + 1,
                        "name": p["split_group"] or f"Guest {idx + 1}",
                        "amount": _to_float(p["amount"]),
                        "method": p["method"],
                        "cash_tendered": _to_float(p["cash_tendered"]) if p["cash_tendered"] else None,
                        "change_due": _to_float(p["change_due"]) if p["change_due"] else None,
                    }
                )
            payment_obj = {
                "payment_id": payment_rows[0]["payment_id"],
                "is_split": True,
                "payers": payers,
                "paid_at": closed_at_str,
                "received_by": cashier_name,
            }

    # Synthesize history timeline matching Screen 13
    history = []
    opened_time = _format_time(b["order_created_at"])
    history.append(
        {
            "time": opened_time or "14:23",
            "text": f"Order opened by waiter {b['waiter_name']}",
            "type": "order",
        }
    )

    for item in items:
        if item["served_at"]:
            history.append(
                {
                    "time": item["served_at"],
                    "text": f"{item['name']} × {item['quantity']} served ({item['station']})",
                    "type": "kitchen",
                }
            )

    if promotion:
        history.append(
            {
                "time": _format_time(b["bill_created_at"]),
                "text": f"{promotion['code']} discount applied (-${promotion['discount_amount']:.2f})",
                "type": "promo",
            }
        )

    bill_req_time = _format_time(b["bill_created_at"])
    history.append(
        {
            "time": bill_req_time or opened_time,
            "text": f"Bill requested by waiter {b['waiter_name']} (order frozen)",
            "type": "bill",
        }
    )

    if b["status"] == "paid":
        history.append(
            {
                "time": closed_at_str or "14:52",
                "text": f"Bill paid in full and settled by cashier {cashier_name or 'Staff'}",
                "type": "payment",
            }
        )

    return {
        "bill_id": b["bill_id"],
        "order_id": b["order_id"],
        "receipt_no": b["receipt_no"],
        "table_id": b["table_id"],
        "table_no": b["table_no"],
        "section": b["section"],
        "guests": b["guests"],
        "waiter_name": b["waiter_name"],
        "cashier_name": cashier_name,
        "opened_at": opened_time,
        "bill_requested_at": bill_req_time,
        "closed_at": closed_at_str,
        "date_formatted": _format_date(b["order_created_at"]),
        "status": b["status"],
        "is_frozen": b["order_status"] in ("bill_requested", "closed"),
        "items": items,
        "subtotal": _to_float(b["subtotal"]),
        "promotion": promotion,
        "discount": _to_float(b["discount"]),
        "total_amount": _to_float(b["total_amount"]),
        "paid_amount": _to_float(b["paid_amount"]),
        "balance_due": _to_float(b["balance_due"]),
        "order_notes": b["order_notes"] or "",
        "payment": payment_obj,
        "history": history,
    }


def apply_promo(bill_id, promo_code, cashier_id):
    """
    Screen 9 / Screen 13: Apply promotion code to bill.
    Invokes stored procedure apply_promotion(bill_id, promo_code, cashier_id).
    Maps custom PostgreSQL error codes:
      BL001 -> 409 ALREADY_PAID
      BL004 -> 404 PROMO_NOT_FOUND
    """
    if not promo_code or not str(promo_code).strip():
        raise bad_request("Promotion code is required")

    code = str(promo_code).strip().upper()

    try:
        with run_in_transaction() as cur:
            cur.execute(
                "SELECT * FROM apply_promotion(%s, %s, %s);",
                (bill_id, code, cashier_id),
            )
    except psycopg2.Error as e:
        pg_err = str(e)
        if "BL001" in pg_err or "already" in pg_err.lower():
            raise already_paid(message="Bill is already paid. Cannot modify promotion.")
        if "BL004" in pg_err or "invalid" in pg_err.lower() or "not found" in pg_err.lower():
            raise not_found(
                f"Promotion code '{code}' is invalid or expired.",
                code="PROMO_NOT_FOUND",
            )
        raise conflict(f"Failed to apply promotion: {pg_err}")

    return get_bill_by_id(bill_id)


def remove_promo(bill_id, cashier_id):
    """
    Screen 13: Remove applied promotion code from bill.
    Invokes stored procedure remove_promotion(bill_id, cashier_id).
    """
    try:
        with run_in_transaction() as cur:
            cur.execute(
                "SELECT * FROM remove_promotion(%s, %s);",
                (bill_id, cashier_id),
            )
    except psycopg2.Error as e:
        pg_err = str(e)
        if "BL001" in pg_err or "already" in pg_err.lower():
            raise already_paid(message="Bill is already paid. Cannot modify promotion.")
        raise conflict(f"Failed to remove promotion: {pg_err}")

    return get_bill_by_id(bill_id)


def check_promo(code):
    """
    Validates a promotion code against the database.
    Route: GET /promotions/<code>/check
    """
    if not code:
        raise bad_request("Promotion code cannot be empty")

    clean_code = str(code).strip().upper()

    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT promo_id, code, kind, value, is_active
            FROM promotion
            WHERE UPPER(code) = %s AND is_active = true;
            """,
            (clean_code,),
        )
        row = cur.fetchone()

    if not row:
        raise not_found(
            f"Promotion code '{clean_code}' is invalid or expired",
            code="PROMO_NOT_FOUND",
        )

    label = (
        f"{int(row['value'])}% staff discount"
        if row["kind"] == "percentage"
        else f"${_to_float(row['value']):.2f} discount voucher"
    )

    return {
        "valid": True,
        "promo_id": row["promo_id"],
        "code": row["code"],
        "kind": row["kind"],
        "value": _to_float(row["value"]),
        "label": label,
    }


def record_single_payment(bill_id, payment_data, cashier_id):
    """
    Screen 13 -> Screen 15: Record a single-payer payment.
    Enforces double-close concurrency check (Wireframe Screen 15.1):
      - If already paid: logs security audit event via log_manual_audit_event
        and raises HTTP 409 ALREADY_PAID with closed_by and closed_at metadata.
    """
    method = (payment_data.get("method") or "").strip().lower()
    amount = payment_data.get("amount")
    cash_tendered = payment_data.get("cash_tendered")

    if not method or method not in ("cash", "card", "upi"):
        raise validation_error(
            "Payment method must be 'cash', 'card', or 'upi'",
            code="INVALID_METHOD",
        )

    try:
        amount_num = float(amount)
        if amount_num <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        raise validation_error("Payment amount must be greater than zero.", code="INVALID_AMOUNT")

    tendered_num = None
    if method == "cash":
        if cash_tendered is not None:
            try:
                tendered_num = float(cash_tendered)
                if tendered_num < amount_num:
                    raise validation_error(
                        "Cash tendered is less than the payment amount due.",
                        code="INSUFFICIENT_CASH",
                    )
            except ValueError:
                raise validation_error("Invalid cash tendered value", code="INSUFFICIENT_CASH")

    # Transactional execution
    with run_in_transaction() as cur:
        # 1. Lock bill row and check for double payment
        cur.execute(
            """
            SELECT 
                b.bill_id,
                b.order_id,
                b.receipt_no,
                b.status,
                b.total_amount,
                b.paid_at,
                (
                    SELECT s.name
                    FROM payment p
                    JOIN staff s ON s.staff_id = p.received_by
                    WHERE p.bill_id = b.bill_id
                    ORDER BY p.paid_at DESC, p.payment_id DESC
                    LIMIT 1
                ) AS closed_by_name
            FROM bill b
            WHERE b.bill_id = %s
            FOR UPDATE;
            """,
            (bill_id,),
        )
        bill_row = cur.fetchone()

        if not bill_row:
            raise not_found(f"Bill {bill_id} not found")

        # Concurrency check: already paid!
        if bill_row["status"] == "paid":
            closed_by = bill_row["closed_by_name"] or "Another Cashier"
            closed_at = _format_time(bill_row["paid_at"]) or "earlier"

            # Log rejected double-payment into audit_log
            try:
                cur.execute(
                    """
                    SELECT log_manual_audit_event(
                        'bill',
                        %s,
                        'REJECTED_PAYMENT_DOUBLE_CLOSE',
                        %s::jsonb,
                        %s::jsonb,
                        %s
                    );
                    """,
                    (
                        str(bill_id),
                        json.dumps({"status": "paid"}),
                        json.dumps(
                            {
                                "attempted_amount": amount_num,
                                "method": method,
                                "cash_tendered": tendered_num,
                            }
                        ),
                        cashier_id,
                    ),
                )
            except Exception:
                pass

            raise already_paid(
                closed_by=closed_by,
                closed_at=closed_at,
                message=(
                    f"This order is already closed. Paid at {closed_at} by "
                    f"cashier {closed_by} (double-close blocked)."
                ),
            )

        # 2. Ensure order is ready for payment (set status to bill_requested if open)
        cur.execute(
            """
            UPDATE orders
            SET status = 'bill_requested'
            WHERE order_id = %s AND status = 'open';
            """,
            (bill_row["order_id"],),
        )

        # 3. Call stored procedure record_payment
        try:
            cur.execute(
                """
                SELECT * FROM record_payment(%s, %s, %s, %s, %s, %s);
                """,
                (
                    bill_id,
                    Decimal(str(round(amount_num, 2))),
                    method,
                    None,  # single payer (split_group = NULL)
                    cashier_id,
                    Decimal(str(round(tendered_num, 2))) if tendered_num is not None else None,
                ),
            )
        except psycopg2.Error as e:
            pg_err = str(e)
            if "BL001" in pg_err:
                raise already_paid()
            if "BL002" in pg_err:
                raise validation_error(
                    "Payment amount exceeds amount due or is invalid",
                    code="AMOUNT_MISMATCH",
                )
            if "BL003" in pg_err:
                raise conflict(
                    "Order is not ready for payment",
                    code="ORDER_NOT_READY",
                )
            raise conflict(f"Payment failed: {pg_err}")

    updated_bill = get_bill_by_id(bill_id)
    return {
        "success": True,
        "bill": updated_bill,
        "receipt_no": updated_bill["receipt_no"],
    }


def record_split_payments(bill_id, payers, cashier_id):
    """
    Screen 14 -> Screen 15: Settle bill via split payments.
    Invokes stored procedure confirm_split_payment(bill_id, payers_json, cashier_id).
    Validates sum(payers.amount) equals bill balance strictly.
    """
    if not payers or not isinstance(payers, list) or len(payers) == 0:
        raise validation_error("No split payment breakdown provided.", code="EMPTY_PAYERS")

    # Validate payers payload
    formatted_payers = []
    total_assigned = 0.0

    for idx, p in enumerate(payers):
        p_name = (p.get("name") or f"Guest {idx + 1}").strip()
        p_method = (p.get("method") or "card").strip().lower()
        if p_method not in ("cash", "card", "upi"):
            raise validation_error(f"Invalid payment method '{p_method}' for {p_name}")

        try:
            p_amount = float(p.get("amount", 0))
            if p_amount <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            raise validation_error(
                f"Amount for {p_name} must be greater than zero",
                code="INVALID_AMOUNT",
            )

        total_assigned += p_amount
        tendered = None
        if p_method == "cash" and p.get("cash_tendered"):
            try:
                tendered = float(p.get("cash_tendered"))
                if tendered < p_amount:
                    raise validation_error(
                        f"Cash tendered for {p_name} is less than assigned amount",
                        code="INSUFFICIENT_CASH",
                    )
            except ValueError:
                pass

        formatted_payers.append(
            {
                "payer": p_name,
                "amount": round(p_amount, 2),
                "method": p_method,
                "cash_tendered": round(tendered, 2) if tendered is not None else None,
            }
        )

    with run_in_transaction() as cur:
        # Check bill and double-close
        cur.execute(
            """
            SELECT 
                b.bill_id,
                b.order_id,
                b.status,
                b.total_amount,
                b.paid_at,
                (
                    SELECT s.name
                    FROM payment p
                    JOIN staff s ON s.staff_id = p.received_by
                    WHERE p.bill_id = b.bill_id
                    ORDER BY p.paid_at DESC, p.payment_id DESC
                    LIMIT 1
                ) AS closed_by_name
            FROM bill b
            WHERE b.bill_id = %s
            FOR UPDATE;
            """,
            (bill_id,),
        )
        bill_row = cur.fetchone()

        if not bill_row:
            raise not_found(f"Bill {bill_id} not found")

        if bill_row["status"] == "paid":
            closed_by = bill_row["closed_by_name"] or "Another Cashier"
            closed_at = _format_time(bill_row["paid_at"]) or "earlier"
            raise already_paid(
                closed_by=closed_by,
                closed_at=closed_at,
                message=(
                    f"This order is already closed. Paid at {closed_at} by "
                    f"cashier {closed_by} (double-close blocked)."
                ),
            )

        # Prepare order
        cur.execute(
            """
            UPDATE orders
            SET status = 'bill_requested'
            WHERE order_id = %s AND status = 'open';
            """,
            (bill_row["order_id"],),
        )

        # Execute confirm_split_payment
        try:
            cur.execute(
                """
                SELECT * FROM confirm_split_payment(%s, %s::jsonb, %s);
                """,
                (bill_id, json.dumps(formatted_payers), cashier_id),
            )
        except psycopg2.Error as e:
            pg_err = str(e)
            if "BL001" in pg_err:
                raise already_paid()
            if "BL002" in pg_err or "match" in pg_err.lower():
                bill_tot = float(bill_row["total_amount"])
                diff = round(bill_tot - total_assigned, 2)
                raise conflict(
                    f"Split mismatch: Assigned total ${total_assigned:.2f} does not match "
                    f"bill total ${bill_tot:.2f} ({'Short' if diff > 0 else 'Over'} by ${abs(diff):.2f}).",
                    code="SPLIT_MISMATCH",
                    extra={"difference": str(diff)},
                )
            raise conflict(f"Split payment failed: {pg_err}")

    updated_bill = get_bill_by_id(bill_id)
    return {
        "success": True,
        "bill": updated_bill,
        "receipt_no": updated_bill["receipt_no"],
    }


def get_receipt(bill_or_order_id):
    """
    Screen 15 / 15.1: Fetch receipt data.
    """
    bill = get_bill_by_id(bill_or_order_id)
    return {
        "receipt_no": bill["receipt_no"],
        "order_id": bill["order_id"],
        "table_no": bill["table_no"],
        "waiter_name": bill["waiter_name"],
        "cashier_name": bill["cashier_name"] or "R. Patel",
        "closed_at": bill["closed_at"] or "14:52",
        "date_formatted": bill["date_formatted"],
        "items": bill["items"],
        "subtotal": bill["subtotal"],
        "promotion": bill["promotion"],
        "discount": bill["discount"],
        "total_amount": bill["total_amount"],
        "status": bill["status"],
        "payment": bill["payment"]
        or {
            "method": "card",
            "amount": bill["total_amount"],
            "paid_at": bill["closed_at"] or "14:52",
        },
    }


def get_daily_cash_summary():
    """
    Daily cash summary by payment method.
    Reads from v_daily_cash_summary view.
    """
    with run_in_transaction() as cur:
        cur.execute(
            """
            SELECT 
                day::text,
                method,
                payment_count,
                total_amount
            FROM v_daily_cash_summary
            ORDER BY day DESC, method ASC;
            """
        )
        rows = cur.fetchall()

    summary = []
    grand_total = 0.0
    total_tx = 0

    for r in rows:
        amt = _to_float(r["total_amount"])
        cnt = int(r["payment_count"])
        grand_total += amt
        total_tx += cnt
        summary.append(
            {
                "day": r["day"],
                "method": r["method"],
                "payment_count": cnt,
                "total_amount": amt,
            }
        )

    return {
        "summary": summary,
        "grand_total": round(grand_total, 2),
        "total_transactions": total_tx,
    }
