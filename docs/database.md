# Database: Shared Agreements

Each member designs their own tables (columns, types, constraints, indexes) inside their own SQL file. This file lists only what must be agreed so the tables fit together. Do not change anything here without telling the team.

## Tables, owners and files
| Table | Owner | File |
|---|---|---|
| staff, restaurant_table, audit_log, app_setting | Girish | `01_admin_base.sql` |
| station | Diya | `02_stations.sql` |
| menu_item | Girish | `03_menu_admin.sql` |
| orders, order_item | Ayush | `04_orders_waiter.sql` |
| kitchen_ticket | Diya | `05_kitchen_tickets.sql` |
| bill, payment, promotion | Sakshi | `06_billing_cashier.sql` |
| RLS policies / audit triggers / report views | Girish | `07`, `08`, `09` |

Run order: 01 and 02 (either order), then 03, then 04, then 05 and 06, then 07, 08, 09.

**Status:** 01, 02 and 03 are done and live on the shared project.

## Shared keys (must match exactly)
Primary keys are named `<table>_id` and are `bigint` identity, except `staff_id`, a `uuid` equal to the Supabase Auth user id.

| Table | Primary key | Foreign keys |
|---|---|---|
| staff | staff_id (uuid) | none |
| restaurant_table | table_id | none |
| station | station_id | none |
| menu_item | item_id | station_id |
| orders | order_id | table_id, waiter_id (staff_id) |
| order_item | order_item_id | order_id, item_id, added_by (staff_id) |
| kitchen_ticket | ticket_id | order_item_id (unique), station_id, updated_by (staff_id) |
| bill | bill_id | order_id (unique), promo_id (optional) |
| payment | payment_id | bill_id, received_by (staff_id) |
| promotion | promo_id | none |
| audit_log | log_id | changed_by (staff_id) |

## Columns other modules rely on
You may add columns, but do not rename or remove these without telling the people who use them.

| Column | Owner | Used by |
|---|---|---|
| staff.role, username, name | Girish | Everyone |
| restaurant_table.section, capacity, status | Girish | Ayush, Sakshi, dashboard |
| menu_item.price, status, category, description, station_id | Girish | Ayush, Diya |
| orders.status, version, guests, table_id, notes | Ayush | Diya, Sakshi, dashboard |
| order_item.quantity, unit_price, status, notes | Ayush | Diya, Sakshi |
| kitchen_ticket.status | Diya | Ayush, dashboard |
| bill.subtotal, discount, total_amount, status | Sakshi | Ayush, dashboard |
| promotion.code, kind, value | Sakshi | Ayush |

## Allowed status values and who changes them
| Column | Values | Changed by |
|---|---|---|
| restaurant_table.status | free, occupied, reserved, needs_cleaning | Ayush sets occupied and free (mark clean); Sakshi's trigger sets needs_cleaning; admin sets reserved |
| orders.status | open, in_kitchen, served, bill_requested, closed, cancelled | Ayush: open, in_kitchen, bill_requested, cancelled. Diya's trigger: served. Sakshi's trigger: closed |
| order_item.status | draft, sent, cancelled | Ayush only |
| menu_item.status | active, sold_out, inactive | Girish (admin screen 17) |
| kitchen_ticket.status | queued, cooking, ready, served | Diya's functions only, one step at a time |
| bill.status | unpaid, partially_paid, paid | Sakshi's payment functions only |

Screen labels for tickets: New, Preparing, Ready to serve, Done.

## Naming and type rules
- lowercase `snake_case` for tables and columns; the table `orders` is plural because `order` is a reserved word
- money: `numeric(10,2)`; timestamps: `timestamptz` default `now()`
- status columns: `text` with a `CHECK` using exactly the values above
- every foreign key has `REFERENCES` and an explicit `ON DELETE` rule (`RESTRICT` unless there is a reason)
- each SQL file starts with a comment block: owner, purpose, depends on
- use `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING` so files can be re-run
- every table has `ENABLE ROW LEVEL SECURITY`; policies come in `07_security_rls.sql`

## Rules for SQL files
- The files in `sql/` are the source of truth. The shared database must be reproducible by running them in order.
- Never change tables directly in the Supabase dashboard.
- Test in your own personal Supabase project (or local PostgreSQL) first. Only merged files are run on the shared project.
- Never edit a file already run on the shared database. Add a new numbered file instead (for example `10_fix_orders_add_notes.sql`).
- Seed data should use lookups (join by name) rather than hard-coded ids.

## Important notes
- `current_staff_role()` is used instead of `current_role()`, because `CURRENT_ROLE` is a reserved word in PostgreSQL.
- Flask connects with the database connection string, which bypasses RLS. Flask must also check roles.
- Prices include tax. There is no tax column.
