-- 04_orders_waiter.sql
-- Owner   : Ayush (Module 2 - Waiter and Orders)
-- Purpose : Orders and order items tables, optimistic concurrency versioning,
--           row-locking procedures, views, and order lifecycle functions.
-- Depends : 01_admin_base.sql, 02_stations.sql, 03_menu_admin.sql
-- =====================================================================

-- 1. orders table
-- Represents a customer dining order for a specific table.
-- Tracks optimistic concurrency versioning (version counter) and status.
CREATE TABLE IF NOT EXISTS orders (
    order_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_id     bigint NOT NULL REFERENCES restaurant_table (table_id) ON DELETE RESTRICT,
    waiter_id    uuid NOT NULL REFERENCES staff (staff_id) ON DELETE RESTRICT,
    status       text NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_kitchen', 'served', 'bill_requested', 'closed', 'cancelled')),
    version      int NOT NULL DEFAULT 1 CHECK (version >= 1),
    guests       int NOT NULL CHECK (guests > 0),
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    closed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders (table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON orders (waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- Enable RLS (policies in 07_security_rls.sql)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;


-- 2. order_item table
-- Line items belonging to an order.
-- Items start as 'draft' until the waiter sends them to the kitchen ('sent').
CREATE TABLE IF NOT EXISTS order_item (
    order_item_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       bigint NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    item_id        bigint NOT NULL REFERENCES menu_item (item_id) ON DELETE RESTRICT,
    quantity       int NOT NULL CHECK (quantity > 0),
    unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
    status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'cancelled')),
    notes          text,
    added_by       uuid NOT NULL REFERENCES staff (staff_id),
    added_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON order_item (order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_item_id ON order_item (item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_status ON order_item (status);

ALTER TABLE order_item ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 3. VIEWS (Screen 4 & Screen 10)
-- =====================================================================

-- v_table_map: Floor overview for Screen 4 (Table Map)
-- Combines table capacity, section, current status, active order, guest count,
-- assigned waiter name, and elapsed activity.
CREATE OR REPLACE VIEW v_table_map AS
SELECT
    t.table_id,
    t.t_no,
    'T-' || LPAD(t.t_no::text, 2, '0') AS table_label,
    t.section,
    t.capacity,
    t.status AS table_status,
    o.order_id,
    o.guests AS current_guests,
    o.status AS order_status,
    o.version AS order_version,
    s.name AS waiter_name,
    s.username AS waiter_username,
    o.created_at AS order_opened_at,
    CASE
        WHEN o.created_at IS NOT NULL THEN
            ROUND(EXTRACT(EPOCH FROM (now() - o.created_at)) / 60)::int
        ELSE NULL
    END AS elapsed_minutes
FROM restaurant_table t
LEFT JOIN orders o ON t.table_id = o.table_id AND o.status IN ('open', 'in_kitchen', 'served', 'bill_requested')
LEFT JOIN staff s ON o.waiter_id = s.staff_id;


-- v_my_orders: Order tracking for Screen 10 (My Orders)
-- Provides order summaries, item counts, subtotal, and table details.
CREATE OR REPLACE VIEW v_my_orders AS
SELECT
    o.order_id,
    'ORD-' || LPAD(o.order_id::text, 3, '0') AS order_code,
    o.table_id,
    'T-' || LPAD(t.t_no::text, 2, '0') AS table_no,
    t.section,
    o.waiter_id,
    s.name AS waiter_name,
    s.username AS waiter_username,
    o.guests,
    o.status,
    o.version,
    o.notes,
    o.created_at,
    o.closed_at,
    COALESCE(SUM(oi.quantity) FILTER (WHERE oi.status != 'cancelled'), 0)::int AS total_items,
    COALESCE(SUM(oi.quantity * oi.unit_price) FILTER (WHERE oi.status != 'cancelled'), 0.00)::numeric(10,2) AS subtotal
FROM orders o
JOIN restaurant_table t ON o.table_id = t.table_id
JOIN staff s ON o.waiter_id = s.staff_id
LEFT JOIN order_item oi ON o.order_id = oi.order_id
GROUP BY o.order_id, t.t_no, t.section, s.name, s.username;


-- =====================================================================
-- 4. DATABASE STORED FUNCTIONS & CONCURRENCY CONTROLS
-- =====================================================================

-- A. open_order
-- Opens a new order for a free table, assigns waiter, sets table to occupied.
CREATE OR REPLACE FUNCTION open_order(
    p_table_id   bigint,
    p_guests     int,
    p_notes      text,
    p_waiter_id  uuid
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    v_table_status text;
    v_capacity     int;
    v_new_order_id bigint;
BEGIN
    -- Check table status and capacity
    SELECT status, capacity INTO v_table_status, v_capacity
    FROM restaurant_table
    WHERE table_id = p_table_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Table % does not exist', p_table_id;
    END IF;

    IF v_table_status != 'free' THEN
        RAISE EXCEPTION 'Table is not free (current status: %)', v_table_status;
    END IF;

    IF p_guests > v_capacity THEN
        RAISE EXCEPTION 'Guest count (%) exceeds table capacity (%)', p_guests, v_capacity;
    END IF;

    IF p_guests < 1 THEN
        RAISE EXCEPTION 'Guest count must be at least 1';
    END IF;

    -- Create order
    INSERT INTO orders (table_id, waiter_id, status, version, guests, notes, created_at)
    VALUES (p_table_id, p_waiter_id, 'open', 1, p_guests, p_notes, now())
    RETURNING order_id INTO v_new_order_id;

    -- Update table status to occupied
    UPDATE restaurant_table
    SET status = 'occupied'
    WHERE table_id = p_table_id;

    RETURN v_new_order_id;
END;
$$;


-- B. add_order_item (Optimistic Concurrency Check)
-- Validates expected_version before modifying order. Increments order version on success.
CREATE OR REPLACE FUNCTION add_order_item(
    p_order_id         bigint,
    p_item_id          bigint,
    p_quantity         int,
    p_notes            text,
    p_waiter_id        uuid,
    p_expected_version int
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version int;
    v_order_status    text;
    v_unit_price      numeric(10,2);
    v_new_version     int;
    v_existing_item_id bigint;
BEGIN
    -- Check order status and version
    SELECT version, status INTO v_current_version, v_order_status
    FROM orders
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_order_status IN ('closed', 'cancelled', 'bill_requested') THEN
        RAISE EXCEPTION 'Order is locked or closed (status: %)', v_order_status;
    END IF;

    -- Optimistic version check
    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Order has been modified by another user. Current version: %, Expected: %',
            v_current_version, p_expected_version;
    END IF;

    -- Lookup menu item price and status
    SELECT price INTO v_unit_price
    FROM menu_item
    WHERE item_id = p_item_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Menu item % is invalid or unavailable', p_item_id;
    END IF;

    -- Check if item is already in draft for this order
    SELECT order_item_id INTO v_existing_item_id
    FROM order_item
    WHERE order_id = p_order_id AND item_id = p_item_id AND status = 'draft';

    IF v_existing_item_id IS NOT NULL THEN
        UPDATE order_item
        SET quantity = quantity + p_quantity,
            notes = COALESCE(p_notes, notes)
        WHERE order_item_id = v_existing_item_id;
    ELSE
        INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, notes, added_by, added_at)
        VALUES (p_order_id, p_item_id, p_quantity, v_unit_price, 'draft', p_notes, p_waiter_id, now());
    END IF;

    -- Increment order version
    UPDATE orders
    SET version = version + 1
    WHERE order_id = p_order_id
    RETURNING version INTO v_new_version;

    RETURN v_new_version;
END;
$$;


-- C. add_order_item_locked (Pessimistic Row Locking FOR UPDATE)
-- Locks the order row with a 30-second lock timeout for concurrency testing.
CREATE OR REPLACE FUNCTION add_order_item_locked(
    p_order_id   bigint,
    p_item_id    bigint,
    p_quantity   int,
    p_notes      text,
    p_waiter_id  uuid
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version int;
    v_order_status    text;
    v_unit_price      numeric(10,2);
    v_new_version     int;
BEGIN
    -- Set lock timeout for pessimistic wait (30 seconds)
    SET LOCAL lock_timeout = '30s';

    -- Acquire exclusive row lock
    SELECT version, status INTO v_current_version, v_order_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    SELECT price INTO v_unit_price
    FROM menu_item
    WHERE item_id = p_item_id AND status = 'active';

    INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, notes, added_by)
    VALUES (p_order_id, p_item_id, p_quantity, v_unit_price, 'draft', p_notes, p_waiter_id);

    UPDATE orders
    SET version = version + 1
    WHERE order_id = p_order_id
    RETURNING version INTO v_new_version;

    RETURN v_new_version;
END;
$$;


-- D. send_to_kitchen
-- Advances draft items to 'sent' and updates order status to 'in_kitchen'.
CREATE OR REPLACE FUNCTION send_to_kitchen(
    p_order_id         bigint,
    p_expected_version int
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version int;
    v_draft_count     int;
    v_new_version     int;
BEGIN
    SELECT version INTO v_current_version
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Order has been modified. Current: %, Expected: %',
            v_current_version, p_expected_version;
    END IF;

    SELECT COUNT(*) INTO v_draft_count
    FROM order_item
    WHERE order_id = p_order_id AND status = 'draft';

    IF v_draft_count = 0 THEN
        RAISE EXCEPTION 'No draft items to send to kitchen';
    END IF;

    -- Update draft items to sent
    UPDATE order_item
    SET status = 'sent'
    WHERE order_id = p_order_id AND status = 'draft';

    -- Advance order status and version
    UPDATE orders
    SET status = 'in_kitchen',
        version = version + 1
    WHERE order_id = p_order_id
    RETURNING version INTO v_new_version;

    RETURN v_new_version;
END;
$$;


-- E. request_bill
-- Marks order as 'bill_requested' ready for cashier settlement.
CREATE OR REPLACE FUNCTION request_bill(p_order_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_status text;
    v_unsent_count int;
BEGIN
    SELECT status INTO v_order_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_order_status = 'bill_requested' THEN
        RETURN true; -- already requested
    END IF;

    -- Verify no remaining draft items
    SELECT COUNT(*) INTO v_unsent_count
    FROM order_item
    WHERE order_id = p_order_id AND status = 'draft';

    IF v_unsent_count > 0 THEN
        RAISE EXCEPTION 'Cannot request bill while draft items remain unsent';
    END IF;

    UPDATE orders
    SET status = 'bill_requested'
    WHERE order_id = p_order_id;

    RETURN true;
END;
$$;


-- F. mark_table_clean
-- Waiter action on Screen 4 to mark a 'needs_cleaning' table as 'free'.
CREATE OR REPLACE FUNCTION mark_table_clean(p_table_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status
    FROM restaurant_table
    WHERE table_id = p_table_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Table % not found', p_table_id;
    END IF;

    IF v_status != 'needs_cleaning' THEN
        RAISE EXCEPTION 'Table is currently % (only needs_cleaning tables can be marked clean)', v_status;
    END IF;

    UPDATE restaurant_table
    SET status = 'free'
    WHERE table_id = p_table_id;

    RETURN true;
END;
$$;


-- G. cancel_order
-- Cancels an active order and frees the table.
CREATE OR REPLACE FUNCTION cancel_order(p_order_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_table_id bigint;
BEGIN
    SELECT table_id INTO v_table_id
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    UPDATE orders
    SET status = 'cancelled',
        closed_at = now()
    WHERE order_id = p_order_id;

    UPDATE order_item
    SET status = 'cancelled'
    WHERE order_id = p_order_id;

    UPDATE restaurant_table
    SET status = 'free'
    WHERE table_id = v_table_id;

    RETURN true;
END;
$$;


-- H. update_order_item_qty
-- Updates quantity or notes for a draft item with optimistic version check.
CREATE OR REPLACE FUNCTION update_order_item_qty(
    p_order_id         bigint,
    p_order_item_id    bigint,
    p_new_quantity     int,
    p_notes            text,
    p_expected_version int
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version int;
    v_order_status    text;
    v_item_status     text;
    v_new_version     int;
BEGIN
    SELECT version, status INTO v_current_version, v_order_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_order_status IN ('closed', 'cancelled', 'bill_requested') THEN
        RAISE EXCEPTION 'Order is locked or closed (status: %)', v_order_status;
    END IF;

    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Order was changed by another user. Current version: %, Expected: %',
            v_current_version, p_expected_version;
    END IF;

    SELECT status INTO v_item_status
    FROM order_item
    WHERE order_item_id = p_order_item_id AND order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item % not found on order %', p_order_item_id, p_order_id;
    END IF;

    IF v_item_status != 'draft' THEN
        RAISE EXCEPTION 'Only draft items can be modified (current status: %)', v_item_status;
    END IF;

    IF p_new_quantity <= 0 THEN
        DELETE FROM order_item WHERE order_item_id = p_order_item_id;
    ELSE
        UPDATE order_item
        SET quantity = p_new_quantity,
            notes = COALESCE(p_notes, notes)
        WHERE order_item_id = p_order_item_id;
    END IF;

    UPDATE orders
    SET version = version + 1
    WHERE order_id = p_order_id
    RETURNING version INTO v_new_version;

    RETURN v_new_version;
END;
$$;


-- I. remove_order_item
-- Cancels or removes an order line item with optimistic version check.
CREATE OR REPLACE FUNCTION remove_order_item(
    p_order_id         bigint,
    p_order_item_id    bigint,
    p_expected_version int
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version int;
    v_order_status    text;
    v_item_status     text;
    v_new_version     int;
BEGIN
    SELECT version, status INTO v_current_version, v_order_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_order_status IN ('closed', 'cancelled', 'bill_requested') THEN
        RAISE EXCEPTION 'Order is locked or closed (status: %)', v_order_status;
    END IF;

    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Order was changed by another user. Current version: %, Expected: %',
            v_current_version, p_expected_version;
    END IF;

    SELECT status INTO v_item_status
    FROM order_item
    WHERE order_item_id = p_order_item_id AND order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item % not found on order %', p_order_item_id, p_order_id;
    END IF;

    IF v_item_status = 'draft' THEN
        DELETE FROM order_item WHERE order_item_id = p_order_item_id;
    ELSE
        UPDATE order_item SET status = 'cancelled' WHERE order_item_id = p_order_item_id;
    END IF;

    UPDATE orders
    SET version = version + 1
    WHERE order_id = p_order_id
    RETURNING version INTO v_new_version;

    RETURN v_new_version;
END;
$$;


-- J. merge_orders
-- Combines two active tables/orders into one target order, freeing source table.
-- Locks in ascending primary key order to prevent deadlocks.
CREATE OR REPLACE FUNCTION merge_orders(
    p_source_order_id bigint,
    p_target_order_id bigint,
    p_waiter_id       uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_src_status    text;
    v_tgt_status    text;
    v_src_table_id  bigint;
    v_src_guests    int;
BEGIN
    IF p_source_order_id = p_target_order_id THEN
        RAISE EXCEPTION 'Cannot merge an order into itself';
    END IF;

    -- Lock both orders in consistent order (smaller id first) to prevent deadlock
    IF p_source_order_id < p_target_order_id THEN
        SELECT status, table_id, guests INTO v_src_status, v_src_table_id, v_src_guests
        FROM orders WHERE order_id = p_source_order_id FOR UPDATE;
        SELECT status INTO v_tgt_status
        FROM orders WHERE order_id = p_target_order_id FOR UPDATE;
    ELSE
        SELECT status INTO v_tgt_status
        FROM orders WHERE order_id = p_target_order_id FOR UPDATE;
        SELECT status, table_id, guests INTO v_src_status, v_src_table_id, v_src_guests
        FROM orders WHERE order_id = p_source_order_id FOR UPDATE;
    END IF;

    IF v_src_status IN ('closed', 'cancelled') OR v_tgt_status IN ('closed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot merge closed or cancelled orders';
    END IF;

    -- Move items from source to target
    UPDATE order_item
    SET order_id = p_target_order_id
    WHERE order_id = p_source_order_id;

    -- Update target order guests and version
    UPDATE orders
    SET guests = guests + v_src_guests,
        version = version + 1
    WHERE order_id = p_target_order_id;

    -- Cancel source order and free source table
    UPDATE orders
    SET status = 'cancelled',
        closed_at = now(),
        notes = COALESCE(notes, '') || ' (Merged into ORD-' || p_target_order_id || ')'
    WHERE order_id = p_source_order_id;

    UPDATE restaurant_table
    SET status = 'free'
    WHERE table_id = v_src_table_id;

    RETURN true;
END;
$$;


-- =====================================================================
-- 5. SEED DATA (Module 2 Initial Demonstrations)
-- =====================================================================

DO $$
DECLARE
    v_waiter_id uuid;
    v_t2_id     bigint;
    v_t3_id     bigint;
    v_t7_id     bigint;
    v_salmon_id bigint;
    v_salad_id  bigint;
    v_lemonade_id bigint;
    v_pizza_id  bigint;
    v_order1_id bigint;
    v_order2_id bigint;
BEGIN
    -- Get default waiter id (A. Smith)
    SELECT staff_id INTO v_waiter_id FROM staff WHERE username = 'asmith';
    IF v_waiter_id IS NULL THEN
        SELECT staff_id INTO v_waiter_id FROM staff LIMIT 1;
    END IF;

    -- Get sample tables
    SELECT table_id INTO v_t2_id FROM restaurant_table WHERE t_no = 2;
    SELECT table_id INTO v_t3_id FROM restaurant_table WHERE t_no = 3;
    SELECT table_id INTO v_t7_id FROM restaurant_table WHERE t_no = 7;

    -- Get menu items
    SELECT item_id INTO v_salmon_id FROM menu_item WHERE name ILIKE '%salmon%' LIMIT 1;
    SELECT item_id INTO v_salad_id  FROM menu_item WHERE name ILIKE '%caesar%' LIMIT 1;
    SELECT item_id INTO v_lemonade_id FROM menu_item WHERE name ILIKE '%lemonade%' LIMIT 1;
    SELECT item_id INTO v_pizza_id  FROM menu_item WHERE name ILIKE '%pizza%' LIMIT 1;

    IF v_waiter_id IS NOT NULL AND v_t2_id IS NOT NULL THEN
        -- Seed Order 1 (T-02, in_kitchen, v3)
        IF NOT EXISTS (SELECT 1 FROM orders WHERE table_id = v_t2_id AND status = 'in_kitchen') THEN
            INSERT INTO orders (table_id, waiter_id, status, version, guests, notes, created_at)
            VALUES (v_t2_id, v_waiter_id, 'in_kitchen', 3, 3, 'Allergic to peanuts. Dressing on side.', now() - INTERVAL '35 minutes')
            RETURNING order_id INTO v_order1_id;

            IF v_salmon_id IS NOT NULL THEN
                INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
                VALUES (v_order1_id, v_salmon_id, 2, 24.00, 'sent', v_waiter_id);
            END IF;

            IF v_salad_id IS NOT NULL THEN
                INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
                VALUES (v_order1_id, v_salad_id, 1, 9.50, 'sent', v_waiter_id);
            END IF;

            IF v_lemonade_id IS NOT NULL THEN
                INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
                VALUES (v_order1_id, v_lemonade_id, 3, 4.00, 'sent', v_waiter_id);
            END IF;

            UPDATE restaurant_table SET status = 'occupied' WHERE table_id = v_t2_id;
        END IF;

        -- Seed Order 2 (T-03, open draft order)
        IF v_t3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders WHERE table_id = v_t3_id AND status = 'open') THEN
            INSERT INTO orders (table_id, waiter_id, status, version, guests, notes, created_at)
            VALUES (v_t3_id, v_waiter_id, 'open', 1, 2, 'Extra crispy crust requested', now() - INTERVAL '15 minutes')
            RETURNING order_id INTO v_order2_id;

            IF v_pizza_id IS NOT NULL THEN
                INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
                VALUES (v_order2_id, v_pizza_id, 1, 14.00, 'draft', v_waiter_id);
            END IF;

            UPDATE restaurant_table SET status = 'occupied' WHERE table_id = v_t3_id;
        END IF;
    END IF;
END $$;
