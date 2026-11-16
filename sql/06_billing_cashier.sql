-- =====================================================================
-- Owner      : Sakshi
-- Purpose    : Cashier and billing: bill, payment, promotion, billing
--              triggers and functions, report views, promotion seed data
-- Depends on : 01_admin_base.sql (staff, restaurant_table)
--              04_orders_waiter.sql (orders, order_item)
--              03_menu_admin.sql (menu_item), 05_kitchen_tickets.sql (kitchen_ticket)
-- Assumed columns from other modules (check before running):
--   orders.closed_at, menu_item.name, kitchen_ticket.served_at
-- Custom error codes (Flask maps these to HTTP 409):
--   BL001 bill already paid | BL002 amount mismatch / overpay
--   BL003 order not ready for payment | BL004 bill/promotion not found or invalid
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS promotion (
    promo_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text          NOT NULL UNIQUE,
    kind        text          NOT NULL CHECK (kind IN ('percentage', 'fixed')),
    value       numeric(10,2) NOT NULL CHECK (value > 0),
    is_active   boolean       NOT NULL DEFAULT true,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    CHECK (kind <> 'percentage' OR value <= 100)
);

CREATE SEQUENCE IF NOT EXISTS bill_receipt_seq START 1001;

CREATE TABLE IF NOT EXISTS bill (
    bill_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      bigint        NOT NULL UNIQUE
                                REFERENCES orders(order_id) ON DELETE RESTRICT,
    promo_id      bigint        REFERENCES promotion(promo_id) ON DELETE RESTRICT,
    receipt_no    text          NOT NULL UNIQUE
                                DEFAULT ('R-' || nextval('bill_receipt_seq')),
    subtotal      numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount      numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount  numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status        text          NOT NULL DEFAULT 'unpaid'
                                CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
    opened_by     uuid          REFERENCES staff(staff_id) ON DELETE RESTRICT,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    paid_at       timestamptz,
    CHECK (discount <= subtotal),
    CHECK (total_amount = subtotal - discount)
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id        bigint        NOT NULL
                                 REFERENCES bill(bill_id) ON DELETE RESTRICT,
    amount         numeric(10,2) NOT NULL CHECK (amount > 0),
    method         text          NOT NULL CHECK (method IN ('cash', 'card', 'upi')),
    cash_tendered  numeric(10,2),
    change_due     numeric(10,2),
    split_group    text,                       -- payer label, e.g. 'Guest 1'
    received_by    uuid          NOT NULL
                                 REFERENCES staff(staff_id) ON DELETE RESTRICT,
    paid_at        timestamptz   NOT NULL DEFAULT now(),
    CHECK (method = 'cash' OR (cash_tendered IS NULL AND change_due IS NULL)),
    CHECK (cash_tendered IS NULL OR cash_tendered >= amount)
);

CREATE INDEX IF NOT EXISTS idx_bill_promo_id    ON bill(promo_id);
CREATE INDEX IF NOT EXISTS idx_bill_status      ON bill(status);
CREATE INDEX IF NOT EXISTS idx_payment_bill_id  ON payment(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_paid_at  ON payment(paid_at);

-- ---------------------------------------------------------------------
-- 2. Seed data (promotions)
-- ---------------------------------------------------------------------

INSERT INTO promotion (code, kind, value) VALUES
    ('STAFF10',  'percentage', 10.00),
    ('WELCOME5', 'fixed',       5.00)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Helper: discount for a subtotal and promotion
--    Percentage applies to the subtotal; fixed cannot exceed the subtotal.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION bill_discount_for(p_subtotal numeric, p_promo_id bigint)
RETURNS numeric
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_kind  text;
    v_value numeric(10,2);
BEGIN
    IF p_promo_id IS NULL THEN
        RETURN 0;
    END IF;
    SELECT kind, value INTO v_kind, v_value FROM promotion WHERE promo_id = p_promo_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    IF v_kind = 'percentage' THEN
        RETURN round(p_subtotal * v_value / 100, 2);
    END IF;
    RETURN least(v_value, p_subtotal);
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Helper: recompute one bill (locks the bill row)
--    Used by recalc_bill, apply_promotion and remove_promotion so the
--    discount-versus-new-item race is closed by the same row lock.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recompute_bill_totals(p_bill_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id bigint;
    v_promo_id bigint;
    v_status   text;
    v_sub      numeric(10,2);
    v_disc     numeric(10,2);
BEGIN
    SELECT order_id, promo_id, status
      INTO v_order_id, v_promo_id, v_status
      FROM bill WHERE bill_id = p_bill_id FOR UPDATE;

    IF NOT FOUND OR v_status <> 'unpaid' THEN
        RETURN;                       -- paid or partly paid bills are frozen
    END IF;

    SELECT COALESCE(SUM(quantity * unit_price), 0)
      INTO v_sub
      FROM order_item
     WHERE order_id = v_order_id AND status <> 'cancelled';

    v_disc := bill_discount_for(v_sub, v_promo_id);

    UPDATE bill
       SET subtotal = v_sub, discount = v_disc, total_amount = v_sub - v_disc
     WHERE bill_id = p_bill_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Trigger: create the bill when an order is opened
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_bill_for_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO bill (order_id, opened_by)
    VALUES (NEW.order_id, NEW.waiter_id)
    ON CONFLICT (order_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_bill_for_order ON orders;
CREATE TRIGGER trg_create_bill_for_order
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION create_bill_for_order();

-- ---------------------------------------------------------------------
-- 6. Trigger: recalculate the bill when order items change
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_bill()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_order_id bigint := COALESCE(NEW.order_id, OLD.order_id);
    v_bill_id  bigint;
BEGIN
    SELECT bill_id INTO v_bill_id FROM bill WHERE order_id = v_order_id;
    IF v_bill_id IS NOT NULL THEN
        PERFORM recompute_bill_totals(v_bill_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_bill ON order_item;
CREATE TRIGGER trg_recalc_bill
    AFTER INSERT OR UPDATE OR DELETE ON order_item
    FOR EACH ROW EXECUTE FUNCTION recalc_bill();

-- ---------------------------------------------------------------------
-- 7. apply_promotion / remove_promotion (screen 9)
--    p_staff_id is passed by the API for the audit trail (Girish's audit
--    trigger records the change).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_promotion(p_bill_id bigint, p_promo_code text, p_staff_id uuid)
RETURNS bill
LANGUAGE plpgsql
AS $$
DECLARE
    v_bill  bill;
    v_promo promotion;
BEGIN
    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill % not found', p_bill_id USING ERRCODE = 'BL004';
    END IF;
    IF v_bill.status <> 'unpaid' THEN
        RAISE EXCEPTION 'Promotion can only be changed on an unpaid bill' USING ERRCODE = 'BL001';
    END IF;

    SELECT * INTO v_promo
      FROM promotion
     WHERE upper(code) = upper(trim(p_promo_code)) AND is_active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Promotion code % is invalid or inactive', p_promo_code
              USING ERRCODE = 'BL004';
    END IF;

    UPDATE bill SET promo_id = v_promo.promo_id WHERE bill_id = p_bill_id;   -- replaces any old one
    PERFORM recompute_bill_totals(p_bill_id);

    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id;
    RETURN v_bill;
END;
$$;

CREATE OR REPLACE FUNCTION remove_promotion(p_bill_id bigint, p_staff_id uuid)
RETURNS bill
LANGUAGE plpgsql
AS $$
DECLARE
    v_bill bill;
BEGIN
    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill % not found', p_bill_id USING ERRCODE = 'BL004';
    END IF;
    IF v_bill.status <> 'unpaid' THEN
        RAISE EXCEPTION 'Promotion can only be changed on an unpaid bill' USING ERRCODE = 'BL001';
    END IF;

    UPDATE bill SET promo_id = NULL WHERE bill_id = p_bill_id;
    PERFORM recompute_bill_totals(p_bill_id);

    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id;
    RETURN v_bill;
END;
$$;

-- ---------------------------------------------------------------------
-- 8. record_payment: locks the bill, blocks double payment and overpay
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_payment(
    p_bill_id       bigint,
    p_amount        numeric,
    p_method        text,
    p_split_group   text,
    p_cashier_id    uuid,
    p_cash_tendered numeric DEFAULT NULL
)
RETURNS payment
LANGUAGE plpgsql
AS $$
DECLARE
    v_bill   bill;
    v_status text;
    v_paid   numeric(10,2);
    v_due    numeric(10,2);
    v_pay    payment;
BEGIN
    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill % not found', p_bill_id USING ERRCODE = 'BL004';
    END IF;

    IF v_bill.status = 'paid' THEN
        RAISE EXCEPTION 'Bill % is already paid', p_bill_id USING ERRCODE = 'BL001';
    END IF;

    SELECT status INTO v_status FROM orders WHERE order_id = v_bill.order_id;
    IF v_status <> 'bill_requested' THEN
        RAISE EXCEPTION 'Order is not ready for payment (status: %)', v_status
              USING ERRCODE = 'BL003';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payment WHERE bill_id = p_bill_id;
    v_due := v_bill.total_amount - v_paid;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive' USING ERRCODE = 'BL002';
    END IF;
    IF p_amount > v_due THEN
        RAISE EXCEPTION 'Amount % is more than the amount due %', p_amount, v_due
              USING ERRCODE = 'BL002';
    END IF;

    INSERT INTO payment (bill_id, amount, method, cash_tendered, change_due,
                         split_group, received_by)
    VALUES (p_bill_id, p_amount, p_method,
            CASE WHEN p_method = 'cash' THEN p_cash_tendered END,
            CASE WHEN p_method = 'cash' AND p_cash_tendered IS NOT NULL
                 THEN p_cash_tendered - p_amount END,
            p_split_group, p_cashier_id)
    RETURNING * INTO v_pay;

    IF v_paid + p_amount = v_bill.total_amount THEN
        UPDATE bill SET status = 'paid', paid_at = now() WHERE bill_id = p_bill_id;
    ELSE
        UPDATE bill SET status = 'partially_paid' WHERE bill_id = p_bill_id;
    END IF;

    RETURN v_pay;
END;
$$;

-- ---------------------------------------------------------------------
-- 9. confirm_split_payment (screens 14 and 14.1)
--    p_payments example:
--    [{"payer":"Guest 1","amount":300,"method":"cash","cash_tendered":500},
--     {"payer":"Guest 2","amount":250,"method":"upi"}]
--    All or nothing: any error rolls the whole call back.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION confirm_split_payment(
    p_bill_id    bigint,
    p_payments   jsonb,
    p_cashier_id uuid
)
RETURNS bill
LANGUAGE plpgsql
AS $$
DECLARE
    v_bill     bill;
    v_paid     numeric(10,2);
    v_due      numeric(10,2);
    v_assigned numeric(10,2);
    v_row      jsonb;
BEGIN
    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill % not found', p_bill_id USING ERRCODE = 'BL004';
    END IF;
    IF v_bill.status = 'paid' THEN
        RAISE EXCEPTION 'Bill % is already paid', p_bill_id USING ERRCODE = 'BL001';
    END IF;
    IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array'
       OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'No payments supplied' USING ERRCODE = 'BL002';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payment WHERE bill_id = p_bill_id;
    v_due := v_bill.total_amount - v_paid;

    SELECT COALESCE(SUM((e->>'amount')::numeric), 0) INTO v_assigned
      FROM jsonb_array_elements(p_payments) AS e;

    IF v_assigned <> v_due THEN
        RAISE EXCEPTION 'Assigned total % does not match amount due %', v_assigned, v_due
              USING ERRCODE = 'BL002';
    END IF;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
        PERFORM record_payment(
            p_bill_id,
            (v_row->>'amount')::numeric,
            v_row->>'method',
            v_row->>'payer',
            p_cashier_id,
            (v_row->>'cash_tendered')::numeric
        );
    END LOOP;

    SELECT * INTO v_bill FROM bill WHERE bill_id = p_bill_id;
    RETURN v_bill;
END;
$$;

-- ---------------------------------------------------------------------
-- 10. Trigger: when a bill becomes paid, close the order and mark table
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION close_order_on_paid()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_table_id bigint;
BEGIN
    UPDATE orders
       SET status = 'closed', closed_at = now()
     WHERE order_id = NEW.order_id
    RETURNING table_id INTO v_table_id;

    UPDATE restaurant_table
       SET status = 'needs_cleaning'
     WHERE table_id = v_table_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_order_on_paid ON bill;
CREATE TRIGGER trg_close_order_on_paid
    AFTER UPDATE OF status ON bill
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND OLD.status <> 'paid')
    EXECUTE FUNCTION close_order_on_paid();

-- ---------------------------------------------------------------------
-- 11. Views
-- ---------------------------------------------------------------------

-- Itemised bill (one row per item) with served time from the kitchen
CREATE OR REPLACE VIEW v_bill_detail AS
SELECT
    b.bill_id,
    b.order_id,
    b.receipt_no,
    o.table_id,
    oi.order_item_id,
    mi.name                           AS item_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price)     AS line_total,
    kt.served_at,
    b.subtotal,
    pr.code                           AS promo_code,
    b.discount,
    b.total_amount,
    COALESCE(pd.paid, 0)              AS paid,
    b.total_amount - COALESCE(pd.paid, 0) AS balance,
    b.status                          AS bill_status
FROM bill b
JOIN orders o        ON o.order_id = b.order_id
JOIN order_item oi   ON oi.order_id = b.order_id AND oi.status <> 'cancelled'
JOIN menu_item mi    ON mi.item_id = oi.item_id
LEFT JOIN kitchen_ticket kt ON kt.order_item_id = oi.order_item_id
LEFT JOIN promotion pr      ON pr.promo_id = b.promo_id
LEFT JOIN LATERAL (
    SELECT SUM(p.amount) AS paid FROM payment p WHERE p.bill_id = b.bill_id
) pd ON true;

-- Receipt: one row per payment (payers and methods) with who received it
CREATE OR REPLACE VIEW v_receipt AS
SELECT
    b.bill_id,
    b.receipt_no,
    b.order_id,
    b.subtotal,
    b.discount,
    b.total_amount,
    b.status          AS bill_status,
    b.paid_at,
    p.payment_id,
    p.split_group     AS payer,
    p.method,
    p.amount,
    p.cash_tendered,
    p.change_due,
    s.name            AS received_by_name,
    (SELECT s2.name
       FROM payment p2
       JOIN staff s2 ON s2.staff_id = p2.received_by
      WHERE p2.bill_id = b.bill_id
      ORDER BY p2.paid_at DESC, p2.payment_id DESC
      LIMIT 1)        AS closed_by
FROM bill b
LEFT JOIN payment p ON p.bill_id = b.bill_id
LEFT JOIN staff s   ON s.staff_id = p.received_by;

-- Daily cash summary by payment method
CREATE OR REPLACE VIEW v_daily_cash_summary AS
SELECT
    date_trunc('day', p.paid_at)::date AS day,
    p.method,
    COUNT(*)                           AS payment_count,
    SUM(p.amount)                      AS total_amount
FROM payment p
GROUP BY date_trunc('day', p.paid_at)::date, p.method
ORDER BY day DESC, p.method;
