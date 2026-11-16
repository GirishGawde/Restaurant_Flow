/**
 * frontend/cashier/SplitBill.jsx
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Screen 14: Split Bill & Screen 14.1: Split Mismatch State
 * Matches Figma Wireframes (Images 2, 3, 4):
 * - Equal split, by item split, custom amount split
 * - Number of payers selector (2, 3, 4)
 * - Payer names, assigned amounts, payment methods (Cash, Card, UPI)
 * - Screen 14: Match state ("✓ Totals match"), enabled "Confirm Split & Pay"
 * - Screen 14.1: Mismatch state ("✗ Short by $0.05 – totals do not match"),
 *   red input border, disabled "Confirm Split & Pay" button
 */

import React, { useState, useEffect } from "react";
import "./cashier.css";

export function SplitBill({
  bill,
  onConfirmSplit,
  onBackToBill,
  initialMismatch = false, // If true, opens in Screen 14.1 mismatch state
}) {
  const billTotal = Number((bill.total_amount || 57.15).toFixed(2));
  const [payerCount, setPayerCount] = useState(3);
  const [splitMode, setSplitMode] = useState("equal"); // 'equal' | 'item' | 'custom'

  // Initialize payers
  const [payers, setPayers] = useState(() => {
    if (initialMismatch) {
      return [
        { id: 1, name: "", amount: "19.05", method: "card", assignedItems: [] },
        { id: 2, name: "", amount: "19.05", method: "cash", assignedItems: [] },
        { id: 3, name: "", amount: "19.00", method: "upi", assignedItems: [] }, // $0.05 short!
      ];
    }
    // Default 3 equal payers matching Screen 14 wireframe
    return [
      { id: 1, name: "", amount: "19.05", method: "card", assignedItems: [] },
      { id: 2, name: "", amount: "19.05", method: "cash", assignedItems: [] },
      { id: 3, name: "", amount: "19.05", method: "upi", assignedItems: [] },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Recalculate equal shares when payerCount changes
  const applyEqualSplit = (count) => {
    const baseShare = Math.floor((billTotal / count) * 100) / 100;
    const remainder = Number((billTotal - baseShare * count).toFixed(2));

    const newPayers = Array.from({ length: count }, (_, idx) => {
      // Add pennies remainder to the first payer to guarantee exact sum
      const amt = idx === 0 ? (baseShare + remainder).toFixed(2) : baseShare.toFixed(2);
      const existing = payers[idx];
      return {
        id: idx + 1,
        name: existing?.name || "",
        amount: amt,
        method: existing?.method || (idx === 0 ? "card" : idx === 1 ? "cash" : "upi"),
        assignedItems: [],
      };
    });
    setPayers(newPayers);
  };

  const handlePayerCountChange = (count) => {
    setPayerCount(count);
    if (splitMode === "equal") {
      applyEqualSplit(count);
    } else {
      // Adjust payer array length
      let newPayers = [...payers];
      if (count > payers.length) {
        for (let i = payers.length; i < count; i++) {
          newPayers.push({
            id: i + 1,
            name: "",
            amount: "0.00",
            method: i === 1 ? "cash" : "card",
            assignedItems: [],
          });
        }
      } else {
        newPayers = newPayers.slice(0, count);
      }
      setPayers(newPayers);
    }
  };

  const handleModeChange = (mode) => {
    setSplitMode(mode);
    if (mode === "equal") {
      applyEqualSplit(payerCount);
    }
  };

  const updatePayerField = (index, field, value) => {
    const updated = [...payers];
    updated[index] = { ...updated[index], [field]: value };
    setPayers(updated);
  };

  // Item assignment in 'by item' mode
  const handleItemAssign = (payerIndex, orderItemId) => {
    const item = bill.items.find((i) => i.order_item_id === orderItemId);
    if (!item) return;

    // Toggle item assignment
    const updated = payers.map((p, idx) => {
      let items = [...p.assignedItems];
      if (idx === payerIndex) {
        if (!items.includes(orderItemId)) items.push(orderItemId);
      } else {
        items = items.filter((id) => id !== orderItemId);
      }
      return { ...p, assignedItems: items };
    });

    // Compute proportional amount with discount applied
    const discountRatio = bill.subtotal > 0 ? (bill.subtotal - bill.discount) / bill.subtotal : 1;
    const finalPayers = updated.map((p) => {
      const payerSubtotal = p.assignedItems.reduce((sum, id) => {
        const it = bill.items.find((x) => x.order_item_id === id);
        return sum + (it ? it.total_price : 0);
      }, 0);
      return {
        ...p,
        amount: (payerSubtotal * discountRatio).toFixed(2),
      };
    });

    setPayers(finalPayers);
  };

  // Calculate split total & match status
  const splitTotal = Number(
    payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)
  );
  const diff = Number((billTotal - splitTotal).toFixed(2));
  const isMatch = Math.abs(diff) < 0.009;

  // Trigger simulated mismatch for demonstration (Screen 14.1)
  const setMismatchDemo = () => {
    setSplitMode("custom");
    setPayerCount(3);
    setPayers([
      { id: 1, name: "", amount: "19.05", method: "card", assignedItems: [] },
      { id: 2, name: "", amount: "19.05", method: "cash", assignedItems: [] },
      { id: 3, name: "", amount: "19.00", method: "upi", assignedItems: [] }, // Short by $0.05
    ]);
  };

  // Submit confirmation
  const handleConfirm = async () => {
    if (!isMatch) return;
    setLoading(true);
    setApiError("");
    try {
      await onConfirmSplit(payers);
    } catch (err) {
      setApiError(err.message || "Failed to confirm split payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cashier-page-container">
      {/* Top System Bar */}
      <div className="cashier-system-bar">
        <div className="cashier-system-title">
          Restaurant Table &amp; Kitchen Order Flow Simulator
        </div>
        <div className="cashier-system-center">
          Cashier – Split Bill · {bill.table_no || "T-02"}
        </div>
        <div className="cashier-system-user">
          {bill.cashier_name || "R. Patel"} · Cashier
        </div>
      </div>

      {/* Page Header */}
      <div className="cashier-header">
        <div>
          <span className="cashier-eyebrow">14 / SPLIT BILL</span>
          <h1 className="cashier-title">Split Bill</h1>
          <p className="cashier-subtitle">
            Divide the bill among payers. Split totals must match the bill total.
          </p>
        </div>
        <button
          type="button"
          className="cashier-btn-header-back"
          onClick={onBackToBill}
        >
          Back to bill
        </button>
      </div>

      {/* Main 2-Column Content */}
      <div className="cashier-main-content">
        <div className="cashier-two-col">
          {/* Left Column: Split Controls & Payers Cards */}
          <div className="cashier-card">
            {/* Green Header Banner */}
            <div className="cashier-card-banner">
              <span>Split Bill • ${billTotal.toFixed(2)}</span>
              <span className="cashier-order-badge">Order #{bill.order_id || 1042}</span>
            </div>

            {/* Split Into Controls Row */}
            <div className="cashier-split-controls-row">
              <div className="cashier-split-into">
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--cashier-text-muted)", letterSpacing: "0.05em" }}>
                  SPLIT INTO
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`cashier-payer-num-btn ${payerCount === num ? "active" : ""}`}
                      onClick={() => handlePayerCountChange(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <span style={{ color: "var(--cashier-text-muted)" }}>payers</span>
              </div>

              {/* Mode Toggle: Equal | By Item | Custom */}
              <div className="cashier-mode-toggle">
                <button
                  type="button"
                  className={`cashier-mode-tab ${splitMode === "equal" ? "active" : ""}`}
                  onClick={() => handleModeChange("equal")}
                >
                  Equal
                </button>
                <button
                  type="button"
                  className={`cashier-mode-tab ${splitMode === "item" ? "active" : ""}`}
                  onClick={() => handleModeChange("item")}
                >
                  By Item
                </button>
                <button
                  type="button"
                  className={`cashier-mode-tab ${splitMode === "custom" ? "active" : ""}`}
                  onClick={() => handleModeChange("custom")}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* By Item Assignment UI if active */}
            {splitMode === "item" && (
              <div style={{ padding: "12px 20px", backgroundColor: "#FAF9F6", borderBottom: "1px solid var(--cashier-border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cashier-text-muted)", textTransform: "uppercase" }}>
                  Assign Items to Payers:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                  {bill.items?.map((it) => (
                    <div
                      key={it.order_item_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid var(--cashier-border-subtle)",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <span>{it.quantity} × {it.name} (${it.total_price.toFixed(2)})</span>
                      <select
                        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--cashier-border)", fontSize: "0.8rem" }}
                        value={payers.findIndex((p) => p.assignedItems.includes(it.order_item_id))}
                        onChange={(e) => handleItemAssign(Number(e.target.value), it.order_item_id)}
                      >
                        <option value={-1}>Unassigned</option>
                        {payers.map((p, idx) => (
                          <option key={p.id} value={idx}>
                            Payer {idx + 1} {p.name ? `(${p.name})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payers List */}
            <div style={{ padding: "4px 0 16px 0" }}>
              {payers.map((payer, index) => {
                const isPayerMismatch =
                  !isMatch &&
                  splitMode === "custom" &&
                  index === payers.length - 1; // Highlights Payer 3 in Screen 14.1

                return (
                  <div key={payer.id} className="cashier-payer-card">
                    {/* Left: Payer Title & Name */}
                    <div className="cashier-payer-info">
                      <span className="cashier-payer-title">Payer {index + 1}</span>
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        className="cashier-payer-name-input"
                        value={payer.name}
                        onChange={(e) => updatePayerField(index, "name", e.target.value)}
                      />
                    </div>

                    {/* Middle: Amount */}
                    <div>
                      <span className="cashier-payer-field-label">AMOUNT</span>
                      <div className={`cashier-amount-input-box ${isPayerMismatch ? "mismatch" : ""}`}>
                        <span className="cashier-amount-currency">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="cashier-amount-field"
                          value={payer.amount}
                          readOnly={splitMode === "equal" || splitMode === "item"}
                          onChange={(e) => {
                            if (splitMode !== "custom") setSplitMode("custom");
                            updatePayerField(index, "amount", e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Payment Method Dropdown */}
                    <div>
                      <span className="cashier-payer-field-label">PAYMENT METHOD</span>
                      <select
                        className="cashier-select"
                        value={payer.method}
                        onChange={(e) => updatePayerField(index, "method", e.target.value)}
                      >
                        <option value="card">Card</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Split Check Summary & Actions */}
          <div>
            {/* Split Check Card */}
            <div className="cashier-card cashier-summary-card">
              <div className="cashier-section-label">SPLIT CHECK</div>

              {/* Bill Total */}
              <div className="cashier-summary-row">
                <span style={{ color: "var(--cashier-text-muted)" }}>Bill total</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  ${billTotal.toFixed(2)}
                </span>
              </div>

              {/* Payers Assigned Amounts List */}
              <div style={{ margin: "16px 0", borderTop: "1px dashed var(--cashier-border-subtle)", paddingTop: "12px" }}>
                {payers.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      marginBottom: "8px",
                      color: "var(--cashier-text-muted)",
                    }}
                  >
                    <span>{p.name ? `${p.name} (Payer ${idx + 1})` : `Payer ${idx + 1}`}</span>
                    <span style={{ fontWeight: 600, color: "var(--cashier-text-main)" }}>
                      ${(parseFloat(p.amount) || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Split Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--cashier-border-subtle)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Split total</span>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: isMatch ? "var(--cashier-primary)" : "var(--cashier-danger)",
                  }}
                >
                  ${splitTotal.toFixed(2)}
                </span>
              </div>

              {/* Match / Mismatch Status Box */}
              {isMatch ? (
                <div className="cashier-split-status match">
                  <span>✓</span>
                  <span>Totals match</span>
                </div>
              ) : (
                <div className="cashier-split-status mismatch">
                  <span>✗</span>
                  <span>
                    {diff > 0
                      ? `Short by $${diff.toFixed(2)} – totals do not match`
                      : `Over by $${Math.abs(diff).toFixed(2)} – totals do not match`}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="cashier-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Confirm Split & Pay button (Disabled when mismatch) */}
                <button
                  type="button"
                  className="cashier-btn cashier-btn-primary"
                  disabled={!isMatch || loading}
                  onClick={handleConfirm}
                >
                  {loading ? "Validating Split..." : "Confirm Split & Pay"}
                </button>

                <button
                  type="button"
                  className="cashier-btn cashier-btn-secondary"
                  onClick={onBackToBill}
                >
                  Cancel
                </button>
              </div>

              {/* Helper Caption */}
              <div className="cashier-split-caption">
                {isMatch
                  ? "All payers set · ready to confirm"
                  : "Confirm stays disabled until the totals match"}
              </div>

              {apiError && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    backgroundColor: "var(--cashier-danger-subtle)",
                    color: "var(--cashier-danger)",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    textAlign: "center",
                  }}
                >
                  {apiError}
                </div>
              )}
            </div>

            {/* Screen 14.1 Wireframe Preview Button */}
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={isMatch ? setMismatchDemo : () => applyEqualSplit(payerCount)}
                style={{
                  background: "none",
                  border: "none",
                  color: isMatch ? "var(--cashier-danger)" : "var(--cashier-primary)",
                  fontSize: "0.775rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isMatch
                  ? "Toggle Screen 14.1 (Split Mismatch Wireframe)"
                  : "Resolve Mismatch (Equalize to Screen 14)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitBill;
