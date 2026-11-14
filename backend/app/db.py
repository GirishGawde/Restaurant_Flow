"""
app/db.py
Owner: Girish (Module 1 - Admin & Auth)

PostgreSQL database connection helper and transaction context manager using psycopg2.

NOTE ON CONCURRENCY & ISOLATION LEVELS:
Our concurrency demos (lost update, dirty read, non-repeatable read, phantom read,
deadlock, and double close) need explicit control over SQL transaction isolation
levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) and row locking (FOR UPDATE).
The Supabase JS client connects over HTTP/REST and cannot set session isolation levels
or maintain an open transaction with row locks across multiple steps.
Using psycopg2 with run_in_transaction() gives us full database-level control.
"""

from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import Config


def get_connection():
    """
    Opens and returns a new psycopg2 connection using DATABASE_URL.
    Raises RuntimeError if DATABASE_URL is not configured.
    """
    if not Config.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured in backend/.env")
    return psycopg2.connect(Config.DATABASE_URL)


@contextmanager
def run_in_transaction(isolation_level="READ COMMITTED"):
    """
    Context manager that:
    1. Opens a database connection.
    2. Sets the transaction isolation level (e.g. 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE').
    3. Yields a cursor returning dict-style rows (RealDictCursor).
    4. Commits on successful completion of the block.
    5. Rolls back if an exception occurs.
    6. Always closes the cursor and connection when done.

    Usage:
        with run_in_transaction(isolation_level="REPEATABLE READ") as cur:
            cur.execute("SELECT * FROM restaurant_table WHERE status = %s;", ('free',))
            rows = cur.fetchall()
    """
    conn = get_connection()
    try:
        # Set transaction isolation level on the session
        # isolation_level can be 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE', etc.
        conn.set_session(isolation_level=isolation_level.upper(), autocommit=False)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
