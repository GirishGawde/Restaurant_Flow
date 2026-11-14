# Screens

Figma file: https://www.figma.com/design/M6szg4Q7X3OFDoLlizg78N/DBMS-project

20 numbered screens plus 3 state variants. Build each screen as designed. If a screen needs something the database does not have, open an issue for the table's owner.

| Screen | Figma name | Route | Owner |
|---|---|---|---|
| 1 | Login | /login | Girish |
| 2 | Forgot password | /forgot-password | Girish |
| 2.1 | Reset password | /reset-password | Girish |
| 3 | Profile and settings | /profile | Girish |
| 4 | Waiter: Table Map | /waiter/tables | Ayush |
| 5 | Waiter: Open New Order | /waiter/orders/new | Ayush |
| 6 | Waiter: Menu Browser | /waiter/menu | Ayush |
| 7 | Waiter: Order Panel | /waiter/orders/:id | Ayush |
| 8 | Conflict and Lock Wait (dialogs) | inside the order panel | Ayush |
| 9 | Apply Discount (dialog) | inside the order panel | Ayush (function: Sakshi) |
| 10 | Waiter: My Orders | /waiter/orders | Ayush |
| 11 | Kitchen display | /kitchen/board | Diya |
| 12 | Ticket detail | /kitchen/tickets/:orderId | Diya |
| 13 | Cashier: Bill and Payment | /cashier/bills/:orderId | Sakshi |
| 14 | Cashier: Split Bill | /cashier/bills/:id/split | Sakshi |
| 14.1 | Split mismatch (state) | same as 14 | Sakshi |
| 15 | Payment Confirmation | /cashier/receipt/:billId | Sakshi |
| 15.1 | Bill already closed (state) | same as 15 | Sakshi |
| 16 | Manager dashboard | /admin/dashboard | Girish |
| 17 | Menu management | /admin/menu | Girish |
| 18 | Staff management | /admin/staff | Girish |
| 19 | Reports | /admin/reports | Girish |
| 20 | Audit log | /admin/audit | Girish |

## After login, go to
| Role | Home route |
|---|---|
| admin | /admin/dashboard |
| waiter | /waiter/tables |
| chef | /kitchen/board |
| cashier | /cashier/bills (open bills list) |

## Behaviour notes taken from the designs
- Login has role tiles (Admin, Cashier, Waiter, Kitchen Staff) and a username. The tile must match the user's real role.
- Items added on the menu browser are drafts. The waiter presses Send to Kitchen on the order panel.
- Order panel shows a version badge and a history log.
- Only one promotion per order.
- Prices include tax; no tax line.
- Kitchen display refreshes every 10 seconds. Timer colours: green under 10 min, amber 10 to 15, red over 15.
- After payment the table shows Needs Attention until a waiter marks it clean.
- Print receipt uses the browser print; email receipt is simulated.

## Not in Figma yet
- A way to mark a table clean (button on a Needs Attention table, screen 4)
- Reserving a table (status exists; nothing sets it except admin)
- Promotion management screen (promotions are seed data for now)
- Two-waiter concurrency demo screen (Diya)
