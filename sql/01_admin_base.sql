-- Owner   : Girish
-- Purpose : Base tables everyone depends on: staff, restaurant_table,
--           audit_log, app_setting. Plus a role helper function.
-- Depends : Nothing (needs Supabase Auth, which already exists)
-- station and menu_item are NOT here. station is Diya's
-- (02_stations.sql) and menu_item is my (03_menu_admin.sql).
-- =====================================================================

-- 1. staff  (one row per login account; staff_id = Supabase Auth user id)
CREATE TABLE IF NOT EXISTS staff (
    staff_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    username   text NOT NULL UNIQUE,            -- screen 1 logs in with a username
    name       text NOT NULL,
    email      text NOT NULL UNIQUE,
    phone      text,
    role       text NOT NULL
               CHECK (role IN ('admin', 'waiter', 'chef', 'cashier')),
    is_active  boolean NOT NULL DEFAULT true    
);

-- 2. restaurant_table
CREATE TABLE IF NOT EXISTS restaurant_table (
    table_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    t_no      int  NOT NULL UNIQUE,             
    section   text NOT NULL
              CHECK (section IN ('Main Hall', 'Terrace', 'Private Room', 'Bar')),
    capacity  int  NOT NULL CHECK (capacity > 0),
    status    text NOT NULL DEFAULT 'free'
              CHECK (status IN ('free', 'occupied', 'reserved', 'needs_cleaning'))
);

-- 3. audit_log  (rows are written by the audit trigger in 08_audit.sql;
--                prev_hash / hash are filled there too)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  text NOT NULL,
    record_id   text NOT NULL,                  -- primary key value of changed row
    action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_value   jsonb,                          -- NULL for INSERT
    new_value   jsonb,                          -- NULL for DELETE
    changed_by  uuid REFERENCES staff (staff_id),
    changed_at  timestamptz NOT NULL DEFAULT now(),
    prev_hash   text,                           -- NULL only for the first row
    hash        text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log (table_name, record_id);

-- 4. app_setting  (small key/value table for shared settings)
CREATE TABLE IF NOT EXISTS app_setting (
    key          text PRIMARY KEY,
    value        text NOT NULL,
    description  text
);

-- 5. Helper: role of the logged-in user.
--    (Named current_staff_role because CURRENT_ROLE is a reserved word.)
CREATE OR REPLACE FUNCTION current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM staff WHERE staff_id = auth.uid() AND is_active;
$$;

-- 6. Lock the tables down for the public API.
--    RLS on + no policies = the anon key cannot read or write anything.
--    Real policies are written later in 07_security_rls.sql.
--    (Flask connects with the database connection string, which
--     bypasses RLS, so Flask must also check roles itself.)
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_table  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_setting       ENABLE ROW LEVEL SECURITY;

-- SEED DATA

-- Settings (values come from the Figma: kitchen capacity 20 items,
-- target prep time; agree the final target with the team, see Section 14)
INSERT INTO app_setting (key, value, description) VALUES
    ('kitchen_capacity_items', '20', 'Items the kitchen can handle at once (dashboard kitchen load)'),
    ('target_prep_minutes',    '20', 'Target time from order sent to ready'),
    ('currency_symbol',        '$',  'Currency shown on bills and reports')
ON CONFLICT (key) DO NOTHING;

-- 18 tables: 12 Main Hall, 3 Terrace, 1 Private Room, 2 Bar (adjust to match Figma)
INSERT INTO restaurant_table (t_no, section, capacity) VALUES
    (1,  'Main Hall', 4), (2,  'Main Hall', 2), (3,  'Main Hall', 4), (4,  'Main Hall', 4),
    (5,  'Main Hall', 6), (6,  'Main Hall', 2), (7,  'Main Hall', 4), (8,  'Main Hall', 4),
    (9,  'Main Hall', 6), (10, 'Main Hall', 4), (11, 'Main Hall', 2), (12, 'Main Hall', 4),
    (13, 'Terrace',   4), (14, 'Terrace',   4), (15, 'Terrace',   2),
    (16, 'Private Room', 8),
    (17, 'Bar', 2), (18, 'Bar', 2)
ON CONFLICT (t_no) DO NOTHING;

-- Staff seed: do this AFTER creating the login users.
--   Dashboard -> Authentication -> Users -> Add user -> Create new user
--   (tick "Auto Confirm User"). Create these emails with any password:
--     jlee@resto.test, asmith@resto.test, mchen@resto.test,
--     krao@resto.test, mrossi@resto.test
--   Then run the block below. Names are placeholders until the team
--   settles the staff names in Figma (Section 14).
INSERT INTO staff (staff_id, username, name, email, role)
SELECT id, v.username, v.name, u.email, v.role
FROM (VALUES
    ('jlee@resto.test',   'jlee',   'J. Lee',   'admin'),
    ('asmith@resto.test', 'asmith', 'A. Smith', 'waiter'),
    ('mchen@resto.test',  'mchen',  'M. Chen',  'waiter'),
    ('krao@resto.test',   'krao',   'K. Rao',   'chef'),
    ('mrossi@resto.test', 'mrossi', 'M. Rossi', 'cashier')
) AS v(email, username, name, role)
JOIN auth.users u ON u.email = v.email
ON CONFLICT (staff_id) DO NOTHING;

