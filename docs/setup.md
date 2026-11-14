# Local Setup

## Prerequisites
- Git
- Python 3.10 or newer
- Node.js 18 or newer
- VS Code
- Access to the shared Supabase project (accepted invite)

## 1. Clone
```
git clone <repo-url>
cd restaurant-order-flow
git checkout dev
```

## 2. Database
Run the files in `sql/` in numeric order in the Supabase SQL Editor (shared project: only after a pull request is merged; your own test project: any time).

Before the staff seed in `01_admin_base.sql` runs, create the login users: Authentication, Users, Add user, tick Auto Confirm User, using the emails listed in that file.

## 3. Backend
```
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # Windows PowerShell
# source venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
copy .env.example .env           # cp .env.example .env on macOS / Linux
```
Fill in `.env`, then:
```
python run.py
```
The API runs at http://localhost:5000.

`backend/.env`
```
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
FLASK_ENV=development
FLASK_SECRET_KEY=<any long random string>
```
Use the session pooler on port 5432 (Supabase, Connect). The concurrency demos use `SET` commands such as isolation levels, which need a session connection, not the transaction pooler on 6543.

Suggested `requirements.txt`:
```
Flask
flask-cors
psycopg2-binary
python-dotenv
PyJWT
requests
pytest
```

## 4. Frontend
```
cd frontend
npm install
copy .env.example .env
npm run dev
```
The app runs at http://localhost:5173.

`frontend/.env`
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_URL=http://localhost:5000
VITE_USE_MOCKS=true
```
`VITE_USE_MOCKS=true` lets you build screens before the API exists. Set it to `false` when the real routes are ready.

## 5. Test accounts
Created from `01_admin_base.sql`: jlee (admin), asmith and mchen (waiters), krao (chef), mrossi (cashier). Emails are `<username>@resto.test`. Passwords are whatever you set in the Supabase dashboard; share them privately.

## Secrets
- Never commit `.env`, database passwords or the `service_role` key.
- The `service_role` key is for Flask only. React uses only the project URL and the anon key.
- If a secret is committed by mistake, tell the team and reset it in Supabase.
- Share real values only in a private message.

## Troubleshooting
| Problem | Likely cause |
|---|---|
| `relation does not exist` when running SQL | An earlier file was not run first (see the order in database.md) |
| `column ... does not exist` after a table was created earlier | An old table with the same name exists; check its columns, and drop it only if nothing depends on it |
| Backend cannot connect | Wrong password in `DATABASE_URL`, or the free project is paused (open the dashboard and restart it) |
| React gets a CORS error | `flask-cors` not enabled in `create_app` |
| Free Supabase project paused | Free projects pause after about a week of inactivity; open the project to resume |
