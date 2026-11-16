-- =====================================================================
-- 04_concurrency_demos.sql
-- Owner   : Ayush (Module 2 - Waiter and Orders)
-- Purpose : Executable SQL demonstrations of database concurrency phenomena
--           and their architectural solutions:
--           1. Lost Update: Blind Overwrites vs Optimistic Versioning (OCC)
--           2. Non-Repeatable Read: READ COMMITTED vs REPEATABLE READ
--           3. Deadlock: Out-of-Order Locking vs Lock-Ordering Fix
-- =====================================================================

-- =====================================================================
-- DEMO 1: LOST UPDATE ANOMALY & OPTIMISTIC CONCURRENCY CONTROL (OCC)
-- =====================================================================
-- Scenario:
-- Two waiters (Alex & Sarah) open Order 1 simultaneously on their handhelds.
-- Both see Version = 1 and try to add items to the order.

-- ---------------------------------------------------------------------
-- Part A: WITHOUT OCC (The Blind Overwrite Anomaly)
-- ---------------------------------------------------------------------

-- [Session 1 - Waiter Alex]
BEGIN;
SELECT version, notes FROM orders WHERE order_id = 1;
-- Alex reads: version 1, notes: 'Table 1 regular guest'

-- [Session 2 - Waiter Sarah]
BEGIN;
SELECT version, notes FROM orders WHERE order_id = 1;
-- Sarah also reads: version 1, notes: 'Table 1 regular guest'

-- [Session 1 - Waiter Alex updates notes]
UPDATE orders SET notes = 'Table 1 regular guest (Gluten Allergy)' WHERE order_id = 1;
COMMIT;
-- Alex commits. DB has notes = 'Table 1 regular guest (Gluten Allergy)'.

-- [Session 2 - Waiter Sarah updates notes based on stale read]
UPDATE orders SET notes = 'Table 1 regular guest (Window Seat)' WHERE order_id = 1;
COMMIT;
-- Sarah commits. Alex's critical 'Gluten Allergy' update is completely LOST!
-- This is a classic Lost Update anomaly.


-- ---------------------------------------------------------------------
-- Part B: WITH OPTIMISTIC CONCURRENCY CONTROL (The Fix)
-- ---------------------------------------------------------------------

-- Reset order version to 1
UPDATE orders SET version = 1, notes = 'Table 1 regular guest' WHERE order_id = 1;

-- [Session 1 - Waiter Alex]
-- Alex reads version = 1. Alex adds an item and increments version:
SELECT add_order_item(
    p_order_id         => 1,
    p_item_id          => 1,
    p_quantity         => 2,
    p_notes            => 'Extra crispy',
    p_waiter_id        => '00000000-0000-0000-0000-000000000002'::uuid,
    p_expected_version => 1
);
-- Result: SUCCESS! Order version is now bumped to 2.

-- [Session 2 - Waiter Sarah]
-- Sarah attempts to modify the order using her stale expected_version = 1:
SELECT add_order_item(
    p_order_id         => 1,
    p_item_id          => 2,
    p_quantity         => 1,
    p_notes            => 'Less spicy',
    p_waiter_id        => '00000000-0000-0000-0000-000000000002'::uuid,
    p_expected_version => 1
);
-- Result:
-- ERROR: VERSION_CONFLICT: Order has been modified by another user. Current version: 2, Expected: 1
-- The database aborts the stale write and preserves data integrity!
-- The frontend catches HTTP 409 and prompts Sarah with Screen 8A (Conflict Modal).


-- =====================================================================
-- DEMO 2: NON-REPEATABLE READ ANOMALY & REPEATABLE READ ISOLATION
-- =====================================================================
-- Scenario:
-- A waiter reviews an order's subtotal before requesting a bill.
-- While the transaction is running, another staff member adds an item.

-- ---------------------------------------------------------------------
-- Part A: Under READ COMMITTED (Anomaly Occurs)
-- ---------------------------------------------------------------------

-- [Session 1 - Waiter reviewing order]
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT SUM(quantity * unit_price) AS bill_total
FROM order_item
WHERE order_id = 1 AND status != 'cancelled';
-- First Read returns: 38.00

-- [Session 2 - Concurrent staff adds an item]
BEGIN;
INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
VALUES (1, 3, 1, 12.00, 'draft', '00000000-0000-0000-0000-000000000002'::uuid);
COMMIT;

-- [Session 1 - Waiter recalculates within the SAME transaction]
SELECT SUM(quantity * unit_price) AS bill_total
FROM order_item
WHERE order_id = 1 AND status != 'cancelled';
-- Second Read returns: 50.00
-- Anomaly: Non-repeatable read! The same query returned two different values in one transaction.
COMMIT;


-- ---------------------------------------------------------------------
-- Part B: Under REPEATABLE READ (Consistent Snapshot Fix)
-- ---------------------------------------------------------------------

-- [Session 1 - Waiter reviewing order]
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT SUM(quantity * unit_price) AS bill_total
FROM order_item
WHERE order_id = 1 AND status != 'cancelled';
-- First Read returns snapshot value: 50.00

-- [Session 2 - Concurrent staff adds another item and commits]
BEGIN;
INSERT INTO order_item (order_id, item_id, quantity, unit_price, status, added_by)
VALUES (1, 4, 2, 5.00, 'draft', '00000000-0000-0000-0000-000000000002'::uuid);
COMMIT;

-- [Session 1 - Waiter re-reads in the same transaction]
SELECT SUM(quantity * unit_price) AS bill_total
FROM order_item
WHERE order_id = 1 AND status != 'cancelled';
-- Second Read returns: 50.00 (EXACT SAME SNAPSHOT!)
-- REPEATABLE READ isolates the transaction from concurrent commits until completion.
COMMIT;


-- =====================================================================
-- DEMO 3: DEADLOCK ANOMALY & DETERMINISTIC LOCK-ORDERING FIX
-- =====================================================================
-- Scenario:
-- Waiter A merges Order 1 into Order 2.
-- Waiter B merges Order 2 into Order 1 at the same time.

-- ---------------------------------------------------------------------
-- Part A: Out-of-Order Locking (Deadlock)
-- ---------------------------------------------------------------------

-- [Session 1]
BEGIN;
SELECT * FROM orders WHERE order_id = 1 FOR UPDATE; -- Locks row 1

-- [Session 2]
BEGIN;
SELECT * FROM orders WHERE order_id = 2 FOR UPDATE; -- Locks row 2

-- [Session 1 tries to lock row 2]
SELECT * FROM orders WHERE order_id = 2 FOR UPDATE; -- Blocks waiting for Session 2!

-- [Session 2 tries to lock row 1]
SELECT * FROM orders WHERE order_id = 1 FOR UPDATE;
-- DEADLOCK DETECTED!
-- PostgreSQL error: 40P01 deadlock_detected
-- Session 2 is aborted by PostgreSQL's deadlock detector.
ROLLBACK;
-- In Session 1:
ROLLBACK;


-- ---------------------------------------------------------------------
-- Part B: Deterministic Lock-Ordering (The Solution)
-- ---------------------------------------------------------------------
-- Solution implemented in merge_orders():
-- Always sort order_ids: lock min(order_id) FIRST, then max(order_id) SECOND.

-- [Session 1 - Merge(1, 2)]
-- min_id = 1, max_id = 2 -> Locks 1, then locks 2
BEGIN;
SELECT * FROM orders WHERE order_id = 1 FOR UPDATE;

-- [Session 2 - Merge(2, 1)]
-- min_id = 1, max_id = 2 -> Also attempts to lock 1 FIRST!
BEGIN;
SELECT * FROM orders WHERE order_id = 1 FOR UPDATE;
-- Session 2 clean-waits on row 1 without holding row 2.
-- There is NO CYCLE of locks -> Deadlock is mathematically impossible!

-- [Session 1 completes]
SELECT * FROM orders WHERE order_id = 2 FOR UPDATE;
COMMIT;

-- [Session 2 proceeds cleanly after Session 1 commits]
SELECT * FROM orders WHERE order_id = 2 FOR UPDATE;
COMMIT;
