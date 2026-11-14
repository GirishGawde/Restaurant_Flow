# Restaurant Table & Kitchen Order Flow Simulator

A database-centric restaurant system covering the full order lifecycle: table, order, kitchen ticket, bill and payment. Its core goal is to show correct handling of concurrent access (lost update, dirty read, non-repeatable read, phantom read, deadlock, double payment) using isolation levels, row locking and optimistic versioning.

**Stack:** React (frontend) · Flask (backend API) · Supabase / PostgreSQL (database)

## Team

| Member | Module |
|---|---|
| Girish | Module 1: Admin, Login and Security |
| Ayush | Module 2: Waiter and Orders |
| Diya | Module 3: Kitchen |
| Sakshi | Module 4: Cashier and Billing |

## Documentation

| File | What it covers |
|---|---|
| [docs/project.md](docs/project.md) | Overview, problem, objectives, scope, roles, architecture |
| [docs/module.md](docs/module.md) | The four modules and who owns what |
| [docs/filestructure.md](docs/filestructure.md) | Folder layout and ownership rules |
| [docs/phases.md](docs/phases.md) | Phases, checklist and current status |
| [docs/database.md](docs/database.md) | Shared database agreements, SQL file order |
| [docs/api.md](docs/api.md) | API conventions and route list |
| [docs/screens.md](docs/screens.md) | Figma screens mapped to routes and owners |
| [docs/setup.md](docs/setup.md) | How to run everything locally |
| [docs/github-workflow.md](docs/github-workflow.md) | Branches, commits, pull requests |
| [docs/decisions.md](docs/decisions.md) | Design decisions and open questions |

Figma: https://www.figma.com/design/M6szg4Q7X3OFDoLlizg78N/DBMS-project

## Quick start

See [docs/setup.md](docs/setup.md). In short: run the SQL files in `sql/` in order, start the backend from `backend/`, start the frontend from `frontend/`.

## Never commit

`.env` files, database passwords, the Supabase `service_role` key.
