/**
 * frontend/cashier/CashierApp.jsx
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Main Interactive Website Container for the Cashier Screens.
 * Features an integrated wireframe switcher to preview, test, and demonstrate:
 * - Screen 13: Bill and Payment
 * - Screen 14: Split Bill (Equal, By Item, Custom)
 * - Screen 14.1: Split mismatch (Confirm button disabled)
 * - Screen 15: Payment Confirmation (receipt, Print receipt, Email receipt simulated)
 * - Screen 15.1: Bill already closed (HTTP 409 double-close conflict blocked)
 */

import React, { useState, useEffect } from "react";
import BillPayment from "./BillPayment";
import SplitBill from "./SplitBill";
import PaymentConfirmation from "./PaymentConfirmation";
import OpenBills from "./OpenBills";
import {
  fetchBill,
  recordPayment,
  confirmSplitPayment,
  setSimulatedClosedState,
  resetMockBill,
} from "./cashierApi";
import "./cashier.css";

export function CashierApp() {
  // Active screen state: 'screen13' | 'screen14' | 'screen14_1' | 'screen15' | 'screen15_1' | 'open_bills'
  const [activeScreen, setActiveScreen] = useState("screen13");
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Load bill data
  const loadBill = async () => {
    setLoading(true);
    const data = await fetchBill(1042);
    setBill(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBill();
  }, []);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handler: Single payment from Screen 13
  const handlePayAndClose = async (paymentDetails) => {
    try {
      await recordPayment(bill.bill_id, paymentDetails);
      await loadBill();
      setActiveScreen("screen15");
      showNotification("Payment processed successfully! Order closed.", "success");
    } catch (err) {
      if (err.status === 409 || err.code === "ALREADY_PAID") {
        setActiveScreen("screen15_1");
        showNotification(err.message, "danger");
      } else {
        alert(err.message);
      }
    }
  };

  // Handler: Split payment from Screen 14
  const handleConfirmSplit = async (payers) => {
    try {
      await confirmSplitPayment(bill.bill_id, payers);
      await loadBill();
      setActiveScreen("screen15");
      showNotification("Split payments settled successfully! Order closed.", "success");
    } catch (err) {
      if (err.status === 409) {
        showNotification(err.message, "danger");
      }
      throw err;
    }
  };

  // Helper: Force 409 Conflict Simulation
  const handleSimulate409 = () => {
    setSimulatedClosedState(true);
    loadBill();
    setActiveScreen("screen15_1");
    showNotification("HTTP 409 Conflict: Double-close prevented by database row lock.", "danger");
  };

  // Helper: Reset mock data
  const handleReset = () => {
    resetMockBill();
    loadBill();
    setActiveScreen("screen13");
    showNotification("Bill reset to initial open state (T-02 • Order #1042).", "info");
  };

  if (loading || !bill) {
    return (
      <div style={{ padding: "48px", textAlign: "center", fontFamily: "sans-serif", color: "#6B6860" }}>
        Loading Cashier Simulator...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Wireframe Navigation & State Switcher Bar */}
      <div className="cashier-wireframe-switcher">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ color: "#FFF" }}>Figma Wireframe Switcher:</strong>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "screen13" ? "active" : ""}`}
            onClick={() => setActiveScreen("screen13")}
          >
            Screen 13 (Bill &amp; Pay)
          </button>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "screen14" ? "active" : ""}`}
            onClick={() => setActiveScreen("screen14")}
          >
            Screen 14 (Split Bill)
          </button>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "screen14_1" ? "active" : ""}`}
            onClick={() => setActiveScreen("screen14_1")}
          >
            Screen 14.1 (Split Mismatch)
          </button>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "screen15" ? "active" : ""}`}
            onClick={() => setActiveScreen("screen15")}
          >
            Screen 15 (Confirmation)
          </button>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "screen15_1" ? "active" : ""}`}
            onClick={() => setActiveScreen("screen15_1")}
          >
            Screen 15.1 (409 Closed)
          </button>
          <button
            type="button"
            className={`cashier-switcher-btn ${activeScreen === "open_bills" ? "active" : ""}`}
            onClick={() => setActiveScreen("open_bills")}
          >
            Open Bills List
          </button>
        </div>

        <button
          type="button"
          onClick={handleReset}
          style={{
            background: "none",
            border: "1px solid #6C757D",
            color: "#ADB5BD",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
        >
          Reset Demo State
        </button>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            right: "24px",
            zIndex: 9999,
            padding: "10px 16px",
            borderRadius: "6px",
            backgroundColor:
              notification.type === "danger"
                ? "var(--cashier-danger)"
                : notification.type === "success"
                ? "var(--cashier-primary)"
                : "#333",
            color: "#FFF",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Active Screen View */}
      <div style={{ flex: 1 }}>
        {activeScreen === "screen13" && (
          <BillPayment
            bill={bill}
            onNavigateToSplit={() => setActiveScreen("screen14")}
            onPayAndClose={handlePayAndClose}
            onBackToOrders={() => setActiveScreen("open_bills")}
            onSimulate409={handleSimulate409}
          />
        )}

        {activeScreen === "screen14" && (
          <SplitBill
            bill={bill}
            initialMismatch={false}
            onConfirmSplit={handleConfirmSplit}
            onBackToBill={() => setActiveScreen("screen13")}
          />
        )}

        {activeScreen === "screen14_1" && (
          <SplitBill
            bill={bill}
            initialMismatch={true}
            onConfirmSplit={handleConfirmSplit}
            onBackToBill={() => setActiveScreen("screen13")}
          />
        )}

        {activeScreen === "screen15" && (
          <PaymentConfirmation
            bill={bill}
            isAlreadyClosed={false}
            onBackToOrders={() => setActiveScreen("open_bills")}
            onToggleState={() => setActiveScreen("screen15_1")}
          />
        )}

        {activeScreen === "screen15_1" && (
          <PaymentConfirmation
            bill={bill}
            isAlreadyClosed={true}
            onBackToOrders={() => setActiveScreen("open_bills")}
            onToggleState={() => setActiveScreen("screen15")}
          />
        )}

        {activeScreen === "open_bills" && (
          <OpenBills
            onSelectBill={(orderId) => {
              loadBill();
              setActiveScreen("screen13");
            }}
          />
        )}
      </div>
    </div>
  );
}

export default CashierApp;
