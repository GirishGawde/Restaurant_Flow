# Modules and Ownership

The project is divided into **four modules, one per person**. Each owner is responsible for the database objects, API routes, screens and demos of their module. Only the owner changes the structure of their tables; others ask through a GitHub issue.

Module order of dependency: Module 1 (base) and Module 3 stations feed Module 2, which feeds Modules 3 tickets and 4.

---

## Module 1: Admin, Login and Security (Girish)

**Responsibility:** the shared foundation, who can log in and see what, the audit trail, manager reports, and the project skeleton everyone plugs into.

| Item | Detail |
|---|---|
| Tables | `staff`, `restaurant_table`, `menu_item`, `audit_log`, `app_setting` |
| SQL files | `01_admin_base.sql`, `03_menu_admin.sql`, `07_security_rls.sql`, `08_audit.sql`, `09_reports.sql` |
| DB logic | `current_staff_role()`, Row Level Security policies per role, `audit_trigger_fn()` with hash chain, `verify_audit_chain()` |
| Views | `v_table_status`, `v_active_orders`, `v_order_history`, `v_sales_by_day`, `v_best_sellers`, `v_table_turnover`, `v_waiter_performance` |
| API | `/auth/*`, `/staff`, `/menu-items`, `/dashboard`, `/reports/*`, `/audit-log/*`, `/orders/<id>/history` |
| Screens | 1 Login, 2 Forgot password, 2.1 Reset password, 3 Profile, 16 Dashboard, 17 Menu management, 18 Staff management, 19 Reports, 20 Audit log |
| Shared work | Flask app skeleton, DB connection helper, React app shell, auth context, shared UI components, API client |
| Demos | Phantom read (`SERIALIZABLE` fix), audit tamper detection, `EXPLAIN ANALYZE` index comparison |
| Done when | Each role logs in and sees only what it should; audit log records other modules' changes and the chain verifies; report views return correct numbers |

---

## Module 2: Waiter and Orders (Ayush)

**Responsibility:** the order lifecycle from opening a table to requesting the bill, and the main concurrency story: two waiters editing one order.

| Item | Detail |
|---|---|
| Tables | `orders`, `order_item` |
| SQL file | `04_orders_waiter.sql` |
| DB logic | `open_order`, `add_order_item` (version check), `add_order_item_locked` (`FOR UPDATE`, 30 s timeout), `update_order_item_qty`, `remove_order_item`, `send_to_kitchen`, `request_bill`, `cancel_order`, `mark_table_clean`, `merge_orders` |
| Views | `v_table_map`, `v_my_orders` |
| API | `/tables`, `/orders`, `/orders/<id>/items`, `/orders/<id>/send-to-kitchen`, `/orders/<id>/lock`, `/orders/<id>/request-bill`, `/menu` |
| Screens | 4 Table map, 5 Open order, 6 Menu browser, 7 Order panel, 8 Conflict and lock wait, 9 Apply discount (UI only, function is Sakshi's), 10 My orders |
| Demos | Lost update, non-repeatable read, deadlock with lock-ordering fix |
| Done when | A waiter can open, edit, send, request a bill for and cancel an order; two browsers on one order never lose an update and the second sees the conflict dialog |

---

## Module 3: Kitchen (Diya)

**Responsibility:** kitchen stations and everything from an item being sent to the kitchen until it is served.

| Item | Detail |
|---|---|
| Tables | `station`, `kitchen_ticket` |
| SQL files | `02_stations.sql`, `05_kitchen_tickets.sql` |
| DB logic | `create_ticket_for_item` (on draft to sent), `cancel_ticket_for_item`, `update_ticket_status`, `advance_order_tickets`, `check_order_all_served` |
| Views | `v_kitchen_board`, `v_ticket_history`, `v_station_prep_time`, `v_kitchen_load` |
| API | `/stations`, `/kitchen/board`, `/kitchen/orders/<id>/ticket`, `/kitchen/orders/<id>/advance`, `/kitchen/tickets/<id>/status`, `/kitchen/tickets/<id>/issue`, `/kitchen/stats` |
| Screens | 11 Kitchen display, 12 Ticket detail, plus the two-waiter concurrency demo screen (not in Figma yet) |
| Demos | Dirty read, two chefs on one ticket, whole-card update versus single-item update |
| Done when | Sending items creates tickets at the right station; illegal status jumps are rejected by the database; serving the last ticket marks the order served automatically |

Note: station `02_stations.sql` was drafted by Girish to unblock the menu. Diya owns it and may change it, keeping the table name `station` and key `station_id`.

---

## Module 4: Cashier and Billing (Sakshi)

**Responsibility:** money: bills, promotions, payments, split payments, closing the order, and preventing double payment.

| Item | Detail |
|---|---|
| Tables | `bill`, `payment`, `promotion` |
| SQL file | `06_billing_cashier.sql` |
| DB logic | `create_bill_for_order`, `recalc_bill`, `apply_promotion`, `remove_promotion`, `record_payment`, `confirm_split_payment`, `close_order_on_paid` |
| Views | `v_bill_detail`, `v_receipt`, `v_daily_cash_summary` |
| API | `/bills/open`, `/bills/<order_id>`, `/bills/<id>/promotion`, `/bills/<id>/payments`, `/bills/<id>/split-payments`, `/bills/<id>/receipt`, `/promotions/<code>/check`, `/cashier/summary` |
| Screens | 13 Bill and payment, 14 Split bill, 14.1 Split mismatch, 15 Payment confirmation, 15.1 Bill already closed |
| Demos | Double close, same under `SERIALIZABLE` with retry, discount-versus-new-item race |
| Done when | Bill totals always match order items; a bill can never be paid twice or overpaid; paying in full closes the order and marks the table needs_cleaning |

---

## Handoffs between modules

| From | To | What happens |
|---|---|---|
| Diya | Girish | `station` exists before `menu_item`; screen 17 lists stations from Diya's API |
| Ayush | Diya | `send_to_kitchen` changes items to sent; Diya's trigger creates tickets |
| Ayush | Sakshi | Opening an order creates its bill; item changes recalculate it |
| Diya | Ayush | When all tickets are served the order becomes served; only then can the bill be requested |
| Diya | Sakshi | Bill items show the time each item was served |
| Sakshi | Ayush | Paying in full closes the order; the table becomes needs_cleaning until a waiter marks it clean |
| Girish | Ayush, Sakshi | `v_order_history` supplies the history lines on screens 7 and 13 |
| Sakshi | Girish | A rejected duplicate payment is written to the audit log |
| Diya | Girish | Kitchen load feeds the dashboard |
