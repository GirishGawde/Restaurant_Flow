# Phases and Progress

Two tracks run in parallel: the **database track** (SQL) and the **website track** (Flask and React). The website uses mock data until each module's API is ready, so nobody waits for the database.

Legend: [x] done, [ ] to do

## Phase 0: Setup (done)
- [x] Project idea, synopsis, requirement analysis document
- [x] Team plan document and module split
- [x] GitHub repo, `.gitignore`, folder structure
- [x] Supabase organisation and project
- [x] Figma wireframes: 20 screens + 3 state variants

## Phase 1: Database foundation (Weeks 1-3)
- [x] `01_admin_base.sql` (Girish): staff, restaurant_table, audit_log, app_setting
- [x] `02_stations.sql` (Diya, drafted by Girish)
- [x] `03_menu_admin.sql` (Girish): menu_item + seed data
- [ ] `04_orders_waiter.sql` (Ayush): orders, order_item
- [ ] `05_kitchen_tickets.sql` (Diya): kitchen_ticket
- [ ] `06_billing_cashier.sql` (Sakshi): bill, payment, promotion
- [ ] Each member tests their file on a personal test database before a pull request

## Phase 2: Website skeleton (Weeks 1-4, starts now, Girish)
- [ ] Flask app: `create_app`, config, `db.py` connection helper, error format
- [ ] Test route that reads `menu_item` (proves the connection)
- [ ] Auth: username login, role check, `@require_role`
- [ ] React app (Vite), router, `AuthContext`, `ProtectedRoute`
- [ ] Shared components and design tokens from Figma
- [ ] Mock mode (`VITE_USE_MOCKS=true`) so every screen can be built without the API
- [ ] Login screens 1, 2, 2.1, 3 with role-based redirect
- [ ] Share the skeleton with the team, then each person adds their own pages and routes

## Phase 3: Module logic and screens (Weeks 3-8, everyone, in parallel)
Each person, for their module:
- [ ] SQL functions, triggers and views (see module.md)
- [ ] Flask routes and services
- [ ] React screens, first with mocks, then connected to the real API
- Girish: screens 16-20, menu and staff management
- Ayush: screens 4-10
- Diya: screens 11-12
- Sakshi: screens 13, 14, 14.1, 15, 15.1

## Phase 4: Integration (Weeks 8-10)
- [ ] Run all SQL files in order on a fresh database
- [ ] Test every handoff in module.md (add item, send to kitchen, serve, bill, pay, table cleaned)
- [ ] Replace mocks with real API calls everywhere
- [ ] Fix mismatches in names, statuses and response shapes

## Phase 5: Security, audit and reports (Weeks 9-11, Girish)
- [ ] `07_security_rls.sql`: policies per role
- [ ] `08_audit.sql`: audit triggers on all tables, hash chain, `verify_audit_chain()`
- [ ] `09_reports.sql`: dashboard and report views
- [ ] Role checks verified in Flask as well (Flask's database connection bypasses RLS)

## Phase 6: Concurrency demos (Weeks 10-12, everyone)
- [ ] Each demo script runs two sessions with delays, before and after the fix
- [ ] Demo output saved for the report
- [ ] Two-waiter demo screen (Diya)

## Phase 7: Performance and testing (Weeks 13-14)
- [ ] `EXPLAIN ANALYZE` with and without indexes (Girish leads, everyone adds their queries)
- [ ] Full test with four roles on four browsers
- [ ] Bug fixing

## Phase 8: Documentation and demo (Weeks 15-16)
- [ ] Final report and diagrams
- [ ] Demo script and rehearsal
- [ ] Release tag `v1.0`, fresh-clone test following the README

## Weekly routine
- 15-minute sync: done, blocked, schema changes
- Pull the latest `dev` before each sync and run the SQL files on your personal test database
