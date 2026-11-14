# API Contract

All routes belong to the Flask backend. React only talks to Flask. This file lets the frontend and backend be built at the same time: build screens against these shapes (with mocks), then switch to the real API.

## Conventions
- Base URL: `http://localhost:5000` (set in `VITE_API_URL`)
- Format: JSON requests and responses
- Auth: `Authorization: Bearer <access token>` on every route except login and password reset
- Money: numbers with 2 decimals (for example `63.50`); times: ISO 8601 strings
- IDs: numbers, except `staff_id` (uuid string)

### Error format
```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Order was changed by another waiter" } }
```

| HTTP status | Meaning |
|---|---|
| 400 | Bad request or missing field |
| 401 | Not logged in |
| 403 | Logged in but wrong role |
| 404 | Not found |
| 409 | Conflict: version conflict, lock timeout, already paid, illegal status change, not enough data to proceed |
| 422 | Validation failed (for example split amounts do not match) |

### Special 409 bodies
```json
{ "error": { "code": "VERSION_CONFLICT", "message": "...", "current_version": 4 } }
{ "error": { "code": "LOCK_TIMEOUT", "message": "...", "locked_by": "J. Lee", "locked_at": "2026-11-02T14:45:00Z" } }
{ "error": { "code": "ALREADY_PAID", "message": "...", "closed_by": "M. Rossi", "closed_at": "2026-11-02T15:02:00Z" } }
```

Every write on an order sends the `version` it last saw (`expected_version`). If it no longer matches, the API returns `VERSION_CONFLICT`.

## Module 1: Auth and Admin (Girish)
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | /auth/login | public | username, password, chosen role; returns token and user |
| POST | /auth/logout | any | end session |
| GET | /auth/me | any | current user and role |
| POST | /auth/forgot-password | public | send reset email |
| POST | /auth/reset-password | public | set new password |
| POST | /auth/change-password | any | change own password (screen 3) |
| GET, POST, PATCH | /staff | admin | list, create, edit, deactivate staff |
| GET, POST, PATCH | /menu-items | admin | manage menu (screen 17) |
| GET | /dashboard | admin | cards, table status, active orders, kitchen load |
| GET | /reports/sales, /reports/best-sellers, /reports/turnover, /reports/waiters | admin | report data (date range and section filters) |
| GET | /reports/export | admin | CSV |
| GET | /audit-log | admin | filters: user, table, date; paged |
| GET | /audit-log/export | admin | export |
| GET | /audit-log/verify | admin | check the hash chain |
| GET | /orders/<id>/history | waiter, cashier, admin | readable history lines |

## Module 2: Waiter (Ayush)
| Method | Path | Purpose |
|---|---|---|
| GET | /tables | tables with section, seats, status, last activity |
| POST | /tables/<id>/mark-clean | needs_cleaning to free |
| GET | /menu | menu with search (name, category, ingredient) and category filter |
| POST | /orders | open order: table_id, guests, notes |
| GET | /orders | my orders: status filter, search, date, waiter |
| GET | /orders/<id> | order with items, totals, version |
| POST | /orders/<id>/items | add item (draft): item_id, quantity, notes, expected_version |
| PATCH | /orders/<id>/items/<item_id> | change quantity or note |
| DELETE | /orders/<id>/items/<item_id> | cancel item |
| POST | /orders/<id>/send-to-kitchen | draft to sent: expected_version |
| POST | /orders/<id>/lock | take the edit lock (30 s timeout) |
| POST | /orders/<id>/request-bill | bill requested |
| POST | /orders/<id>/cancel | cancel order |

## Module 3: Kitchen (Diya)
| Method | Path | Purpose |
|---|---|---|
| GET | /stations | station list (also used by screen 17) |
| POST, PATCH | /stations | admin only |
| GET | /kitchen/board | cards grouped by order; filters: station, sort |
| GET | /kitchen/orders/<order_id>/ticket | detail: items, notes, history |
| POST | /kitchen/orders/<order_id>/advance | move all tickets of the order one step |
| PATCH | /kitchen/tickets/<id>/status | move one ticket |
| POST | /kitchen/tickets/<id>/issue | report an issue |
| GET | /kitchen/stats | average prep time, load |

## Module 4: Cashier (Sakshi)
| Method | Path | Purpose |
|---|---|---|
| GET | /bills/open | bills waiting for payment |
| GET | /bills/<order_id> | bill with items, served times, history |
| POST | /bills/<id>/promotion | apply a promotion code |
| DELETE | /bills/<id>/promotion | remove it |
| GET | /promotions/<code>/check | validate a code |
| POST | /bills/<id>/payments | one payer: method, amount, cash tendered |
| POST | /bills/<id>/split-payments | several payers in one transaction |
| GET | /bills/<id>/receipt | receipt data |
| GET | /cashier/summary | daily cash summary |

## Real-time
The kitchen display and the dashboard refresh by polling every 10 seconds. Supabase Realtime is an optional upgrade.

## Mock mode (frontend)
With `VITE_USE_MOCKS=true` the files in `frontend/src/api/` return JSON from `frontend/src/mocks/data/` in the same shapes as above. Turn mocks off per module when its real routes are ready.
