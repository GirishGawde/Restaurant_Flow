"""
app/services/kitchen_service.py
Owner: Diya (Module 3 - Kitchen)

Business logic and database access for:
- Kitchen stations (station table)
- Kitchen tickets (kitchen_ticket table)
- Card-level and single-ticket state transitions
- Station load, prep time statistics, and views
"""

from app.db import run_in_transaction
from app.errors import ApiError, not_found, bad_request, conflict


def get_stations(active_only=False):
    """
    Fetch all kitchen stations ordered by display_order.
    """
    query = """
        SELECT station_id, s_name, is_active, display_order, target_prep_minutes
        FROM station
    """
    params = []
    if active_only:
        query += " WHERE is_active = true"
    query += " ORDER BY display_order ASC, station_id ASC;"

    with run_in_transaction() as cur:
        cur.execute(query, tuple(params))
        stations = [dict(row) for row in cur.fetchall()]

    return stations


def create_station(data, staff_id=None):
    """
    Create a new station (Admin or Chef).
    """
    s_name = data.get("s_name", "").strip()
    if not s_name:
        raise bad_request("Station name 's_name' is required.")

    display_order = data.get("display_order", 0)
    target_prep_minutes = data.get("target_prep_minutes")
    is_active = data.get("is_active", True)

    with run_in_transaction() as cur:
        cur.execute(
            """
            INSERT INTO station (s_name, display_order, target_prep_minutes, is_active)
            VALUES (%s, %s, %s, %s)
            RETURNING station_id, s_name, is_active, display_order, target_prep_minutes;
            """,
            (s_name, display_order, target_prep_minutes, is_active),
        )
        row = cur.fetchone()
        return dict(row)


def update_station(station_id, data, staff_id=None):
    """
    Update an existing kitchen station.
    """
    fields = []
    values = []

    if "s_name" in data:
        fields.append("s_name = %s")
        values.append(data["s_name"].strip())
    if "display_order" in data:
        fields.append("display_order = %s")
        values.append(int(data["display_order"]))
    if "target_prep_minutes" in data:
        fields.append("target_prep_minutes = %s")
        values.append(int(data["target_prep_minutes"]) if data["target_prep_minutes"] is not None else None)
    if "is_active" in data:
        fields.append("is_active = %s")
        values.append(bool(data["is_active"]))

    if not fields:
        raise bad_request("No fields provided to update.")

    values.append(station_id)

    with run_in_transaction() as cur:
        cur.execute(
            f"""
            UPDATE station
            SET {', '.join(fields)}
            WHERE station_id = %s
            RETURNING station_id, s_name, is_active, display_order, target_prep_minutes;
            """,
            tuple(values),
        )
        row = cur.fetchone()
        if not row:
            raise not_found(f"Station {station_id} not found.")
        return dict(row)


def get_kitchen_board(station_id=None, sort="oldest_first"):
    """
    Returns grouped kitchen cards from v_kitchen_board, filtered by station if specified,
    and sorted by oldest_first or newest_first.
    """
    query = "SELECT * FROM v_kitchen_board WHERE 1=1"
    params = []

    if station_id:
        query += " AND %s = ANY(station_ids)"
        params.append(int(station_id))

    if sort == "newest_first":
        query += " ORDER BY placed_at DESC, order_id DESC"
    elif sort == "table":
        query += " ORDER BY table_id ASC, placed_at ASC"
    else:  # oldest_first (default)
        query += " ORDER BY placed_at ASC, order_id ASC"

    with run_in_transaction() as cur:
        cur.execute(query, tuple(params))
        rows = [dict(row) for row in cur.fetchall()]

        # Query average prep time
        cur.execute("SELECT round(avg(avg_prep_minutes)::numeric, 1) as overall_avg FROM v_station_prep_time;")
        avg_row = cur.fetchone()
        avg_minutes = float(avg_row["overall_avg"]) if avg_row and avg_row["overall_avg"] is not None else 12.67

    # Format avg minutes as MM:SS
    total_seconds = int(avg_minutes * 60)
    mins = total_seconds // 60
    secs = total_seconds % 60
    avg_prep_time_str = f"{mins:02d}:{secs:02d}"

    # Calculate column metrics
    counts = {
        "all": len(rows),
        "new": sum(1 for r in rows if r.get("ticket_status") == "queued"),
        "cooking": sum(1 for r in rows if r.get("ticket_status") == "cooking"),
        "ready": sum(1 for r in rows if r.get("ticket_status") == "ready"),
        "done": sum(1 for r in rows if r.get("ticket_status") == "served"),
    }

    return {
        "cards": rows,
        "counts": counts,
        "avg_prep_time": avg_prep_time_str,
    }


def get_order_ticket(order_id):
    """
    Fetches full ticket details for Screen 12:
    - Order summary and notes
    - Individual items with stations and statuses
    - Status history timeline
    """
    with run_in_transaction() as cur:
        # Order header
        cur.execute(
            """
            SELECT o.order_id, o.table_id, 'T-' || lpad(o.table_id::text, 2, '0') as table_label,
                   rt.section, o.guests, o.notes as order_notes, o.status as order_status,
                   w.name as waiter_name, o.created_at as placed_at
            FROM orders o
            JOIN restaurant_table rt ON rt.table_id = o.table_id
            LEFT JOIN staff w ON w.staff_id = o.waiter_id
            WHERE o.order_id = %s;
            """,
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            raise not_found(f"Order #{order_id} not found.")

        order_dict = dict(order)

        # Items and tickets
        cur.execute(
            """
            SELECT kt.ticket_id, kt.order_item_id, m.name as item, oi.quantity,
                   s.station_id, s.s_name as station, kt.status, kt.item_note as note,
                   kt.placed_at, kt.started_at, kt.ready_at, kt.served_at, kt.due_by,
                   kt.issue_note
            FROM kitchen_ticket kt
            JOIN order_item oi ON oi.order_item_id = kt.order_item_id
            JOIN menu_item m ON m.item_id = oi.item_id
            JOIN station s ON s.station_id = kt.station_id
            WHERE oi.order_id = %s
            ORDER BY kt.ticket_id ASC;
            """,
            (order_id,),
        )
        items = [dict(item) for item in cur.fetchall()]

        # History timeline
        cur.execute(
            """
            SELECT stage_no, stage, happened_at, by_staff_id, by_name
            FROM v_ticket_history
            WHERE order_id = %s
            ORDER BY stage_no ASC, happened_at ASC;
            """,
            (order_id,),
        )
        history = [dict(h) for h in cur.fetchall()]

    return {
        "order": order_dict,
        "items": items,
        "history": history,
    }


def advance_order(order_id, new_status, chef_id):
    """
    Card buttons on screen 11: advance all tickets of order_id to new_status.
    Uses PostgreSQL function advance_order_tickets(order_id, new_status, chef_id).
    """
    try:
        with run_in_transaction() as cur:
            cur.execute(
                "SELECT advance_order_tickets(%s, %s, %s) as moved_count;",
                (order_id, new_status, chef_id),
            )
            result = cur.fetchone()
            moved = result["moved_count"] if result else 0
            return {
                "order_id": order_id,
                "new_status": new_status,
                "moved_count": moved,
                "message": f"Successfully advanced {moved} tickets to {new_status}."
            }
    except Exception as e:
        msg = str(e)
        if "KT001" in msg or "Illegal ticket status change" in msg or "Nothing to advance" in msg:
            raise conflict(msg, code="KT001")
        if "KT002" in msg or "order is cancelled or closed" in msg:
            raise conflict(msg, code="KT002")
        raise


def update_ticket(ticket_id, new_status, chef_id):
    """
    Update a single ticket to new_status using update_ticket_status(ticket_id, new_status, chef_id).
    """
    try:
        with run_in_transaction() as cur:
            cur.execute(
                "SELECT * FROM update_ticket_status(%s, %s, %s);",
                (ticket_id, new_status, chef_id),
            )
            row = cur.fetchone()
            return dict(row) if row else {}
    except Exception as e:
        msg = str(e)
        if "KT001" in msg or "Illegal ticket status change" in msg:
            raise conflict(msg, code="KT001")
        if "KT002" in msg:
            raise conflict(msg, code="KT002")
        raise


def report_issue(ticket_id, note, chef_id):
    """
    Report an issue on a ticket using report_ticket_issue(ticket_id, note, chef_id).
    """
    if not note or not note.strip():
        raise bad_request("Issue note cannot be empty.")

    with run_in_transaction() as cur:
        cur.execute(
            "SELECT report_ticket_issue(%s, %s, %s);",
            (ticket_id, note.strip(), chef_id),
        )

    return {"ticket_id": ticket_id, "issue_note": note.strip()}


def get_kitchen_stats():
    """
    Returns station load and prep time analytics from v_kitchen_load and v_station_prep_time.
    """
    with run_in_transaction() as cur:
        cur.execute("SELECT * FROM v_kitchen_load;")
        load = [dict(row) for row in cur.fetchall()]

        cur.execute("SELECT * FROM v_station_prep_time ORDER BY station_id ASC;")
        prep = [dict(row) for row in cur.fetchall()]

    return {
        "load": load,
        "prep_times": prep,
    }
