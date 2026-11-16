/**
 * src/pages/kitchen/KitchenConcurrencyDemo.jsx
 * Owner: Diya (Module 3 - Kitchen)
 *
 * Interactive DBMS Concurrency Demonstrator & Simulator:
 * 1. Dirty Read Demo (READ UNCOMMITTED vs READ COMMITTED in PostgreSQL)
 * 2. Concurrent Chef Updates & Row Locking (FOR UPDATE + KT001 Illegal Transition)
 * 3. Card-Level vs Item-Level Advance Atomicity
 * 4. Automatic "All Served" Database Trigger Simulation
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";

export function KitchenConcurrencyDemo() {
  const navigate = useNavigate();

  // Demo 1: Dirty Read state
  const [dirtyReadState, setDirtyReadState] = useState({
    sessionAStatus: "idle", // 'uncommitted', 'rolled_back'
    sessionBReadResult: null,
    explanation: null,
  });

  // Demo 2: Concurrent Chef Row Locking state
  const [chefLockState, setChefLockState] = useState({
    ticketStatus: "queued",
    chef1Log: [],
    chef2Log: [],
    isSimulating: false,
    lockHolder: null,
  });

  // Demo 3: All-Served Trigger state
  const [orderItemsState, setOrderItemsState] = useState([
    { id: 1, name: "Grilled Salmon", status: "ready" },
    { id: 2, name: "Garlic Bread", status: "cooking" },
    { id: 3, name: "Lemonade", status: "ready" },
  ]);
  const [orderStatus, setOrderStatus] = useState("in_kitchen");

  // -------------------------------------------------------------------
  // Demo 1 Handlers: Dirty Read
  // -------------------------------------------------------------------
  const handleStartSessionA = () => {
    setDirtyReadState({
      sessionAStatus: "uncommitted",
      sessionBReadResult: null,
      explanation:
        "Session A: Executed INSERT INTO order_item ...; Trigger create_ticket_for_item() created Ticket #999 in QUEUED status. Transaction is NOT committed yet.",
    });
  };

  const handleSessionBQuery = () => {
    setDirtyReadState((prev) => ({
      ...prev,
      sessionBReadResult: "NO_DIRTY_DATA",
      explanation:
        "Session B: Executed SELECT * FROM kitchen_ticket WHERE ticket_id = 999; Result: 0 rows found. Even though isolation level is READ UNCOMMITTED, PostgreSQL's MVCC ensures readers only see committed row versions! Dirty reads are prevented.",
    }));
  };

  const handleRollbackSessionA = () => {
    setDirtyReadState({
      sessionAStatus: "rolled_back",
      sessionBReadResult: null,
      explanation:
        "Session A: Executed ROLLBACK. Transaction aborted. PostgreSQL left zero orphan tickets in the kitchen database.",
    });
  };

  // -------------------------------------------------------------------
  // Demo 2 Handlers: Two Chefs Row Locking
  // -------------------------------------------------------------------
  const handleSimulateConcurrentChefs = () => {
    setChefLockState({
      ticketStatus: "queued",
      chef1Log: ["Chef 1: Clicked 'Start Preparing' (queued -> cooking)"],
      chef2Log: ["Chef 2: Clicked 'Start Preparing' (queued -> cooking) simultaneously"],
      isSimulating: true,
      lockHolder: "Chef 1",
    });

    // Step 1: Chef 1 acquires lock
    setTimeout(() => {
      setChefLockState((prev) => ({
        ...prev,
        chef1Log: [
          ...prev.chef1Log,
          "Chef 1: Acquired SELECT ... FOR UPDATE on ticket #1042",
          "Chef 1: Updating status = 'cooking', updating timestamp...",
        ],
        chef2Log: [
          ...prev.chef2Log,
          "Chef 2: Waiting on row lock held by Chef 1's transaction...",
        ],
      }));
    }, 1200);

    // Step 2: Chef 1 commits, Chef 2 wakes up and evaluates transition
    setTimeout(() => {
      setChefLockState((prev) => ({
        ...prev,
        ticketStatus: "cooking",
        lockHolder: null,
        isSimulating: false,
        chef1Log: [
          ...prev.chef1Log,
          "Chef 1: COMMIT successful! Ticket is now 'cooking'.",
        ],
        chef2Log: [
          ...prev.chef2Log,
          "Chef 2: Lock released. Chef 2 reads freshly committed status ('cooking').",
          "Chef 2: enforce_ticket_transition() checks rank('cooking') == rank('cooking')+1 -> FALSE",
          "Chef 2: RAISED EXCEPTION KT001: 'Ticket is already cooking and cannot move to cooking'. Transaction rolled back.",
        ],
      }));
    }, 2800);
  };

  // -------------------------------------------------------------------
  // Demo 3 Handlers: check_order_all_served trigger
  // -------------------------------------------------------------------
  const handleAdvanceItemInTriggerDemo = (itemId) => {
    const updated = orderItemsState.map((it) => {
      if (it.id === itemId) {
        const next = it.status === "cooking" ? "ready" : "served";
        return { ...it, status: next };
      }
      return it;
    });
    setOrderItemsState(updated);

    const allServed = updated.every((it) => it.status === "served");
    if (allServed) {
      setOrderStatus("served");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* Top Banner */}
      <div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginBottom: "4px",
          }}
        >
          CONCURRENCY & TRANSACTION SIMULATOR
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              Kitchen Concurrency Demonstrations
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Live demonstration of PostgreSQL isolation levels, row locking (FOR UPDATE), and database triggers (Diya - Module 3).
            </p>
          </div>

          <Button variant="secondary" onClick={() => navigate("/kitchen/board")}>
            ← Back to Kitchen Display
          </Button>
        </div>
      </div>

      {/* Demo 1: Dirty Read & MVCC */}
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              1. Dirty Read Prevention (MVCC in PostgreSQL)
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
              Can Session B read an uncommitted kitchen ticket created by Session A before rollback?
            </p>
          </div>
          <StatusPill variant="green">READ UNCOMMITTED → READ COMMITTED</StatusPill>
        </div>

        {/* Step-by-step interactive controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={handleStartSessionA}
            disabled={dirtyReadState.sessionAStatus === "uncommitted"}
          >
            Step 1: Session A (Insert Uncommitted Ticket)
          </Button>
          <Button
            variant="primary"
            onClick={handleSessionBQuery}
            disabled={dirtyReadState.sessionAStatus !== "uncommitted"}
          >
            Step 2: Session B (Run SELECT Query)
          </Button>
          <Button
            variant="danger"
            onClick={handleRollbackSessionA}
            disabled={dirtyReadState.sessionAStatus !== "uncommitted"}
          >
            Step 3: Session A (Rollback)
          </Button>
        </div>

        {/* Explanation output display */}
        {dirtyReadState.explanation && (
          <div
            style={{
              backgroundColor: "#FAF9F5",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              color: "var(--color-text-main)",
            }}
          >
            <strong>Execution Log:</strong> {dirtyReadState.explanation}
          </div>
        )}
      </div>

      {/* Demo 2: Concurrent Chef Row Locking (FOR UPDATE) */}
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              2. Concurrent Chef Updates & SELECT ... FOR UPDATE Locking
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
              Two chefs simultaneously clicking "Start Preparing" on Ticket #1042.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Current Ticket Status:</span>
            <StatusPill status={chefLockState.ticketStatus}>{chefLockState.ticketStatus}</StatusPill>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            variant="primary"
            onClick={handleSimulateConcurrentChefs}
            disabled={chefLockState.isSimulating}
          >
            {chefLockState.isSimulating ? "Simulating Concurrent Transactions..." : "Simulate Both Chefs Clicking at Once"}
          </Button>
        </div>

        {/* Dual Console Window */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Chef 1 Box */}
          <div
            style={{
              backgroundColor: "#1B1B1B",
              color: "#E8F5E9",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              minHeight: "180px",
            }}
          >
            <div style={{ color: "#81C784", fontWeight: "700", marginBottom: "8px" }}>
              👨‍🍳 Session 1: Chef R. Patel (Station Grill)
            </div>
            {chefLockState.chef1Log.length === 0 && <span style={{ color: "#666" }}>Waiting for simulation...</span>}
            {chefLockState.chef1Log.map((line, idx) => (
              <div key={idx} style={{ marginBottom: "4px" }}>
                {line}
              </div>
            ))}
          </div>

          {/* Chef 2 Box */}
          <div
            style={{
              backgroundColor: "#1B1B1B",
              color: "#FFF3E0",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              minHeight: "180px",
            }}
          >
            <div style={{ color: "#FFB74D", fontWeight: "700", marginBottom: "8px" }}>
              👨‍🍳 Session 2: Chef K. Rao (Station Grill)
            </div>
            {chefLockState.chef2Log.length === 0 && <span style={{ color: "#666" }}>Waiting for simulation...</span>}
            {chefLockState.chef2Log.map((line, idx) => (
              <div key={idx} style={{ marginBottom: "4px" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo 3: Automatic Database Trigger check_order_all_served() */}
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              3. Automatic "Order Served" Trigger Verification
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
              When all kitchen tickets of an order become 'served', trigger <code>check_order_all_served()</code> automatically marks <code>orders.status = 'served'</code>.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Order Status:</span>
            <StatusPill status={orderStatus}>{orderStatus}</StatusPill>
          </div>
        </div>

        {/* Item List with Step Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {orderItemsState.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#FAF9F5",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div>
                <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{it.name}</span>
                <span style={{ marginLeft: "10px" }}>
                  <StatusPill status={it.status}>{it.status}</StatusPill>
                </span>
              </div>

              {it.status !== "served" && (
                <Button
                  variant="secondary"
                  onClick={() => handleAdvanceItemInTriggerDemo(it.id)}
                  style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                >
                  Advance to {it.status === "cooking" ? "Ready" : "Served"}
                </Button>
              )}
            </div>
          ))}
        </div>

        {orderStatus === "served" && (
          <div
            style={{
              backgroundColor: "#E8F5E9",
              border: "1px solid #C8E6C9",
              color: "#2D7A4F",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            ✓ Trigger fired: All 3 tickets are now 'served'. The database automatically executed:
            <code>UPDATE orders SET status = 'served' WHERE order_id = ...;</code>
            Now waiter Ayush is unlocked to run <code>request_bill()</code>!
          </div>
        )}
      </div>
    </div>
  );
}

export default KitchenConcurrencyDemo;
