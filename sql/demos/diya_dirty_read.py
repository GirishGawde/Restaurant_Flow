"""
sql/demos/diya_dirty_read.py
Owner: Diya (Module 3 - Kitchen)

DBMS Concurrency Demonstration: Dirty Read (Isolation Level: READ UNCOMMITTED vs READ COMMITTED)
Scenario:
1. Session A inserts an order_item as 'sent', causing trigger create_ticket_for_item() to insert
   a kitchen_ticket in 'queued' status. Session A has NOT committed yet.
2. In a DBMS without MVCC, Session B running READ UNCOMMITTED would see this uncommitted ticket,
   print it, and start cooking.
3. Session A then encounters an error or rolls back.
4. The ticket was a phantom/dirty read that never truly existed.
5. In PostgreSQL: Explain and prove that READ UNCOMMITTED is mapped to READ COMMITTED, so Session B
   never sees uncommitted dirty data.
"""

import sys
import time
import psycopg2
from psycopg2.extras import RealDictCursor


def run_demo(database_url):
    print("=" * 70)
    print("DEMO: Dirty Read Demonstration (Diya - Module 3)")
    print("=" * 70)

    # Session A: Starts transaction, updates order_item to sent, sleeps before rollback
    conn_a = psycopg2.connect(database_url)
    conn_b = psycopg2.connect(database_url)

    try:
        # Session A: Start transaction
        conn_a.autocommit = False
        cur_a = conn_a.cursor(cursor_factory=RealDictCursor)

        # Session B: Connected, attempts to read kitchen_ticket under READ UNCOMMITTED
        conn_b.set_session(isolation_level="READ UNCOMMITTED", autocommit=False)
        cur_b = conn_b.cursor(cursor_factory=RealDictCursor)

        print("\n[Step 1] Session A begins transaction.")
        print("[Step 1] Session A inserts draft item and updates status = 'sent' (trigger fires)...")

        # Create uncommitted ticket
        cur_a.execute("SELECT order_id FROM orders WHERE status = 'open' LIMIT 1;")
        order = cur_a.fetchone()
        if not order:
            print("No open orders found in test database. Seed data required.")
            return

        order_id = order["order_id"]
        cur_a.execute(
            """
            INSERT INTO order_item (order_id, item_id, quantity, unit_price, status)
            VALUES (%s, 1, 2, 18.50, 'sent')
            RETURNING order_item_id;
            """,
            (order_id,),
        )
        oi_id = cur_a.fetchone()["order_item_id"]
        print(f"[Step 1] Session A inserted order_item {oi_id} as 'sent' (UNCOMMITTED).")

        # Session B attempts to read tickets
        print("\n[Step 2] Session B runs query: SELECT * FROM kitchen_ticket WHERE order_item_id = ...")
        cur_b.execute("SELECT ticket_id, status FROM kitchen_ticket WHERE order_item_id = %s;", (oi_id,))
        ticket_seen = cur_b.fetchone()

        if ticket_seen:
            print(f"--> [DIRTY READ OCCURRED!] Session B saw uncommitted ticket: {ticket_seen}")
        else:
            print("--> [DIRTY READ PREVENTED BY POSTGRESQL MVCC!]")
            print("    Even with isolation level set to READ UNCOMMITTED, PostgreSQL treats it as")
            print("    READ COMMITTED. Session B only sees committed row snapshots.")

        # Session A rolls back
        print("\n[Step 3] Session A executes ROLLBACK;")
        conn_a.rollback()
        print("[Step 3] Session A rolled back. No orphan kitchen ticket was persisted.")

    finally:
        conn_a.close()
        conn_b.close()
        print("\nDemo completed.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python diya_dirty_read.py <DATABASE_URL>")
        sys.exit(1)
    run_demo(sys.argv[1])
