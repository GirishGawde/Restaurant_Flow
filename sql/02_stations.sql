-- 02_stations.sql
-- Owner   : Diya
-- Purpose : Kitchen stations. menu_item (03) and kitchen_ticket (05)
--           both point to this table.
-- Depends : Nothing

CREATE TABLE IF NOT EXISTS station (
    station_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    s_name               text NOT NULL UNIQUE,
    is_active            boolean NOT NULL DEFAULT true,
    display_order        int NOT NULL DEFAULT 0,         -- order of the station filter on the kitchen screen
    target_prep_minutes  int CHECK (target_prep_minutes > 0)  -- optional per-station target
);

-- Same lock-down as the other tables: RLS on, policies come in 07_security_rls.sql
ALTER TABLE station ENABLE ROW LEVEL SECURITY;

-- Seed: the station list from Figma screen 12 (Grill, Cold, Oven, Bar).
-- Screen 17 shows a different list; the team must agree one (Section 14).
-- If the list changes, edit this file and re-run on a fresh test database.
INSERT INTO station (s_name, display_order) VALUES
    ('Grill', 1),
    ('Cold',  2),
    ('Oven',  3),
    ('Bar',   4)
ON CONFLICT (s_name) DO NOTHING;

-- QUICK CHECKS (run one at a time)

-- SELECT * FROM station ORDER BY display_order;   -- expect 4 rows
-- INSERT INTO station (s_name) VALUES ('Grill');  -- should FAIL (duplicate)