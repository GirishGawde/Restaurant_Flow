CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper to extract record id from row JSON
CREATE OR REPLACE FUNCTION get_json_record_id(p_table_name text, p_row jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_row IS NULL THEN
        RETURN '0';
    END IF;

    RETURN CASE p_table_name
        WHEN 'staff'            THEN COALESCE(p_row->>'staff_id', '0')
        WHEN 'restaurant_table' THEN COALESCE(p_row->>'table_id', '0')
        WHEN 'station'          THEN COALESCE(p_row->>'station_id', '0')
        WHEN 'menu_item'        THEN COALESCE(p_row->>'item_id', '0')
        WHEN 'orders'           THEN COALESCE(p_row->>'order_id', '0')
        WHEN 'order_item'       THEN COALESCE(p_row->>'order_item_id', '0')
        WHEN 'kitchen_ticket'   THEN COALESCE(p_row->>'ticket_id', '0')
        WHEN 'promotion'        THEN COALESCE(p_row->>'promo_id', '0')
        WHEN 'bill'             THEN COALESCE(p_row->>'bill_id', '0')
        WHEN 'payment'          THEN COALESCE(p_row->>'payment_id', '0')
        WHEN 'app_setting'      THEN COALESCE(p_row->>'key', '0')
        ELSE COALESCE(p_row->>'id', '0')
    END;
END;
$$;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_val       jsonb := NULL;
    v_new_val       jsonb := NULL;
    v_record_id     text;
    v_changed_by    uuid;
    v_changed_at    timestamptz := clock_timestamp();
    v_prev_hash     text := NULL;
    v_calculated    text;
    v_hash_payload  text;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old_val   := to_jsonb(OLD);
        v_record_id := get_json_record_id(TG_TABLE_NAME, v_old_val);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_val   := to_jsonb(OLD);
        v_new_val   := to_jsonb(NEW);
        v_record_id := get_json_record_id(TG_TABLE_NAME, v_new_val);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_val   := to_jsonb(NEW);
        v_record_id := get_json_record_id(TG_TABLE_NAME, v_new_val);
    END IF;

    v_changed_by := auth.uid();
    IF v_changed_by IS NULL AND v_new_val IS NOT NULL THEN
        v_changed_by := COALESCE(
            (v_new_val->>'waiter_id')::uuid,
            (v_new_val->>'added_by')::uuid,
            (v_new_val->>'updated_by')::uuid,
            (v_new_val->>'received_by')::uuid,
            (v_new_val->>'staff_id')::uuid
        );
    END IF;

    SELECT hash INTO v_prev_hash
    FROM audit_log
    ORDER BY log_id DESC
    LIMIT 1;

    v_hash_payload := COALESCE(v_prev_hash, 'GENESIS') || '|' ||
                      TG_TABLE_NAME                    || '|' ||
                      v_record_id                      || '|' ||
                      TG_OP                            || '|' ||
                      COALESCE(v_new_val::text, '')    || '|' ||
                      COALESCE(v_old_val::text, '')    || '|' ||
                      v_changed_at::text;

    v_calculated := encode(digest(v_hash_payload, 'sha256'), 'hex');

    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changed_by,
        changed_at,
        prev_hash,
        hash
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_val,
        v_new_val,
        v_changed_by,
        v_changed_at,
        v_prev_hash,
        v_calculated
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS trg_audit_staff ON staff;
CREATE TRIGGER trg_audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_restaurant_table ON restaurant_table;
CREATE TRIGGER trg_audit_restaurant_table
    AFTER INSERT OR UPDATE OR DELETE ON restaurant_table
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_menu_item ON menu_item;
CREATE TRIGGER trg_audit_menu_item
    AFTER INSERT OR UPDATE OR DELETE ON menu_item
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_order_item ON order_item;
CREATE TRIGGER trg_audit_order_item
    AFTER INSERT OR UPDATE OR DELETE ON order_item
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_kitchen_ticket ON kitchen_ticket;
CREATE TRIGGER trg_audit_kitchen_ticket
    AFTER INSERT OR UPDATE OR DELETE ON kitchen_ticket
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_promotion ON promotion;
CREATE TRIGGER trg_audit_promotion
    AFTER INSERT OR UPDATE OR DELETE ON promotion
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_bill ON bill;
CREATE TRIGGER trg_audit_bill
    AFTER INSERT OR UPDATE OR DELETE ON bill
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_payment ON payment;
CREATE TRIGGER trg_audit_payment
    AFTER INSERT OR UPDATE OR DELETE ON payment
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Verification function
CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS TABLE (
    is_valid       boolean,
    broken_log_id  bigint,
    total_checked  bigint,
    error_message  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r               RECORD;
    v_expected_prev text := NULL;
    v_recomputed    text;
    v_count         bigint := 0;
    v_hash_payload  text;
BEGIN
    FOR r IN
        SELECT log_id, table_name, record_id, action,
               old_value, new_value, changed_at, prev_hash, hash
        FROM audit_log
        ORDER BY log_id ASC
    LOOP
        v_count := v_count + 1;

        IF r.prev_hash IS DISTINCT FROM v_expected_prev THEN
            RETURN QUERY SELECT
                false,
                r.log_id,
                v_count,
                'Previous hash mismatch at log_id ' || r.log_id;
            RETURN;
        END IF;

        v_hash_payload := COALESCE(r.prev_hash, 'GENESIS') || '|' ||
                          r.table_name                     || '|' ||
                          r.record_id                      || '|' ||
                          r.action                         || '|' ||
                          COALESCE(r.new_value::text, '')  || '|' ||
                          COALESCE(r.old_value::text, '')  || '|' ||
                          r.changed_at::text;

        v_recomputed := encode(digest(v_hash_payload, 'sha256'), 'hex');

        IF r.hash <> v_recomputed THEN
            RETURN QUERY SELECT
                false,
                r.log_id,
                v_count,
                'Content tampering detected at log_id ' || r.log_id;
            RETURN;
        END IF;

        v_expected_prev := r.hash;
    END LOOP;

    RETURN QUERY SELECT
        true,
        NULL::bigint,
        v_count,
        'Audit chain verified. ' || v_count || ' rows checked.'::text;
    RETURN;
END;
$$;

-- Manual audit entry helper
CREATE OR REPLACE FUNCTION log_manual_audit_event(
    p_table_name text,
    p_record_id  text,
    p_action     text,
    p_old_value  jsonb,
    p_new_value  jsonb,
    p_changed_by uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prev_hash    text := NULL;
    v_changed_at   timestamptz := clock_timestamp();
    v_hash_payload text;
    v_hash         text;
    v_new_log_id   bigint;
BEGIN
    SELECT hash INTO v_prev_hash
    FROM audit_log
    ORDER BY log_id DESC
    LIMIT 1;

    v_hash_payload := COALESCE(v_prev_hash, 'GENESIS') || '|' ||
                      p_table_name                     || '|' ||
                      p_record_id                      || '|' ||
                      p_action                         || '|' ||
                      COALESCE(p_new_value::text, '')  || '|' ||
                      COALESCE(p_old_value::text, '')  || '|' ||
                      v_changed_at::text;

    v_hash := encode(digest(v_hash_payload, 'sha256'), 'hex');

    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changed_by,
        changed_at,
        prev_hash,
        hash
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_old_value,
        p_new_value,
        p_changed_by,
        v_changed_at,
        v_prev_hash,
        v_hash
    )
    RETURNING log_id INTO v_new_log_id;

    RETURN v_new_log_id;
END;
$$;
