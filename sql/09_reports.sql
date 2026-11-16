DROP VIEW IF EXISTS v_table_status CASCADE;
CREATE VIEW v_table_status AS
SELECT
    t.table_id,
    t.t_no                          AS table_number,
    t.section,
    t.capacity,
    t.status                        AS table_status,
    o.order_id                      AS active_order_id,
    o.guests                        AS guest_count,
    w.staff_id                      AS waiter_id,
    w.name                          AS waiter_name,
    o.created_at                    AS seated_since,
    CASE
        WHEN o.created_at IS NOT NULL
        THEN ROUND(EXTRACT(EPOCH FROM (now() - o.created_at)) / 60)::int
        ELSE 0
    END                             AS occupied_minutes
FROM restaurant_table t
LEFT JOIN orders o
    ON o.table_id = t.table_id
   AND o.status IN ('open', 'in_kitchen', 'served', 'bill_requested')
LEFT JOIN staff w
    ON w.staff_id = o.waiter_id

-- 2. v_active_orders
DROP VIEW IF EXISTS v_active_orders CASCADE;
CREATE VIEW v_active_orders AS
WITH ticket_agg AS (
    SELECT
        oi.order_id,
        COUNT(kt.ticket_id)                                      AS total_tickets,
        COUNT(kt.ticket_id) FILTER (WHERE kt.status = 'queued')  AS queued_count,
        COUNT(kt.ticket_id) FILTER (WHERE kt.status = 'cooking') AS cooking_count,
        COUNT(kt.ticket_id) FILTER (WHERE kt.status = 'ready')   AS ready_count,
        COUNT(kt.ticket_id) FILTER (WHERE kt.status = 'served')  AS served_count
    FROM order_item oi
    JOIN kitchen_ticket kt ON kt.order_item_id = oi.order_item_id
    WHERE oi.status != 'cancelled'
    GROUP BY oi.order_id
),
items_agg AS (
    SELECT
        order_id,
        COUNT(order_item_id)                                     AS item_count,
        COALESCE(SUM(quantity * unit_price), 0.00)               AS raw_total
    FROM order_item
    WHERE status != 'cancelled'
    GROUP BY order_id
)
SELECT
    o.order_id,
    o.table_id,
    t.t_no                                                       AS table_number,
    t.section,
    o.waiter_id,
    w.name                                                       AS waiter_name,
    o.guests,
    o.status                                                     AS raw_order_status,
    CASE
        WHEN o.status = 'bill_requested'                         THEN 'Bill requested'
        WHEN COALESCE(ta.total_tickets, 0) = 0                   THEN 'Open'
        WHEN ta.served_count = ta.total_tickets                  THEN 'Served'
        WHEN ta.ready_count > 0                                  THEN 'Ready'
        WHEN ta.cooking_count > 0                                THEN 'In kitchen'
        WHEN ta.queued_count > 0                                 THEN 'Queued'
        ELSE 'Open'
    END                                                          AS dashboard_status,
    COALESCE(ia.item_count, 0)                                   AS total_items,
    COALESCE(b.total_amount, ia.raw_total, 0.00)                 AS current_amount,
    COALESCE(b.status, 'unpaid')                                 AS bill_status,
    o.created_at,
    ROUND(EXTRACT(EPOCH FROM (now() - o.created_at)) / 60)::int    AS elapsed_minutes
FROM orders o
JOIN restaurant_table t ON t.table_id = o.table_id
LEFT JOIN staff w ON w.staff_id = o.waiter_id
LEFT JOIN ticket_agg ta ON ta.order_id = o.order_id
LEFT JOIN items_agg ia ON ia.order_id = o.order_id
LEFT JOIN bill b ON b.order_id = o.order_id
WHERE o.status IN ('open', 'in_kitchen', 'served', 'bill_requested');

-- 3. v_kitchen_load
DROP VIEW IF EXISTS v_kitchen_load CASCADE;
CREATE VIEW v_kitchen_load AS
WITH stats AS (
    SELECT
        COUNT(ticket_id) FILTER (WHERE status = 'queued')   AS queued_items,
        COUNT(ticket_id) FILTER (WHERE status = 'cooking')  AS cooking_items,
        COUNT(ticket_id) FILTER (WHERE status = 'ready')    AS ready_items
    FROM kitchen_ticket
    WHERE status IN ('queued', 'cooking', 'ready')
),
capacity_setting AS (
    SELECT COALESCE(
        (SELECT value::int FROM app_setting WHERE key = 'kitchen_capacity_items'),
        20
    ) AS capacity_limit
)
SELECT
    s.queued_items,
    s.cooking_items,
    s.ready_items,
    (s.queued_items + s.cooking_items)                      AS in_progress_items,
    c.capacity_limit                                        AS max_capacity,
    ROUND(
        ((s.queued_items + s.cooking_items)::numeric / NULLIF(c.capacity_limit, 0)) * 100.0,
        1
    )                                                       AS load_percentage,
    CASE
        WHEN (s.queued_items + s.cooking_items) > c.capacity_limit          THEN 'Overloaded'
        WHEN (s.queued_items + s.cooking_items) >= (c.capacity_limit * 0.8) THEN 'Busy'
        ELSE 'Normal'
    END                                                     AS load_status
FROM stats s
CROSS JOIN capacity_setting c;

-- 4. v_sales_by_day
DROP VIEW IF EXISTS v_sales_by_day CASCADE;
CREATE VIEW v_sales_by_day AS
SELECT
    date_trunc('day', b.created_at)::date                   AS sale_date,
    COUNT(DISTINCT b.order_id)                              AS total_orders,
    COALESCE(SUM(b.subtotal), 0.00)                         AS gross_sales,
    COALESCE(SUM(b.discount), 0.00)                         AS total_discounts,
    COALESCE(SUM(b.total_amount), 0.00)                     AS net_sales,
    ROUND(COALESCE(AVG(b.total_amount), 0.00), 2)           AS average_order_value,
    COUNT(p.payment_id) FILTER (WHERE p.method = 'cash')    AS cash_payments_count,
    COUNT(p.payment_id) FILTER (WHERE p.method = 'card')    AS card_payments_count,
    COUNT(p.payment_id) FILTER (WHERE p.method = 'upi')     AS upi_payments_count
FROM bill b
JOIN orders o ON o.order_id = b.order_id
LEFT JOIN payment p ON p.bill_id = b.bill_id
WHERE b.status = 'paid'
GROUP BY date_trunc('day', b.created_at)::date
ORDER BY sale_date DESC;

-- 5. v_best_sellers
DROP VIEW IF EXISTS v_best_sellers CASCADE;
CREATE VIEW v_best_sellers AS
SELECT
    m.item_id,
    m.name                                                  AS item_name,
    m.category,
    s.s_name                                                AS station_name,
    m.price                                                 AS current_unit_price,
    COALESCE(SUM(oi.quantity), 0)                           AS total_quantity_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00)        AS total_revenue,
    DENSE_RANK() OVER (
        ORDER BY COALESCE(SUM(oi.quantity), 0) DESC
    )                                                       AS rank_by_quantity,
    DENSE_RANK() OVER (
        ORDER BY COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) DESC
    )                                                       AS rank_by_revenue
FROM menu_item m
LEFT JOIN station s ON s.station_id = m.station_id
LEFT JOIN order_item oi ON oi.item_id = m.item_id AND oi.status != 'cancelled'
LEFT JOIN orders o ON o.order_id = oi.order_id AND o.status IN ('served', 'bill_requested', 'closed')
GROUP BY m.item_id, m.name, m.category, s.s_name, m.price
ORDER BY total_quantity_sold DESC;

-- 6. v_table_turnover
DROP VIEW IF EXISTS v_table_turnover CASCADE;
CREATE VIEW v_table_turnover AS
SELECT
    COALESCE(date_trunc('day', o.created_at)::date, CURRENT_DATE) AS report_date,
    t.section,
    t.t_no                                                        AS table_number,
    t.capacity,
    COUNT(o.order_id)                                             AS completed_turns,
    COALESCE(SUM(o.guests), 0)                                    AS total_guests_seated,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (COALESCE(o.closed_at, now()) - o.created_at)) / 60)::numeric,
        1
    )                                                             AS avg_turn_duration_minutes
FROM restaurant_table t
LEFT JOIN orders o
    ON o.table_id = t.table_id
   AND o.status = 'closed'
GROUP BY
    COALESCE(date_trunc('day', o.created_at)::date, CURRENT_DATE),
    t.section,
    t.t_no,
    t.capacity
ORDER BY report_date DESC, t.section, t.t_no;

-- 7. v_waiter_performance
DROP VIEW IF EXISTS v_waiter_performance CASCADE;
CREATE VIEW v_waiter_performance AS
SELECT
    st.staff_id,
    st.name                                                 AS waiter_name,
    st.username,
    COUNT(DISTINCT o.order_id)                              AS total_orders_handled,
    COALESCE(SUM(b.total_amount), 0.00)                     AS total_sales_generated,
    ROUND(COALESCE(AVG(b.total_amount), 0.00), 2)           AS avg_bill_amount,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (kt.served_at - kt.placed_at)) / 60
        )::numeric,
        1
    )                                                       AS avg_ticket_service_minutes
FROM staff st
JOIN orders o ON o.waiter_id = st.staff_id
LEFT JOIN bill b ON b.order_id = o.order_id AND b.status = 'paid'
LEFT JOIN order_item oi ON oi.order_id = o.order_id AND oi.status != 'cancelled'
LEFT JOIN kitchen_ticket kt ON kt.order_item_id = oi.order_item_id AND kt.status = 'served'
WHERE st.role = 'waiter'
GROUP BY st.staff_id, st.name, st.username
ORDER BY total_sales_generated DESC;

-- 8. v_order_history
DROP VIEW IF EXISTS v_order_history CASCADE;
CREATE VIEW v_order_history AS
SELECT
    a.log_id,
    CASE
        WHEN a.table_name = 'orders' THEN a.record_id::bigint
        WHEN a.table_name = 'order_item' THEN (COALESCE(a.new_value->>'order_id', a.old_value->>'order_id'))::bigint
        WHEN a.table_name = 'bill' THEN (COALESCE(a.new_value->>'order_id', a.old_value->>'order_id'))::bigint
        ELSE NULL
    END                                                     AS order_id,
    a.table_name,
    a.action,
    a.changed_at,
    to_char(a.changed_at, 'HH24:MI')                        AS formatted_time,
    to_char(a.changed_at, 'YYYY-MM-DD HH24:MI:SS')          AS full_timestamp,
    COALESCE(s.name, 'System')                              AS actor_name,
    s.role                                                  AS actor_role,
    CASE
        WHEN a.table_name = 'orders' AND a.action = 'INSERT'
            THEN 'Order opened for ' || COALESCE(a.new_value->>'guests', '1') || ' guests'
        WHEN a.table_name = 'orders' AND a.action = 'UPDATE' AND (a.new_value->>'status') IS DISTINCT FROM (a.old_value->>'status')
            THEN 'Order status changed to ' || (a.new_value->>'status')
        WHEN a.table_name = 'orders' AND a.action = 'UPDATE' AND (a.new_value->>'locked_by') IS NOT NULL AND (a.old_value->>'locked_by') IS NULL
            THEN 'Edit lock acquired by ' || COALESCE(s.name, 'waiter')

        WHEN a.table_name = 'order_item' AND a.action = 'INSERT'
            THEN 'Added ' || (a.new_value->>'quantity') || 'x item to order'
        WHEN a.table_name = 'order_item' AND (a.new_value->>'status') = 'cancelled'
            THEN 'Item cancelled from order'
        WHEN a.table_name = 'order_item' AND a.action = 'UPDATE' AND (a.new_value->>'quantity') IS DISTINCT FROM (a.old_value->>'quantity')
            THEN 'Item quantity updated to ' || (a.new_value->>'quantity')

        WHEN a.table_name = 'kitchen_ticket' AND a.action = 'UPDATE' AND (a.new_value->>'status') IS DISTINCT FROM (a.old_value->>'status')
            THEN 'Ticket status changed to ' || (a.new_value->>'status')

        WHEN a.table_name = 'bill' AND (a.new_value->>'discount')::numeric > 0 AND COALESCE((a.old_value->>'discount')::numeric, 0) = 0
            THEN 'Discount applied (saved $' || (a.new_value->>'discount') || ')'
        WHEN a.table_name = 'bill' AND (a.new_value->>'status') = 'paid'
            THEN 'Bill marked as paid (Total: $' || (a.new_value->>'total_amount') || ')'

        WHEN a.table_name = 'payment' AND a.action = 'INSERT'
            THEN 'Payment of $' || (a.new_value->>'amount') || ' received via ' || UPPER(COALESCE(a.new_value->>'method', 'cash'))

        ELSE initcap(a.action) || ' on ' || a.table_name
    END                                                     AS event_description,
    to_char(a.changed_at, 'HH24:MI') || ' – ' ||
    CASE
        WHEN a.table_name = 'bill' AND (a.new_value->>'discount')::numeric > 0 AND COALESCE((a.old_value->>'discount')::numeric, 0) = 0
            THEN 'Discount applied'
        WHEN a.table_name = 'order_item' AND a.action = 'INSERT'
            THEN 'Item added by ' || COALESCE(s.name, 'Staff')
        WHEN a.table_name = 'orders' AND (a.new_value->>'status') IS DISTINCT FROM (a.old_value->>'status')
            THEN 'Order ' || (a.new_value->>'status')
        ELSE initcap(a.action) || ' on ' || a.table_name || ' by ' || COALESCE(s.name, 'Staff')
    END                                                     AS history_line
FROM audit_log a
LEFT JOIN staff s ON s.staff_id = a.changed_by
ORDER BY a.log_id DESC;

-- 9. mv_sales_summary
DROP MATERIALIZED VIEW IF EXISTS mv_sales_summary CASCADE;
CREATE MATERIALIZED VIEW mv_sales_summary AS
SELECT
    CURRENT_DATE                                            AS summary_date,
    COALESCE(SUM(b.total_amount), 0.00)                     AS today_total_sales,
    COUNT(DISTINCT b.order_id)                              AS today_completed_orders,
    ROUND(COALESCE(AVG(b.total_amount), 0.00), 2)           AS today_avg_order_value,
    (SELECT COUNT(*) FROM restaurant_table WHERE status = 'occupied') AS active_tables_count,
    (SELECT COUNT(*) FROM restaurant_table WHERE status = 'free')     AS available_tables_count,
    (SELECT COUNT(*) FROM orders WHERE status IN ('open', 'in_kitchen', 'served', 'bill_requested')) AS active_orders_count,
    now()                                                   AS last_refreshed_at
FROM bill b
WHERE b.status = 'paid'
  AND date_trunc('day', b.created_at) = CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sales_summary_date ON mv_sales_summary (summary_date);

-- 10. refresh_sales_summary
CREATE OR REPLACE FUNCTION refresh_sales_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_summary;
EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW mv_sales_summary;
END;
$$;
