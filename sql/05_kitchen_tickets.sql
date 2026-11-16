-- =====================================================================
-- File    : 05_kitchen_tickets.sql
-- Owner   : Diya
-- Purpose : kitchen_ticket table, automatic ticket creation/cancellation,
--           strict status flow (queued -> cooking -> ready -> served),
--           card-level advance, "order served" trigger, kitchen views.
-- Depends : 01_admin_base (staff, app_setting), 02_stations (station),
--           03_menu_admin (menu_item), 04_orders_waiter (orders, order_item)
--
-- Custom error codes (Flask maps these to HTTP 409):
--   KT001 = illegal status change / nothing to advance
--   KT002 = order is cancelled or closed
--   KT003 = ticket is already being cooked, cannot be cancelled
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Station extra column (Diya owns station): optional prep target
-- ---------------------------------------------------------------------
ALTER TABLE station
    ADD COLUMN IF NOT EXISTS target_prep_minutes integer
        CHECK (target_prep_minutes IS NULL OR target_prep_minutes > 0);

-- ---------------------------------------------------------------------
-- 1. Table: kitchen_ticket  (one ticket per order item)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_ticket (
    ticket_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id  bigint      NOT NULL UNIQUE
                       REFERENCES order_item(order_item_id) ON DELETE RESTRICT,
    station_id     bigint      NOT NULL
                       REFERENCES station(station_id) ON DELETE RESTRICT,
    status         text        NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued','cooking','ready','served')),

    item_note      text,                       -- copy of order_item.notes (allergy, no onion)
    issue_note     text,                       -- "Report issue" on screen 12

    -- one timestamp per stage (screen 12 status history)
    placed_at      timestamptz NOT NULL DEFAULT now(),
    accepted_at    timestamptz,
    started_at     timestamptz,
    ready_at       timestamptz,
    served_at      timestamptz,
    completed_at   timestamptz,                -- set when the item becomes ready
    due_by         timestamptz,                -- placed_at + target prep time

    -- who did what
    accepted_by    uuid REFERENCES staff(staff_id) ON DELETE RESTRICT,
    ready_by       uuid REFERENCES staff(staff_id) ON DELETE RESTRICT,
    served_by      uuid REFERENCES staff(staff_id) ON DELETE RESTRICT,
    updated_by     uuid REFERENCES staff(staff_id) ON DELETE RESTRICT,
    updated_at     timestamptz NOT NULL DEFAULT now(),

    -- stage timestamps must exist once the stage is reached
    CONSTRAINT kt_started_when_cooking CHECK (status = 'queued' OR started_at IS NOT NULL),
    CONSTRAINT kt_ready_when_ready     CHECK (status NOT IN ('ready','served') OR ready_at IS NOT NULL),
    CONSTRAINT kt_served_when_served   CHECK (status <> 'served' OR served_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_kt_status          ON kitchen_ticket (status);
CREATE INDEX IF NOT EXISTS idx_kt_station         ON kitchen_ticket (station_id);
CREATE INDEX IF NOT EXISTS idx_kt_station_status  ON kitchen_ticket (station_id, status);
CREATE INDEX IF NOT EXISTS idx_kt_placed_at       ON kitchen_ticket (placed_at);
CREATE INDEX IF NOT EXISTS idx_kt_served_at       ON kitchen_ticket (served_at);

-- ---------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------

-- Position of a status in the allowed flow (NULL for unknown values)
CREATE OR REPLACE FUNCTION kitchen_status_rank(p_status text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_status
               WHEN 'queued'  THEN 1
               WHEN 'cooking' THEN 2
               WHEN 'ready'   THEN 3
               WHEN 'served'  THEN 4
           END;
$$;

-- Reads an integer setting from Girish's app_setting table.
-- ASSUMES app_setting(setting_key text, setting_value text). If Girish
-- uses other column names, change only the EXECUTE line below.
-- Falls back to the default if the table/column/row is missing.
CREATE OR REPLACE FUNCTION kitchen_setting_int(p_key text, p_default integer)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
DECLARE
    v integer;
BEGIN
    EXECUTE 'SELECT setting_value::integer FROM app_setting WHERE setting_key = $1'
        INTO v USING p_key;
    RETURN COALESCE(v, p_default);
EXCEPTION
    WHEN undefined_table OR undefined_column OR invalid_text_representation THEN
        RETURN p_default;
END;
$$;

-- Only chefs (or admin) may move tickets
CREATE OR REPLACE FUNCTION kitchen_require_chef(p_staff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM staff WHERE staff_id = p_staff_id;
    IF v_role IS NULL OR v_role NOT IN ('chef','admin') THEN
        RAISE EXCEPTION 'Only kitchen staff can change ticket status' USING ERRCODE = 'KT001';
    END IF;
END;
$$;

-- Order check: a cancelled or closed order cannot move in the kitchen
CREATE OR REPLACE FUNCTION kitchen_assert_order_workable(p_order_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM orders WHERE order_id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;
    IF v_status IN ('cancelled','closed') THEN
        RAISE EXCEPTION 'Order % is %, kitchen cannot change its tickets', p_order_id, v_status
            USING ERRCODE = 'KT002';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Trigger: block illegal status jumps at database level
--    (works even if someone runs a direct UPDATE)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_ticket_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF kitchen_status_rank(NEW.status) IS DISTINCT FROM kitchen_status_rank(OLD.status) + 1 THEN
            RAISE EXCEPTION 'Illegal ticket status change: % -> % (allowed: queued, cooking, ready, served, one step at a time)',
                OLD.status, NEW.status USING ERRCODE = 'KT001';
        END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ticket_transition ON kitchen_ticket;
CREATE TRIGGER trg_enforce_ticket_transition
    BEFORE UPDATE ON kitchen_ticket
    FOR EACH ROW EXECUTE FUNCTION enforce_ticket_transition();

-- ---------------------------------------------------------------------
-- 4. Trigger: create ticket when order_item goes draft -> sent
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_ticket_for_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_station bigint;
    v_target  integer;
BEGIN
    SELECT m.station_id INTO v_station
    FROM menu_item m
    WHERE m.item_id = NEW.item_id;

    IF v_station IS NULL THEN
        RAISE EXCEPTION 'Menu item % has no station, cannot create a kitchen ticket', NEW.item_id;
    END IF;

    SELECT COALESCE(s.target_prep_minutes, kitchen_setting_int('target_prep_minutes', 20))
      INTO v_target
    FROM station s
    WHERE s.station_id = v_station;

    INSERT INTO kitchen_ticket (order_item_id, station_id, item_note, due_by)
    VALUES (NEW.order_item_id, v_station, NEW.notes, now() + make_interval(mins => v_target));

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_ticket_for_item ON order_item;
CREATE TRIGGER trg_create_ticket_for_item
    AFTER UPDATE OF status ON order_item
    FOR EACH ROW
    WHEN (OLD.status = 'draft' AND NEW.status = 'sent')
    EXECUTE FUNCTION create_ticket_for_item();

-- ---------------------------------------------------------------------
-- 5. Trigger: order_item cancelled -> delete ticket only if still queued
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_ticket_for_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_ticket bigint;
    v_status text;
BEGIN
    -- lock the ticket so a chef cannot start cooking while we decide
    SELECT ticket_id, status INTO v_ticket, v_status
    FROM kitchen_ticket
    WHERE order_item_id = NEW.order_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NEW;                 -- draft item, no ticket yet
    END IF;

    IF v_status <> 'queued' THEN
        RAISE EXCEPTION 'Item % is already % in the kitchen and cannot be cancelled',
            NEW.order_item_id, v_status USING ERRCODE = 'KT003';
    END IF;

    DELETE FROM kitchen_ticket WHERE ticket_id = v_ticket;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_ticket_for_item ON order_item;
CREATE TRIGGER trg_cancel_ticket_for_item
    BEFORE UPDATE OF status ON order_item
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled')
    EXECUTE FUNCTION cancel_ticket_for_item();

-- ---------------------------------------------------------------------
-- 6. Status functions
-- ---------------------------------------------------------------------

-- Internal: moves one ALREADY LOCKED ticket exactly one step.
CREATE OR REPLACE FUNCTION kitchen_step_ticket(p_ticket_id bigint, p_new_status text, p_chef_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_cur text;
    v_ts  timestamptz := clock_timestamp();
BEGIN
    SELECT status INTO v_cur FROM kitchen_ticket WHERE ticket_id = p_ticket_id;

    IF kitchen_status_rank(p_new_status) IS DISTINCT FROM kitchen_status_rank(v_cur) + 1 THEN
        RAISE EXCEPTION 'Ticket % is "%" and cannot move to "%" (allowed order: queued, cooking, ready, served)',
            p_ticket_id, v_cur, p_new_status USING ERRCODE = 'KT001';
    END IF;

    UPDATE kitchen_ticket SET
        status       = p_new_status,
        updated_by   = p_chef_id,
        accepted_at  = CASE WHEN p_new_status = 'cooking' THEN v_ts      ELSE accepted_at END,
        accepted_by  = CASE WHEN p_new_status = 'cooking' THEN p_chef_id ELSE accepted_by END,
        started_at   = CASE WHEN p_new_status = 'cooking' THEN v_ts      ELSE started_at END,
        ready_at     = CASE WHEN p_new_status = 'ready'   THEN v_ts      ELSE ready_at END,
        ready_by     = CASE WHEN p_new_status = 'ready'   THEN p_chef_id ELSE ready_by END,
        completed_at = CASE WHEN p_new_status = 'ready'   THEN v_ts      ELSE completed_at END,
        served_at    = CASE WHEN p_new_status = 'served'  THEN v_ts      ELSE served_at END,
        served_by    = CASE WHEN p_new_status = 'served'  THEN p_chef_id ELSE served_by END
    WHERE ticket_id = p_ticket_id;
END;
$$;

-- One ticket, one step. Locks the row; a second chef waits, then fails the check.
CREATE OR REPLACE FUNCTION update_ticket_status(p_ticket_id bigint, p_new_status text, p_chef_id uuid)
RETURNS kitchen_ticket LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    t kitchen_ticket;
    v_order bigint;
BEGIN
    PERFORM kitchen_require_chef(p_chef_id);

    -- lock; in READ COMMITTED we get the latest committed version after any wait
    SELECT * INTO t FROM kitchen_ticket WHERE ticket_id = p_ticket_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
    END IF;

    SELECT order_id INTO v_order FROM order_item WHERE order_item_id = t.order_item_id;
    PERFORM kitchen_assert_order_workable(v_order);

    PERFORM kitchen_step_ticket(p_ticket_id, p_new_status, p_chef_id);

    SELECT * INTO t FROM kitchen_ticket WHERE ticket_id = p_ticket_id;
    RETURN t;
END;
$$;

-- Card buttons (screen 11): move every ticket of the order one step together.
-- Returns how many tickets moved. Tickets already at/after the target are skipped;
-- a ticket that is further behind makes the whole call fail (rolls back).
CREATE OR REPLACE FUNCTION advance_order_tickets(p_order_id bigint, p_new_status text, p_chef_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    r       record;
    v_new   integer := kitchen_status_rank(p_new_status);
    v_moved integer := 0;
BEGIN
    PERFORM kitchen_require_chef(p_chef_id);

    IF v_new IS NULL OR v_new = 1 THEN
        RAISE EXCEPTION 'Cannot advance tickets to "%"', p_new_status USING ERRCODE = 'KT001';
    END IF;

    PERFORM kitchen_assert_order_workable(p_order_id);

    -- lock in ticket_id order (same order every time, avoids deadlock between two chefs)
    FOR r IN
        SELECT kt.ticket_id, kt.status
        FROM kitchen_ticket kt
        JOIN order_item oi ON oi.order_item_id = kt.order_item_id
        WHERE oi.order_id = p_order_id
        ORDER BY kt.ticket_id
        FOR UPDATE OF kt
    LOOP
        IF kitchen_status_rank(r.status) >= v_new THEN
            CONTINUE;                                   -- already there or further
        ELSIF kitchen_status_rank(r.status) = v_new - 1 THEN
            PERFORM kitchen_step_ticket(r.ticket_id, p_new_status, p_chef_id);
            v_moved := v_moved + 1;
        ELSE
            RAISE EXCEPTION 'Ticket % is still "%" and cannot jump to "%"',
                r.ticket_id, r.status, p_new_status USING ERRCODE = 'KT001';
        END IF;
    END LOOP;

    IF v_moved = 0 THEN
        RAISE EXCEPTION 'Nothing to advance for order %: tickets are already "%" or beyond (or the order has no tickets)',
            p_order_id, p_new_status USING ERRCODE = 'KT001';
    END IF;

    RETURN v_moved;
END;
$$;

-- "Report issue" on screen 12
CREATE OR REPLACE FUNCTION report_ticket_issue(p_ticket_id bigint, p_note text, p_staff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM kitchen_require_chef(p_staff_id);
    UPDATE kitchen_ticket
       SET issue_note = p_note, updated_by = p_staff_id
     WHERE ticket_id = p_ticket_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. Trigger: all tickets served -> orders.status = 'served'
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_order_all_served()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_order bigint;
BEGIN
    SELECT order_id INTO v_order FROM order_item WHERE order_item_id = NEW.order_item_id;

    -- Lock the order first. If two chefs serve the last two tickets at the same
    -- moment, the second waits here and then sees the first one's committed change,
    -- so the order is never left stuck in in_kitchen.
    PERFORM 1 FROM orders WHERE order_id = v_order FOR UPDATE;

    IF NOT EXISTS (
        SELECT 1
        FROM kitchen_ticket kt
        JOIN order_item oi ON oi.order_item_id = kt.order_item_id
        WHERE oi.order_id = v_order
          AND oi.status <> 'cancelled'
          AND kt.status <> 'served'
    ) THEN
        UPDATE orders SET status = 'served'
         WHERE order_id = v_order AND status = 'in_kitchen';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_order_all_served ON kitchen_ticket;
CREATE TRIGGER trg_check_order_all_served
    AFTER UPDATE OF status ON kitchen_ticket
    FOR EACH ROW
    WHEN (NEW.status = 'served')
    EXECUTE FUNCTION check_order_all_served();

-- ---------------------------------------------------------------------
-- 8. Views
-- ---------------------------------------------------------------------

-- Screen 11: cards grouped by order, one card per (order, board column).
-- Station filter in the API:  WHERE :station_id = ANY(station_ids)
-- Timer colour: green < 10 min, amber 10-15, red > 15 (not shown for Done).
-- Table label is built as T-01 from table_id (change if restaurant_table has a label column).
CREATE OR REPLACE VIEW v_kitchen_board AS
SELECT
    b.*,
    CASE
        WHEN b.ticket_status = 'served' THEN NULL
        WHEN b.age_minutes < 10         THEN 'green'
        WHEN b.age_minutes <= 15        THEN 'amber'
        ELSE 'red'
    END AS timer_color
FROM (
    SELECT
        oi.order_id,
        kt.status                                   AS ticket_status,
        CASE kt.status
            WHEN 'queued'  THEN 'New'
            WHEN 'cooking' THEN 'Preparing'
            WHEN 'ready'   THEN 'Ready to serve'
            ELSE                'Done'
        END                                         AS board_column,
        o.table_id,
        'T-' || lpad(o.table_id::text, 2, '0')      AS table_label,
        o.guests,
        o.notes                                     AS order_notes,
        w.name                                      AS waiter_name,
        array_agg(DISTINCT kt.station_id)           AS station_ids,
        string_agg(DISTINCT s.s_name, ', ')         AS station_names,
        count(*)                                    AS ticket_count,
        sum(oi.quantity)                            AS item_count,
        min(kt.placed_at)                           AS placed_at,
        min(kt.due_by)                              AS due_by,
        floor(extract(epoch FROM (now() - min(kt.placed_at))) / 60)::integer AS age_minutes,
        bool_or(kt.issue_note IS NOT NULL)          AS has_issue,
        jsonb_agg(jsonb_build_object(
            'ticket_id',     kt.ticket_id,
            'order_item_id', kt.order_item_id,
            'item',          m.name,
            'quantity',      oi.quantity,
            'note',          kt.item_note,
            'station',       s.s_name,
            'status',        kt.status
        ) ORDER BY kt.ticket_id)                    AS items
    FROM kitchen_ticket kt
    JOIN order_item oi ON oi.order_item_id = kt.order_item_id
    JOIN orders     o  ON o.order_id       = oi.order_id
    JOIN menu_item  m  ON m.item_id        = oi.item_id
    JOIN station    s  ON s.station_id     = kt.station_id
    LEFT JOIN staff w  ON w.staff_id       = o.waiter_id
    WHERE kt.status <> 'served'
       OR kt.served_at >= now() - interval '1 hour'      -- Done in the last hour
    GROUP BY oi.order_id, kt.status, o.table_id, o.guests, o.notes, w.name
) b;

-- Screen 12: status history, one row per stage that has happened, with who and when
CREATE OR REPLACE VIEW v_ticket_history AS
SELECT
    kt.ticket_id,
    oi.order_id,
    kt.order_item_id,
    kt.due_by,
    h.stage_no,
    h.stage,
    h.happened_at,
    h.by_staff_id,
    st.name AS by_name
FROM kitchen_ticket kt
JOIN order_item oi ON oi.order_item_id = kt.order_item_id
CROSS JOIN LATERAL (VALUES
    (1, 'Placed',    kt.placed_at,  oi.added_by),
    (2, 'Accepted',  kt.accepted_at, kt.accepted_by),
    (3, 'Preparing', kt.started_at,  kt.accepted_by),
    (4, 'Ready',     kt.ready_at,    kt.ready_by),
    (5, 'Served',    kt.served_at,   kt.served_by)
) AS h(stage_no, stage, happened_at, by_staff_id)
LEFT JOIN staff st ON st.staff_id = h.by_staff_id
WHERE h.happened_at IS NOT NULL;

-- Screen 11 "Avg. prep time": started -> ready, per station, using window functions.
-- avg_prep_minutes = all time; recent_avg_prep_minutes = rolling last 20 tickets.
CREATE OR REPLACE VIEW v_station_prep_time AS
WITH done AS (
    SELECT
        kt.station_id,
        extract(epoch FROM (kt.ready_at - kt.started_at)) / 60.0 AS prep_min,
        avg(extract(epoch FROM (kt.ready_at - kt.started_at)) / 60.0)
            OVER (PARTITION BY kt.station_id)                                  AS avg_all,
        avg(extract(epoch FROM (kt.ready_at - kt.started_at)) / 60.0)
            OVER (PARTITION BY kt.station_id ORDER BY kt.ready_at
                  ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)                   AS avg_recent,
        count(*)     OVER (PARTITION BY kt.station_id)                         AS n,
        row_number() OVER (PARTITION BY kt.station_id ORDER BY kt.ready_at DESC) AS rn
    FROM kitchen_ticket kt
    WHERE kt.ready_at IS NOT NULL AND kt.started_at IS NOT NULL
)
SELECT
    s.station_id,
    s.s_name                                  AS station_name,
    round(d.avg_all::numeric, 1)              AS avg_prep_minutes,
    round(d.avg_recent::numeric, 1)           AS recent_avg_prep_minutes,
    COALESCE(d.n, 0)                          AS tickets_counted,
    COALESCE(s.target_prep_minutes, kitchen_setting_int('target_prep_minutes', 20)) AS target_minutes
FROM station s
LEFT JOIN done d ON d.station_id = s.station_id AND d.rn = 1;

-- Manager dashboard: items in progress (queued + cooking) against kitchen capacity.
-- Per-station rows plus one "All stations" row (ROLLUP). Capacity is kitchen-wide.
CREATE OR REPLACE VIEW v_kitchen_load AS
SELECT
    x.station_id,
    COALESCE(x.station_name, 'All stations')                  AS station_name,
    x.queued_items,
    x.cooking_items,
    x.ready_items,
    x.queued_items + x.cooking_items                          AS in_progress_items,
    kitchen_setting_int('kitchen_capacity', 20)               AS capacity,
    round(100.0 * (x.queued_items + x.cooking_items)
          / NULLIF(kitchen_setting_int('kitchen_capacity', 20), 0), 0) AS load_pct
FROM (
    SELECT
        s.station_id,
        s.s_name AS station_name,
        COALESCE(sum(oi.quantity) FILTER (WHERE kt.status = 'queued'),  0) AS queued_items,
        COALESCE(sum(oi.quantity) FILTER (WHERE kt.status = 'cooking'), 0) AS cooking_items,
        COALESCE(sum(oi.quantity) FILTER (WHERE kt.status = 'ready'),   0) AS ready_items
    FROM station s
    LEFT JOIN kitchen_ticket kt ON kt.station_id = s.station_id AND kt.status <> 'served'
    LEFT JOIN order_item oi     ON oi.order_item_id = kt.order_item_id
    GROUP BY ROLLUP ((s.station_id, s.s_name))
) x;
