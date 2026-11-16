/**
 * frontend/cashier/BillPayment.jsx
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Screen 13: Bill and Payment
 * Matches Figma Wireframe (Image 1):
 * - Itemised bill with kitchen served timestamps (handoff from Diya's tickets)
 * - Order notes and order freeze notice
 * - Payment method selector (Cash, Card, UPI)
 * - Cash tendered and change due calculation
 * - Audit log bill history (handoff from Girish's v_order_history)
 * - Tax included (no tax line); Total = subtotal - discount
 */

import React, { useState } from "react";
import "./cashier.css";

export function BillPayment({
  bill,
  onNavigateToSplit,
  onPayAndClose,
  onBackToOrders,
  onSimulate409,
}) {
  const [selectedMethod, setSelectedMethod] = useState("card"); // 'cash' | 'card' | 'upi'
  const [cashTendered, setCashTendered] = useState("60.00");
  const [showHistory, setShowHistory] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = bill.subtotal || 63.5;
  const discount = bill.promotion?.discount_amount || 6.35;
  const total = Number((subtotal - discount).toFixed(2));

  // Cash change due calculation
  const numericTendered = parseFloat(cashTendered) || 0;
  const changeDue = numericTendered >= total ? (numericTendered - total).toFixed(2) : null;
  const isTenderSufficient = numericTendered >= total;

  const handlePayment = async () => {
    setLoading(true);
    try {
      await onPayAndClose({
        method: selectedMethod,
        amount: total,
        cash_tendered: selectedMethod === "cash" ? numericTendered : null,
        change_due: selectedMethod === "cash" && changeDue ? parseFloat(changeDue) : null,
      });
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
          Cashier – Bill &amp; Payment · {bill.table_no || "T-02"}
        </div>
        <div className="cashier-system-user">
          {bill.cashier_name || "R. Patel"} · Cashier
        </div>
      </div>

      {/* Page Header */}
      <div className="cashier-header">
        <div>
          <span className="cashier-eyebrow">13 / BILL &amp; PAYMENT</span>
          <h1 className="cashier-title">Bill &amp; Payment</h1>
          <p className="cashier-subtitle">
            Review the itemised bill, choose a payment method and close the order.
          </p>
        </div>
        <button
          type="button"
          className="cashier-btn-header-back"
          onClick={onBackToOrders}
        >
          Back to order
        </button>
      </div>

      {/* Main 2-Column Content */}
      <div className="cashier-main-content">
        <div className="cashier-two-col">
          {/* Left Column: Bill Table & Details */}
          <div className="cashier-card">
            {/* Dark Green Header Banner */}
            <div className="cashier-card-banner">
              <span>Bill • {bill.table_no || "T-02"}</span>
              <span className="cashier-order-badge">Order #{bill.order_id || 1042}</span>
            </div>

            {/* Order Metadata Sub-bar */}
            <div className="cashier-order-meta">
              <div className="cashier-order-meta-title">
                {bill.table_no || "T-02"} • {bill.guests || 3} guests • {bill.waiter_name || "A. Smith"}
              </div>
              <div className="cashier-order-meta-sub">
                {bill.section || "Main Hall"} • Opened {bill.opened_at || "14:23"} • Bill requested {bill.bill_requested_at || "14:50"}
              </div>
            </div>

            {/* Itemised Table */}
            <table className="cashier-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th style={{ textAlign: "center" }}>QTY</th>
                  <th style={{ textAlign: "right" }}>PRICE</th>
                  <th style={{ textAlign: "right" }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {bill.items?.map((item) => (
                  <tr key={item.order_item_id}>
                    <td>
                      <div className="cashier-item-name">
                        <span>{item.name}</span>
                        {item.served_at && (
                          <span className="cashier-served-pill">
                            Served {item.served_at}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      ${item.total_price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Item Count */}
            <div className="cashier-table-count">
              {bill.items?.reduce((sum, item) => sum + item.quantity, 0) || 6} items
            </div>

            {/* Order Notes */}
            {bill.order_notes && (
              <div className="cashier-notes-box">
                <div className="cashier-notes-label">ORDER NOTES</div>
                <div className="cashier-notes-content">{bill.order_notes}</div>
              </div>
            )}

            {/* Bill History Timeline (from Girish's audit log v_order_history) */}
            <div className="cashier-history-section">
              <button
                type="button"
                className="cashier-history-toggle"
                onClick={() => setShowHistory(!showHistory)}
              >
                <span>{showHistory ? "▼" : "▶"}</span>
                <span>Bill &amp; Order History ({bill.history?.length || 7} events)</span>
              </button>

              {showHistory && (
                <ul className="cashier-history-list">
                  {bill.history?.map((h, i) => (
                    <li key={i}>
                      <span className="cashier-history-time">{h.time}</span>
                      <span>{h.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Order Freeze Note */}
            <div
              style={{
                padding: "10px 20px 14px 20px",
                fontSize: "0.775rem",
                color: "var(--cashier-text-muted)",
                borderTop: "1px solid var(--cashier-border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ color: "var(--cashier-primary)", fontWeight: "bold" }}>🔒</span>
              <span>Order is frozen: no item changes permitted after bill request.</span>
            </div>
          </div>

          {/* Right Column: Summary, Payment & Actions */}
          <div>
            {/* Summary Card */}
            <div className="cashier-card cashier-summary-card">
              <div className="cashier-section-label">SUMMARY</div>

              {/* Subtotal */}
              <div className="cashier-summary-row">
                <span style={{ color: "var(--cashier-text-muted)" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
              </div>

              {/* Applied Promotion */}
              {bill.promotion && (
                <div className="cashier-promo-row">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="cashier-promo-tag">{bill.promotion.code}</span>
                    <span className="cashier-promo-label">
                      {bill.promotion.label || "10% staff discount"}
                    </span>
                  </div>
                  <span className="cashier-promo-discount">
                    -${discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total (Prices include tax. No tax line.) */}
              <div className="cashier-total-row">
                <span className="cashier-total-label">Total</span>
                <span className="cashier-total-amount">${total.toFixed(2)}</span>
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--cashier-text-muted)",
                  textAlign: "right",
                  marginTop: "2px",
                }}
              >
                (Prices include applicable taxes)
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="cashier-card cashier-payment-card">
              <div className="cashier-section-label">PAYMENT METHOD</div>

              <div className="cashier-methods-grid">
                {/* Cash Tile */}
                <div
                  className={`cashier-method-tile ${selectedMethod === "cash" ? "selected" : ""}`}
                  onClick={() => setSelectedMethod("cash")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cashier-method-icon-box">
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>$</span>
                  </div>
                  <span>Cash</span>
                </div>

                {/* Card Tile */}
                <div
                  className={`cashier-method-tile ${selectedMethod === "card" ? "selected" : ""}`}
                  onClick={() => setSelectedMethod("card")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cashier-method-icon-box">
                    <span style={{ width: 16, height: 2, background: "currentColor", borderRadius: 1 }} />
                  </div>
                  <span>Card</span>
                </div>

                {/* UPI Tile */}
                <div
                  className={`cashier-method-tile ${selectedMethod === "upi" ? "selected" : ""}`}
                  onClick={() => setSelectedMethod("upi")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cashier-method-icon-box">
                    <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>⚡</span>
                  </div>
                  <span>UPI</span>
                </div>
              </div>

              <div className="cashier-method-selected-label">
                Selected: {selectedMethod === "card" ? "Card" : selectedMethod === "cash" ? "Cash" : "UPI"}
              </div>

              {/* Cash Tendered & Change due (when Cash selected) */}
              {selectedMethod === "cash" && (
                <div className="cashier-cash-tender-box">
                  <label
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--cashier-text-muted)",
                      textTransform: "uppercase",
                      display: "block",
                    }}
                  >
                    Cash Tendered
                  </label>
                  <div className="cashier-input-group">
                    <span className="cashier-input-prefix">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="cashier-text-input"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="cashier-change-row">
                    <span style={{ color: "var(--cashier-text-muted)" }}>Change Due:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: isTenderSufficient ? "var(--cashier-primary)" : "var(--cashier-danger)",
                      }}
                    >
                      {isTenderSufficient ? `$${changeDue}` : "Insufficient cash"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="cashier-btn cashier-btn-split"
                onClick={onNavigateToSplit}
              >
                Split Bill
              </button>

              <button
                type="button"
                className="cashier-btn cashier-btn-primary"
                disabled={loading || (selectedMethod === "cash" && !isTenderSufficient)}
                onClick={handlePayment}
              >
                {loading ? "Processing..." : `Pay $${total.toFixed(2)} & Close Order`}
              </button>

              {/* Demo button to simulate 409 double close conflict */}
              {onSimulate409 && (
                <button
                  type="button"
                  onClick={onSimulate409}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cashier-danger)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "4px",
                    textAlign: "center",
                  }}
                >
                  Simulate API 409 (Double-Close Conflict)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillPayment;
