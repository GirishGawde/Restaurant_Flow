/**
 * frontend/cashier/OpenBills.jsx
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Open Bills List (Landing view for Cashier role)
 * Displays unpaid bills awaiting payment and settlement.
 */

import React, { useState, useEffect } from "react";
import { fetchOpenBills } from "./cashierApi";
import "./cashier.css";

export function OpenBills({ onSelectBill }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpenBills().then((data) => {
      setBills(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="cashier-page-container">
      {/* Top System Bar */}
      <div className="cashier-system-bar">
        <div className="cashier-system-title">
          Restaurant Table &amp; Kitchen Order Flow Simulator
        </div>
        <div className="cashier-system-center">
          Cashier – Open Bills List
        </div>
        <div className="cashier-system-user">
          R. Patel · Cashier
        </div>
      </div>

      {/* Page Header */}
      <div className="cashier-header">
        <div>
          <span className="cashier-eyebrow">CASHIER / OPEN BILLS</span>
          <h1 className="cashier-title">Open Bills</h1>
          <p className="cashier-subtitle">
            Bills requested by waiters awaiting payment and settlement.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="cashier-main-content">
        <div className="cashier-card">
          <div className="cashier-card-banner">
            <span>Pending Settlements</span>
            <span className="cashier-order-badge">{bills.length} open</span>
          </div>

          <table className="cashier-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>TABLE / SECTION</th>
                <th>WAITER</th>
                <th>REQUESTED AT</th>
                <th>ITEMS</th>
                <th style={{ textAlign: "right" }}>SUBTOTAL</th>
                <th style={{ textAlign: "right" }}>DISCOUNT</th>
                <th style={{ textAlign: "right" }}>TOTAL</th>
                <th style={{ textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--cashier-text-muted)" }}>
                    Loading open bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--cashier-text-muted)" }}>
                    No open bills awaiting payment.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.order_id}>
                    <td style={{ fontWeight: 700 }}>#{b.order_id}</td>
                    <td>
                      <strong>{b.table_no}</strong> · {b.section} ({b.guests} guests)
                    </td>
                    <td>{b.waiter}</td>
                    <td style={{ color: "var(--cashier-text-muted)" }}>{b.requested_at}</td>
                    <td>{b.items_count} items</td>
                    <td style={{ textAlign: "right" }}>${b.subtotal.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "var(--cashier-primary)" }}>
                      {b.discount > 0 ? `-$${b.discount.toFixed(2)}` : "-"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontSize: "1rem" }}>
                      ${b.total.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="cashier-btn cashier-btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.825rem", width: "auto" }}
                        onClick={() => onSelectBill(b.order_id)}
                      >
                        Open Bill &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OpenBills;
