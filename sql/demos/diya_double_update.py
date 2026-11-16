"""
sql/demos/diya_double_update.py
Owner: Diya (Module 3 - Kitchen)

DBMS Concurrency Demonstration: Concurrent Status Advance & Row Locking (FOR UPDATE)
Scenario:
1. Two chefs (Chef 1 and Chef 2) view ticket #1 (status: queued) at the same time.
2. Both click "Start Preparing" (advance to cooking) simultaneously.
3. Chef 1's transaction executes update_ticket_status(ticket_id, 'cooking', chef_1_id)
   which performs: SELECT * FROM kitchen_ticket WHERE ticket_id = 1 FOR UPDATE;
4. Chef 2's transaction also performs SELECT ... FOR UPDATE and WAITS for Chef 1's lock.
5. Chef 1 completes update and commits.
6. Chef 2 unblocks, reads the freshly committed status ('cooking'), and evaluates:
   kitchen_status_rank('cooking') IS DISTINCT FROM kitchen_status_rank('cooking') + 1
   -> Fails with custom exception KT001: "Ticket 1 is 'cooking' and cannot move to 'cooking'".
7. Result: Exactly one chef successfully claims the ticket; no double-transition or race condition!
"""

import sys
import threading
import time
import psycopg2
from psycopg2.extras import RealDictCursor


def chef_action(database_url, chef_name, chef_id, ticket_id, target_status, delay_before_commit=0):
    conn = psycopg2.connect(database_url)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        print(f"[{chef_name}] Starting update to '{target_status}' on ticket #{ticket_id}...")
        cur.execute("SELECT update_ticket_status(%s, %s, %s);", (ticket_id, target_status, chef_id))
        result = cur.fetchone()
        if delay_before_commit > 0:
            print(f"[{chef_name}] Holding row lock for {delay_before_commit}s...")
            time.sleep(delay_before_commit)
        conn.commit()
        print(f"[{chef_name}] SUCCESS: Ticket advanced to '{target_status}'. Committed.")
    except Exception as e:
        conn.rollback()
        print(f"[{chef_name}] CONFLICT/ERROR: {e}")
    finally:
        conn.close()


def run_demo(database_url, ticket_id):
    print("=" * 70)
    print("DEMO: Concurrent Chef Update & Row Locking (Diya - Module 3)")
    print("=" * 70)

    chef1_id = "00000000-0000-0000-0000-000000000003"
    chef2_id = "00000000-0000-0000-0000-000000000004"

    t1 = threading.Thread(
        target=chef_action,
        args=(database_url, "Chef R. Patel", chef1_id, ticket_id, "cooking", 2.0),
    )
    t2 = threading.Thread(
        target=chef_action,
        args=(database_url, "Chef K. Rao", chef2_id, ticket_id, "cooking", 0),
    )

    t1.start()
    time.sleep(0.2)  # Ensure Chef 1 acquires lock first
    t2.start()

    t1.join()
    t2.join()
    print("\nDemonstration finished.")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python diya_double_update.py <DATABASE_URL> <TICKET_ID>")
        sys.exit(1)
    run_demo(sys.argv[1], int(sys.argv[2]))
