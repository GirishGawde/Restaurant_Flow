# Project Overview

## 1. Title
Restaurant Table & Kitchen Order Flow Simulator: A Concurrency-Driven Order Management System

## 2. Introduction
A dine-in restaurant has several waiters working on shared tables while the kitchen prepares items across stations at the same time. This project manages the whole flow, from table assignment and order-taking, through kitchen tickets, to billing and payment. It is intended for waiters, kitchen staff, cashiers and managers.

## 3. Problem Statement
Manual or simple systems cannot handle simultaneous access safely. This leads to:
- **Lost update:** one waiter's added item is silently overwritten by another.
- **Dirty read:** the kitchen cooks an item that was never confirmed.
- **Non-repeatable read:** a discount is calculated on an outdated total.
- **Double close:** two staff members both bill and close the same order.

These problems are solved at the database level, not only with application checks.

## 4. Objectives
1. Design a normalised relational schema for tables, orders, kitchen tickets, bills and payments.
2. Let waiters create, edit and close orders in real time.
3. Implement concurrency control (locking, optimistic versioning, isolation levels) so simultaneous edits never corrupt data.
4. Provide a kitchen ticket workflow that routes items to stations and tracks preparation.
5. Provide secure role-based access for Admin, Waiter, Chef and Cashier.
6. Provide sales, performance and audit reports for managers.

## 5. Scope

**In scope**
- Single restaurant branch: tables, orders, kitchen, billing, payments (simulated)
- Concurrent editing of one order by several waiters, with conflict handling
- Kitchen board with stations and ticket history
- Split bills, promotions (one per order), receipts
- Manager dashboard, reports, hash-chained audit log

**Out of scope**
- Multiple branches or franchises
- Online delivery or third-party integrations
- Inventory and supplier management
- Real payment gateways (payments are simulated)
- Email sending (the email receipt is simulated)

## 6. User Roles
| Role | Can do |
|---|---|
| Admin / Manager | Manage staff and menu, view dashboard, reports, audit log |
| Waiter | Open and edit orders, send to kitchen, request bill, apply promotion |
| Chef / Kitchen | See tickets by station, move tickets through statuses, report issues |
| Cashier | Open bills, take payment, split bills, print receipts |

## 7. Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) | Calls the Flask API |
| Backend | Python Flask + psycopg2 | Controls transactions and isolation levels |
| Database | Supabase (PostgreSQL) | One shared project; SQL Editor for scripts |
| Auth | Supabase Auth | Login by username mapped to the staff email |
| Version control | GitHub | One repository, four collaborators |

The Supabase JavaScript client cannot run multi-statement transactions or set an isolation level. Anything concurrency-sensitive lives in PostgreSQL functions or in Flask with psycopg2, never directly in React.

## 8. Architecture
```
 React (browser)
      |  HTTPS, JSON, Bearer token
      v
 Flask API  (routes per module, role checks)
      |  psycopg2, transactions, isolation levels
      v
 Supabase PostgreSQL  (tables, functions, triggers, views, RLS)
      ^
      |  Auth (login, password reset)
 Supabase Auth
```

## 9. Concurrency Scenarios (the core of the project)
| Scenario | Anomaly | Fix demonstrated | Owner |
|---|---|---|---|
| Two waiters add items to one order | Lost update | Version check, `SELECT ... FOR UPDATE` | Ayush |
| Discount calculated while total changes | Non-repeatable read | `REPEATABLE READ` | Ayush |
| Merging two tables | Deadlock | Lock ordering, retry | Ayush |
| Kitchen prints uncommitted item | Dirty read | `READ COMMITTED` | Diya |
| Two chefs update one ticket | Write conflict | Row lock, transition check | Diya |
| Two cashiers pay one bill | Double close | Status check + row lock, `SERIALIZABLE` retry | Sakshi |
| Report while orders change | Phantom read | `SERIALIZABLE` | Girish |

Each scenario has a script in `sql/demos/` that runs two sessions with deliberate delays, before and after the fix.

## 10. Deliverables
1. Working system (database, backend, frontend)
2. Concurrency demo scripts with before/after output
3. Performance report (indexes, `EXPLAIN ANALYZE`)
4. Audit log with verifiable hash chain
5. Figma wireframes (20 screens + 3 state variants)
6. Final report, diagrams, demo script
