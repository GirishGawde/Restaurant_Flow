# File Structure

```
restaurant-order-flow/
├── README.md
├── .gitignore
├── docs/                         project documents (this folder)
│   ├── project.md  module.md  phases.md  filestructure.md
│   ├── database.md  api.md  screens.md  setup.md
│   ├── github-workflow.md  decisions.md
│   └── figma/                    exported screenshots (optional)
│
├── sql/                          database scripts, run in numeric order
│   ├── 01_admin_base.sql         Girish
│   ├── 02_stations.sql           Diya
│   ├── 03_menu_admin.sql         Girish
│   ├── 04_orders_waiter.sql      Ayush
│   ├── 05_kitchen_tickets.sql    Diya
│   ├── 06_billing_cashier.sql    Sakshi
│   ├── 07_security_rls.sql       Girish
│   ├── 08_audit.sql              Girish
│   ├── 09_reports.sql            Girish
│   └── demos/                    concurrency demo scripts
│       ├── ayush_lost_update.py
│       ├── diya_dirty_read.py
│       ├── sakshi_double_close.py
│       └── girish_phantom_read.py
│
├── backend/                      Flask API
│   ├── run.py                    starts the app
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── __init__.py           create_app(), registers blueprints
│   │   ├── config.py             loads .env
│   │   ├── db.py                 get_connection(), run_in_transaction(isolation)
│   │   ├── auth.py               token check, @require_role(...)
│   │   ├── errors.py             409 conflict, 422 validation, error format
│   │   ├── routes/
│   │   │   ├── auth_admin.py     Girish
│   │   │   ├── waiter.py         Ayush
│   │   │   ├── kitchen.py        Diya
│   │   │   └── cashier.py        Sakshi
│   │   └── services/             business logic called by routes
│   │       ├── admin_service.py
│   │       ├── waiter_service.py
│   │       ├── kitchen_service.py
│   │       └── cashier_service.py
│   └── tests/
│
└── frontend/                     React (Vite)
    ├── package.json
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               routes
        ├── api/                  one file per module
        │   ├── client.js         fetch wrapper, token header, error handling
        │   ├── auth.js  admin.js  waiter.js  kitchen.js  cashier.js
        ├── auth/
        │   ├── AuthContext.jsx   current user and role
        │   ├── ProtectedRoute.jsx
        │   └── roles.js          role names and home routes
        ├── components/           shared UI (Girish owns; others request changes)
        │   ├── TopBar.jsx  Button.jsx  Card.jsx  StatusPill.jsx
        │   ├── DataTable.jsx  Modal.jsx  Toast.jsx  FormField.jsx
        ├── layouts/
        │   └── RoleLayout.jsx    top bar + page area
        ├── pages/
        │   ├── auth/             Login, ForgotPassword, ResetPassword, Profile
        │   ├── admin/            Dashboard, MenuManagement, StaffManagement, Reports, AuditLog
        │   ├── waiter/           TableMap, OpenOrder, MenuBrowser, OrderPanel, MyOrders,
        │   │                     ConflictDialog, LockWaitDialog, DiscountDialog
        │   ├── kitchen/          KitchenDisplay, TicketDetail, (DemoScreen)
        │   └── cashier/          BillPayment, SplitBill, PaymentConfirmation
        ├── hooks/                usePolling.js, useApi.js
        ├── mocks/                sample JSON so screens work before the API is ready
        │   ├── data/             menu.json, tables.json, orders.json, tickets.json, bills.json
        │   └── mockApi.js
        ├── styles/
        │   ├── tokens.css        colours, spacing, fonts from Figma
        │   └── global.css
        └── utils/                format.js (money, time), constants.js
```

## Ownership rules

| Area | Owner | Rule |
|---|---|---|
| `sql/` files | The person named in the filename | Only the owner edits; others open an issue |
| `backend/app/routes/` and `services/` | One file per person | Each person edits only their own files |
| `backend/app/db.py`, `auth.py`, `errors.py`, `config.py` | Girish | Others request changes through an issue |
| `frontend/src/pages/<role>/` | Matching module owner | admin = Girish, waiter = Ayush, kitchen = Diya, cashier = Sakshi |
| `frontend/src/components/`, `auth/`, `layouts/`, `api/client.js`, `styles/` | Girish | Shared. Small additions are fine; tell the group |
| `frontend/src/api/<module>.js` and `mocks/data/` | Matching module owner | One file each |
| `docs/` | Everyone | Update the file that matches your change |

## Naming conventions
- SQL: lowercase `snake_case` tables and columns, files `NN_name.sql`
- Python: `snake_case` files and functions
- React: `PascalCase.jsx` for components, `camelCase.js` for everything else
- Branches: `feature/<name>-<task>` (see github-workflow.md)

## Git and empty folders
Git does not track empty folders. Keep a `.gitkeep` file in any folder that has nothing else yet.
