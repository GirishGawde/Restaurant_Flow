-- 03_menu_admin.sql
-- Owner   : Girish
-- Purpose : Menu items (screens 6 and 17). Each item points to the
--           kitchen station that prepares it.
-- Depends : 02_stations.sql 

CREATE TABLE IF NOT EXISTS menu_item (
    item_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         text NOT NULL UNIQUE,
    category     text NOT NULL
                 CHECK (category IN ('Starters', 'Mains', 'Sides', 'Drinks', 'Desserts')),
    description  text,                                  -- ingredients text, searched on screen 6
    price        numeric(10,2) NOT NULL CHECK (price >= 0),   -- prices include tax
    status       text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'sold_out', 'inactive')),
    station_id   bigint NOT NULL REFERENCES station (station_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_station  ON menu_item (station_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_category ON menu_item (category);

ALTER TABLE menu_item ENABLE ROW LEVEL SECURITY;

INSERT INTO menu_item (name, category, description, price, status, station_id)
SELECT v.name, v.category, v.description, v.price, v.status, s.station_id
FROM (VALUES
    ('Bruschetta',        'Starters', 'Toasted bread, tomato, basil, garlic',          8.50, 'active',   'Cold'),
    ('Caesar Salad',      'Starters', 'Romaine, parmesan, croutons, caesar dressing',  9.50, 'active',   'Cold'),
    ('Chicken Wings',     'Starters', 'Chicken wings, hot sauce, celery',             11.00, 'active',   'Grill'),
    ('Tomato Soup',       'Starters', 'Tomato, cream, basil',                          7.00, 'inactive', 'Oven'),
    ('Grilled Salmon',    'Mains',    'Atlantic salmon, herbs, lemon butter',         24.00, 'active',   'Grill'),
    ('Classic Burger',    'Mains',    'Beef patty, cheese, lettuce, tomato, bun',     15.00, 'active',   'Grill'),
    ('Pasta Carbonara',   'Mains',    'Spaghetti, egg, pancetta, parmesan',           16.00, 'active',   'Oven'),
    ('Margherita Pizza',  'Mains',    'Tomato, mozzarella, basil',                    14.00, 'active',   'Oven'),
    ('Garlic Bread',      'Sides',    'Baguette, garlic butter, parsley',              5.50, 'active',   'Oven'),
    ('Fries',             'Sides',    'Potato, salt',                                  4.50, 'active',   'Grill'),
    ('Lemonade',          'Drinks',   'Lemon, sugar, water, mint',                     4.00, 'active',   'Bar'),
    ('Sparkling Water',   'Drinks',   'Sparkling mineral water',                       3.00, 'active',   'Bar'),
    ('Lava Cake',         'Desserts', 'Chocolate, butter, egg, flour',                 8.00, 'active',   'Oven'),
    ('Cheesecake',        'Desserts', 'Cream cheese, biscuit base, berry sauce',       7.50, 'sold_out', 'Cold')
) AS v(name, category, description, price, status, station_name)
JOIN station s ON s.s_name = v.station_name
ON CONFLICT (name) DO NOTHING;

-- QUICK CHECKS 
-- SELECT m.name, m.category, m.price, m.status, s.s_name AS station
--   FROM menu_item m JOIN station s USING (station_id) ORDER BY m.category, m.name;   -- 14 rows
-- SELECT status, count(*) FROM menu_item GROUP BY status;     -- active 12, inactive 1, sold_out 1
-- INSERT INTO menu_item (name, category, price, station_id)
--   VALUES ('Test', 'Starters', -5, 1);                        -- should FAIL (negative price)
-- INSERT INTO menu_item (name, category, price, station_id)
--   VALUES ('Test2', 'Starters', 5, 9999);                     -- should FAIL (no such station)
