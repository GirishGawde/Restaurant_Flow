CREATE TABLE IF NOT EXISTS orders (
    order_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_id      bigint NOT NULL REFERENCES restaurant_table (table_id),
    waiter_id     uuid NOT NULL REFERENCES staff (staff_id),
    status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_kitchen', 'served', 'bill_requested', 'closed', 'cancelled')),
    version       int NOT NULL DEFAULT 1,
    guests        int NOT NULL CHECK (guests > 0),
    notes         text,
    locked_by     uuid REFERENCES staff (staff_id),
    locked_at     timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    closed_at     timestamptz
);

CREATE TABLE IF NOT EXISTS order_item (
    order_item_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      bigint NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    item_id       bigint NOT NULL REFERENCES menu_item (item_id),
    quantity      int NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price    numeric(10,2) NOT NULL CHECK (unit_price >= 0),
    status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'sent', 'cancelled')),
    notes         text,
    added_by      uuid REFERENCES staff (staff_id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kitchen_ticket (
    ticket_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id bigint NOT NULL UNIQUE REFERENCES order_item (order_item_id) ON DELETE CASCADE,
    station_id    bigint NOT NULL REFERENCES station (station_id),
    status        text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'cooking', 'ready', 'served')),
    notes         text,
    issue_note    text,
    placed_at     timestamptz NOT NULL DEFAULT now(),
    started_at    timestamptz,
    ready_at      timestamptz,
    served_at     timestamptz,
    updated_by    uuid REFERENCES staff (staff_id)
);

CREATE TABLE IF NOT EXISTS promotion (
    promo_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          text NOT NULL UNIQUE,
    kind          text NOT NULL CHECK (kind IN ('percentage', 'fixed')),
    value         numeric(10,2) NOT NULL CHECK (value > 0),
    is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bill (
    bill_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      bigint NOT NULL UNIQUE REFERENCES orders (order_id),
    promo_id      bigint REFERENCES promotion (promo_id),
    subtotal      numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount      numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total_amount  numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status        text NOT NULL DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
    opened_by     uuid REFERENCES staff (staff_id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id       bigint NOT NULL REFERENCES bill (bill_id),
    amount        numeric(10,2) NOT NULL CHECK (amount > 0),
    method        text NOT NULL CHECK (method IN ('cash', 'card', 'upi')),
    split_group   text,
    received_by   uuid REFERENCES staff (staff_id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_table  ENABLE ROW LEVEL SECURITY;
ALTER TABLE station           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_setting       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment           ENABLE ROW LEVEL SECURITY;

-- 1. staff
DROP POLICY IF EXISTS staff_admin_all ON staff;
CREATE POLICY staff_admin_all ON staff
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS staff_read_directory ON staff;
CREATE POLICY staff_read_directory ON staff
    FOR SELECT TO authenticated
    USING (is_active = true OR current_staff_role() = 'admin');

DROP POLICY IF EXISTS staff_update_own ON staff;
CREATE POLICY staff_update_own ON staff
    FOR UPDATE TO authenticated
    USING (staff_id = auth.uid())
    WITH CHECK (staff_id = auth.uid());

-- 2. restaurant_table
DROP POLICY IF EXISTS table_admin_all ON restaurant_table;
CREATE POLICY table_admin_all ON restaurant_table
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS table_read_all ON restaurant_table;
CREATE POLICY table_read_all ON restaurant_table
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS table_waiter_update ON restaurant_table;
CREATE POLICY table_waiter_update ON restaurant_table
    FOR UPDATE TO authenticated
    USING (current_staff_role() = 'waiter');

DROP POLICY IF EXISTS table_cashier_update ON restaurant_table;
CREATE POLICY table_cashier_update ON restaurant_table
    FOR UPDATE TO authenticated
    USING (current_staff_role() = 'cashier');

-- 3. station
DROP POLICY IF EXISTS station_admin_all ON station;
CREATE POLICY station_admin_all ON station
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS station_read_all ON station;
CREATE POLICY station_read_all ON station
    FOR SELECT TO authenticated
    USING (true);

-- 4. menu_item
DROP POLICY IF EXISTS menu_admin_all ON menu_item;
CREATE POLICY menu_admin_all ON menu_item
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS menu_staff_read ON menu_item;
CREATE POLICY menu_staff_read ON menu_item
    FOR SELECT TO authenticated
    USING (true);

-- 5. app_setting
DROP POLICY IF EXISTS app_setting_admin_all ON app_setting;
CREATE POLICY app_setting_admin_all ON app_setting
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS app_setting_read_all ON app_setting;
CREATE POLICY app_setting_read_all ON app_setting
    FOR SELECT TO authenticated
    USING (true);

-- 6. orders
DROP POLICY IF EXISTS orders_admin_all ON orders;
CREATE POLICY orders_admin_all ON orders
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS orders_waiter_select ON orders;
CREATE POLICY orders_waiter_select ON orders
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'waiter');

DROP POLICY IF EXISTS orders_waiter_insert ON orders;
CREATE POLICY orders_waiter_insert ON orders
    FOR INSERT TO authenticated
    WITH CHECK (current_staff_role() = 'waiter' AND waiter_id = auth.uid());

DROP POLICY IF EXISTS orders_waiter_update ON orders;
CREATE POLICY orders_waiter_update ON orders
    FOR UPDATE TO authenticated
    USING (current_staff_role() = 'waiter');

DROP POLICY IF EXISTS orders_chef_select ON orders;
CREATE POLICY orders_chef_select ON orders
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'chef');

DROP POLICY IF EXISTS orders_cashier_select ON orders;
CREATE POLICY orders_cashier_select ON orders
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'cashier');

DROP POLICY IF EXISTS orders_cashier_update ON orders;
CREATE POLICY orders_cashier_update ON orders
    FOR UPDATE TO authenticated
    USING (current_staff_role() = 'cashier');

-- 7. order_item
DROP POLICY IF EXISTS order_item_admin_all ON order_item;
CREATE POLICY order_item_admin_all ON order_item
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS order_item_waiter_all ON order_item;
CREATE POLICY order_item_waiter_all ON order_item
    FOR ALL TO authenticated
    USING (current_staff_role() = 'waiter')
    WITH CHECK (current_staff_role() = 'waiter');

DROP POLICY IF EXISTS order_item_chef_select ON order_item;
CREATE POLICY order_item_chef_select ON order_item
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'chef');

DROP POLICY IF EXISTS order_item_cashier_select ON order_item;
CREATE POLICY order_item_cashier_select ON order_item
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'cashier');

-- 8. kitchen_ticket
DROP POLICY IF EXISTS ticket_admin_all ON kitchen_ticket;
CREATE POLICY ticket_admin_all ON kitchen_ticket
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS ticket_chef_select ON kitchen_ticket;
CREATE POLICY ticket_chef_select ON kitchen_ticket
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'chef');

DROP POLICY IF EXISTS ticket_chef_update ON kitchen_ticket;
CREATE POLICY ticket_chef_update ON kitchen_ticket
    FOR UPDATE TO authenticated
    USING (current_staff_role() = 'chef');

DROP POLICY IF EXISTS ticket_waiter_select ON kitchen_ticket;
CREATE POLICY ticket_waiter_select ON kitchen_ticket
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'waiter');

DROP POLICY IF EXISTS ticket_cashier_select ON kitchen_ticket;
CREATE POLICY ticket_cashier_select ON kitchen_ticket
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'cashier');

-- 9. promotion
DROP POLICY IF EXISTS promo_admin_all ON promotion;
CREATE POLICY promo_admin_all ON promotion
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS promo_staff_select ON promotion;
CREATE POLICY promo_staff_select ON promotion
    FOR SELECT TO authenticated
    USING (current_staff_role() IN ('cashier', 'waiter', 'admin'));

-- 10. bill
DROP POLICY IF EXISTS bill_admin_all ON bill;
CREATE POLICY bill_admin_all ON bill
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS bill_cashier_all ON bill;
CREATE POLICY bill_cashier_all ON bill
    FOR ALL TO authenticated
    USING (current_staff_role() = 'cashier')
    WITH CHECK (current_staff_role() = 'cashier');

DROP POLICY IF EXISTS bill_waiter_select ON bill;
CREATE POLICY bill_waiter_select ON bill
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'waiter');

-- 11. payment
DROP POLICY IF EXISTS payment_admin_all ON payment;
CREATE POLICY payment_admin_all ON payment
    FOR ALL TO authenticated
    USING (current_staff_role() = 'admin')
    WITH CHECK (current_staff_role() = 'admin');

DROP POLICY IF EXISTS payment_cashier_all ON payment;
CREATE POLICY payment_cashier_all ON payment
    FOR ALL TO authenticated
    USING (current_staff_role() = 'cashier')
    WITH CHECK (current_staff_role() = 'cashier');

DROP POLICY IF EXISTS payment_waiter_select ON payment;
CREATE POLICY payment_waiter_select ON payment
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'waiter');

-- 12. audit_log
DROP POLICY IF EXISTS audit_admin_select ON audit_log;
CREATE POLICY audit_admin_select ON audit_log
    FOR SELECT TO authenticated
    USING (current_staff_role() = 'admin');
