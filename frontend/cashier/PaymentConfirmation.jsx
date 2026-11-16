/**
 * frontend/cashier/PaymentConfirmation.jsx
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Screen 15: Payment Confirmation & Screen 15.1: Bill Already Closed
 * Matches Figma Wireframes (Images 4 & 5):
 * - Screen 15: Green success checkmark, order closed notice, receipt paper layout,
 *   Print receipt (window.print()), Email receipt simulation, and Done button.
 * - Screen 15.1: HTTP 409 Conflict state. Red alert banner: "This order is already closed.
 *   Paid at 14:52 by cashier R. Patel (double-close blocked)", disabled pay/close actions.
 */

import React, { useState } from "react";
import "./cashier.css";

export function PaymentConfirmation({
  bill,
  isAlreadyClosed = false, // Set to true to display Screen 15.1
  onBackToOrders,
  onToggleState, // Helper to toggle between Screen 15 and 15.1
}) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("guest@example.com");
  const [emailSent, setEmailSent] = useState(false);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Simulate email receipt
  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSent(true);
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailSent(false);
    }, 1800);
  };

  // Format paid by text
  const getPaidByText = () => {
    if (bill.payment?.is_split && bill.payment?.payers) {
      return (
        "Paid by: " +
        bill.payment.payers
          .map((p) => `${p.method.toUpperCase()} ($${p.amount.toFixed(2)})`)
          .join(", ")
      );
    }
    const method = bill.payment?.method || "Card";
    return `Paid by: ${method.charAt(0).toUpperCase() + method.slice(1)}`;
  };

  return (
    <div className="cashier-page-container">
      {/* Top System Bar */}
      <div className="cashier-system-bar">
        <div className="cashier-system-title">
          Restaurant Table &amp; Kitchen Order Flow Simulator
        </div>
        <div className="cashier-system-center">
          Cashier – Receipt · {bill.table_no || "T-02"}
        </div>
        <div className="cashier-system-user">
          {bill.cashier_name || "R. Patel"} · Cashier
        </div>
      </div>

      {/* Page Header */}
      <div className="cashier-header">
        <div>
          <span className="cashier-eyebrow">15 / RECEIPT</span>
          <h1 className="cashier-title">Payment Confirmation</h1>
          <p className="cashier-subtitle">
            {isAlreadyClosed
              ? "This order was already closed. No second payment was taken."
              : "Order closed. Print the receipt or return to the table map."}
          </p>
        </div>
        <button
          type="button"
          className="cashier-btn-header-back"
          onClick={onBackToOrders}
        >
          Back to orders
        </button>
      </div>

      {/* Main Centered Content */}
      <div className="cashier-main-content">
        <div className="cashier-confirmation-container">
          {/* ============================================================ */}
          {/* SCREEN 15.1: Bill Already Closed (409 Conflict State)        */}
          {/* ============================================================ */}
          {isAlreadyClosed ? (
            <>
              {/* Red Alert Banner */}
              <div className="cashier-double-close-alert">
                <div className="cashier-alert-icon-circle">✕</div>
                <div>
                  <h4 className="cashier-alert-heading">This order is already closed</h4>
                  <p className="cashier-alert-desc">
                    Paid at {bill.closed_at || "14:52"} by cashier {bill.cashier_name || "R. Patel"} (double-close blocked)
                  </p>
                </div>
              </div>

              {/* Order Closed Header */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 4px 0" }}>
                  Order #{bill.order_id || 1042} • {bill.table_no || "T-02"}
                </h3>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    backgroundColor: "#EFECE6",
                    color: "var(--cashier-text-muted)",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  Status: CLOSED
                </span>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* SCREEN 15: Payment Successful State                          */
            /* ============================================================ */
            <>
              {/* Green Success Checkmark */}
              <div className="cashier-success-circle">✓</div>
              <h2 className="cashier-confirm-title">Payment successful</h2>
              <p className="cashier-confirm-subtitle">
                {bill.table_no || "T-02"} closed · Order #{bill.order_id || 1042}
              </p>
            </>
          )}

          {/* ============================================================ */}
          {/* Thermal Receipt Paper (Shared in 15 & 15.1)                  */}
          {/* ============================================================ */}
          <div className="cashier-receipt-paper" id="printable-receipt">
            {/* Receipt Header */}
            <div className="cashier-receipt-header">
              <div className="cashier-receipt-header-title">RECEIPT</div>
              <div className="cashier-receipt-header-meta">
                {bill.closed_at || "14:52"} · {bill.date_formatted || "02/11/2026"} · Waiter {bill.waiter_name || "A. Smith"}
              </div>
            </div>

            <hr className="cashier-receipt-divider" />

            {/* Line Items */}
            {bill.items?.map((item) => (
              <div key={item.order_item_id} className="cashier-receipt-item-row">
                <span className="cashier-receipt-item-label">
                  {item.quantity} × {item.name}
                </span>
                <span className="cashier-receipt-item-price">
                  ${item.total_price.toFixed(2)}
                </span>
              </div>
            ))}

            <hr className="cashier-receipt-divider" />

            {/* Subtotal */}
            <div className="cashier-receipt-subtotal-row">
              <span>Subtotal</span>
              <span>${(bill.subtotal || 63.5).toFixed(2)}</span>
            </div>

            {/* Discount */}
            {bill.promotion && (
              <div className="cashier-receipt-discount-row">
                <span>Discount {bill.promotion.code}</span>
                <span>-${(bill.promotion.discount_amount || 6.35).toFixed(2)}</span>
              </div>
            )}

            {/* Total */}
            <div className="cashier-receipt-total-row">
              <span className="cashier-receipt-total-label">Total</span>
              <span className="cashier-receipt-total-price">
                ${(bill.total_amount || 57.15).toFixed(2)}
              </span>
            </div>

            {/* Paid By info */}
            <div className="cashier-receipt-paid-by">{getPaidByText()}</div>

            {/* Cash tendered & Change due if cash was paid */}
            {bill.payment?.method === "cash" && bill.payment?.cash_tendered && (
              <div style={{ fontSize: "0.75rem", color: "var(--cashier-text-muted)", marginTop: "4px" }}>
                Tendered: ${bill.payment.cash_tendered.toFixed(2)} · Change: ${bill.payment.change_due?.toFixed(2) || "0.00"}
              </div>
            )}

            {/* Receipt Number */}
            <div style={{ fontSize: "0.7rem", color: "var(--cashier-text-light)", marginTop: "10px", textAlign: "center" }}>
              Receipt {bill.receipt_no || "R-1042"} · Table {bill.table_no || "T-02"}
            </div>
          </div>

          {/* ============================================================ */}
          {/* Action Buttons                                               */}
          {/* ============================================================ */}
          {isAlreadyClosed ? (
            /* Screen 15.1 Buttons */
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button
                  type="button"
                  className="cashier-btn cashier-btn-secondary"
                  onClick={handlePrint}
                >
                  View receipt
                </button>
                <button
                  type="button"
                  className="cashier-btn cashier-btn-primary"
                  onClick={onBackToOrders}
                >
                  Back to orders
                </button>
              </div>
              <div style={{ fontSize: "0.775rem", color: "var(--cashier-text-muted)", marginTop: "12px" }}>
                Pay / Close actions are disabled for closed orders
              </div>
            </div>
          ) : (
            /* Screen 15 Buttons */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button
                  type="button"
                  className="cashier-btn cashier-btn-secondary"
                  style={{ color: "var(--cashier-primary)", borderColor: "var(--cashier-primary)" }}
                  onClick={handlePrint}
                >
                  Print receipt
                </button>
                <button
                  type="button"
                  className="cashier-btn cashier-btn-primary"
                  onClick={onBackToOrders}
                >
                  Done
                </button>
              </div>

              {/* Simulated Email Receipt Button */}
              <button
                type="button"
                className="cashier-btn cashier-btn-secondary"
                style={{ fontSize: "0.85rem", padding: "8px" }}
                onClick={() => setShowEmailModal(true)}
              >
                ✉ Email receipt (simulated)
              </button>
            </div>
          )}

          {/* Wireframe State Switcher Toggle */}
          {onToggleState && (
            <div style={{ marginTop: "20px", borderTop: "1px dashed var(--cashier-border-subtle)", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={onToggleState}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cashier-text-muted)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isAlreadyClosed
                  ? "← Switch to Screen 15 (Payment Success Wireframe)"
                  : "→ Switch to Screen 15.1 (Bill Already Closed / 409 Conflict Wireframe)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Email Receipt Modal */}
      {showEmailModal && (
        <div className="cashier-modal-backdrop">
          <div className="cashier-modal-box">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              Email Receipt
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--cashier-text-muted)", marginBottom: "16px" }}>
              Simulate sending digital receipt for Order #{bill.order_id || 1042}.
            </p>

            {emailSent ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--cashier-success-subtle)",
                  color: "var(--cashier-success)",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                ✓ Receipt emailed to {emailInput}!
              </div>
            ) : (
              <form onSubmit={handleSendEmail}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--cashier-text-muted)",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Guest Email Address:
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--cashier-border)",
                    fontSize: "0.9rem",
                    marginBottom: "16px",
                    outline: "none",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    className="cashier-btn cashier-btn-secondary"
                    style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }}
                    onClick={() => setShowEmailModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cashier-btn cashier-btn-primary"
                    style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }}
                  >
                    Send Receipt
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentConfirmation;
