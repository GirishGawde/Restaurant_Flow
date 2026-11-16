/**
 * src/pages/waiter/components/ApplyDiscountModal.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 9: Apply Discount Modal / Page
 * - Enter promotion code (e.g. STAFF10 or WELCOME5)
 * - Select from eligible promotion cards
 * - One promotion per order validation rule
 * - Displays subtotal, discount reduction in ₹, and final total
 */

import React, { useState } from "react";
import Modal from "../../../components/Modal";
import Button from "../../../components/Button";
import { formatMoney } from "../../../utils/format";

export function ApplyDiscountModal({
  isOpen,
  onClose,
  order,
  onApplyPromo,
  onRemovePromo,
}) {
  const [promoInput, setPromoInput] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !order) return null;

  const availablePromotions = [
    {
      code: "STAFF10",
      title: "10% Staff Courtesy Discount",
      discountType: "Percentage",
      value: "10%",
      description: "Eligible for staff shift dining and internal courtesy orders.",
    },
    {
      code: "WELCOME5",
      title: "₹5 Welcome Guest Voucher",
      discountType: "Fixed Amount",
      value: "₹5.00",
      description: "Introductory welcome perk for new dining table guests.",
    },
  ];

  const handleApply = (codeToApply) => {
    setError("");
    const code = (codeToApply || promoInput).trim().toUpperCase();

    if (!code) {
      setError("Please enter a valid promotion code.");
      return;
    }

    if (code !== "STAFF10" && code !== "WELCOME5") {
      setError(`Invalid promotion code "${code}". Eligible codes are STAFF10 or WELCOME5.`);
      return;
    }

    try {
      onApplyPromo(code);
      setPromoInput("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to apply discount.");
    }
  };

  const handleRemove = () => {
    setError("");
    onRemovePromo();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Promotion Code"
      maxWidth="500px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Header Order Reference */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-bg-page)",
            border: "1px solid var(--color-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.85rem",
          }}
        >
          <span>Table: <strong>{order.table_no}</strong> ({order.order_id})</span>
          <span>Current Subtotal: <strong style={{ color: "var(--color-primary)" }}>{formatMoney(order.subtotal, "₹")}</strong></span>
        </div>

        {/* If a promo is already applied */}
        {order.discount_code ? (
          <div
            style={{
              padding: "14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--pill-green-bg)",
              border: "1px solid var(--pill-green-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {order.discount_code}
                </span>
                <span style={{ fontWeight: 600, color: "var(--pill-green-text)", fontSize: "0.9rem" }}>
                  Active Discount Applied
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-main)", marginTop: "4px" }}>
                Savings: <strong>-{formatMoney(order.discount_amount, "₹")}</strong>
              </div>
            </div>

            <Button
              variant="danger"
              onClick={handleRemove}
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Remove
            </Button>
          </div>
        ) : (
          /* Promo Input */
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Enter Promotion Code
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setError("");
                }}
                placeholder="e.g. STAFF10 or WELCOME5"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.875rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              />
              <Button variant="primary" onClick={() => handleApply()}>
                Apply Code
              </Button>
            </div>
            {error && (
              <div style={{ color: "var(--color-danger)", fontSize: "0.8rem", marginTop: "4px" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Available Eligible Promotions */}
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Available Eligible Promotions
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {availablePromotions.map((promo) => {
              const isCurrent = order.discount_code === promo.code;
              return (
                <div
                  key={promo.code}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: isCurrent ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    backgroundColor: isCurrent ? "var(--color-primary-subtle)" : "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{promo.code}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>
                        ({promo.value} Off)
                      </span>
                    </div>
                    <div style={{ fontSize: "0.775rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {promo.description}
                    </div>
                  </div>

                  {!isCurrent && (
                    <Button
                      variant="secondary"
                      onClick={() => handleApply(promo.code)}
                      style={{ padding: "4px 10px", fontSize: "0.775rem" }}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculated Totals Preview */}
        <div
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Subtotal:</span>
            <span>{formatMoney(order.subtotal, "₹")}</span>
          </div>
          {order.discount_code && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--pill-green-text)", fontWeight: 600 }}>
              <span>Discount ({order.discount_code}):</span>
              <span>-{formatMoney(order.discount_amount, "₹")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 700, marginTop: "4px" }}>
            <span>Final Total:</span>
            <span style={{ color: "var(--color-primary)" }}>{formatMoney(order.final_total, "₹")}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ApplyDiscountModal;
