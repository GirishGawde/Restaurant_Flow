/**
 * src/pages/waiter/MyOrders.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 10: Waiter My Orders
 * - Summary metric cards: Total Orders, Open Orders, Completed Orders, Total Sales (₹)
 * - Tabs: All, Open, Past
 * - Search by order ID, table number, or waiter
 * - "My Orders Only" filter toggle
 * - Data table with status pills, INR prices, item counts, timestamps
 * - Action: "View Order" for active orders, "View Receipt" for completed orders
 * - Receipt modal for settled orders
 * - Empty state with "Clear Filters" action
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import { formatMoney, formatTime, formatDateTime } from "../../utils/format";
import { waiterStore } from "../../mocks/waiterMockStore";
import { fetchMyOrders } from "../../api/waiter";

export function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'open' | 'past'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMyOrdersOnly, setFilterMyOrdersOnly] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  const loggedInWaiterName = user?.name || user?.username || "A. Smith";

  // Load orders and subscribe to live store
  useEffect(() => {
    const load = async () => {
      const data = await fetchMyOrders();
      setOrders(data);
      setLoading(false);
    };
    load();

    let unsubscribe = () => {};
    if (import.meta.env.VITE_USE_MOCKS !== "false") {
      unsubscribe = waiterStore.subscribe((state) => {
        setOrders([...state.orders]);
      });
    }
    return () => unsubscribe();
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const openCount = orders.filter((o) => o.status !== "completed").length;
    const completedCount = orders.filter((o) => o.status === "completed").length;
    const totalSales = orders.reduce((sum, o) => sum + (o.final_total || 0), 0);

    return { total, openCount, completedCount, totalSales };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === "open" && o.status === "completed") return false;
      if (activeTab === "past" && o.status !== "completed") return false;

      // Waiter filter
      if (filterMyOrdersOnly && o.waiter && o.waiter.toLowerCase() !== loggedInWaiterName.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = o.order_id.toLowerCase().includes(q);
        const matchTable = o.table_no.toLowerCase().includes(q);
        const matchWaiter = o.waiter && o.waiter.toLowerCase().includes(q);
        const matchNotes = o.notes && o.notes.toLowerCase().includes(q);
        const matchItem = o.items && o.items.some((i) => i.name.toLowerCase().includes(q));

        if (!matchId && !matchTable && !matchWaiter && !matchNotes && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, filterMyOrdersOnly, searchQuery, loggedInWaiterName]);

  const handleClearFilters = () => {
    setActiveTab("all");
    setSearchQuery("");
    setFilterMyOrdersOnly(false);
  };

  const handlePrintReceipt = () => {
    toast.info("Opening system print dialog for customer receipt...");
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading waiter orders...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)" }}>
      {/* 1. Header with New Order Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "#FFFFFF",
          padding: "16px 20px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--color-text-main)" }}>
              Order History &amp; Tracking
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Waiter Shift Log
            </span>
          </div>
          <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            Monitor active dining tables, review dish orders, and verify settled receipts.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate("/waiter/orders/new")}
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
        >
          + Open New Order
        </Button>
      </div>

      {/* 2. Four Summary Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {/* Total Orders */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--color-primary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Total Orders
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "4px" }}>
                {metrics.total}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Today's dining tickets</span>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              📋
            </div>
          </div>
        </Card>

        {/* Open Orders */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--pill-amber-text)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Active / Open
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--pill-amber-text)", marginTop: "4px" }}>
                {metrics.openCount}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>In service or kitchen</span>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--pill-amber-bg)",
                color: "var(--pill-amber-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🔥
            </div>
          </div>
        </Card>

        {/* Completed Orders */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--pill-green-text)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Completed
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--pill-green-text)", marginTop: "4px" }}>
                {metrics.completedCount}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Settled &amp; closed</span>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--pill-green-bg)",
                color: "var(--pill-green-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              ✓
            </div>
          </div>
        </Card>

        {/* Total Sales */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid #1E6F5C" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Total Order Value
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "4px" }}>
                {formatMoney(metrics.totalSales, "₹")}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Net revenue tracked</span>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-bg-page)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                fontWeight: 700,
              }}
            >
              ₹
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Filter Toolbar & Tabs */}
      <Card padding="var(--spacing-md) var(--spacing-lg)">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          
          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "all", label: `All Orders (${metrics.total})` },
              { id: "open", label: `Open (${metrics.openCount})` },
              { id: "past", label: `Past / Closed (${metrics.completedCount})` },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                    backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
                    color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search and Waiter Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "240px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, table, or dish..."
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.825rem",
                  outline: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                }}
              >
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* My Orders Toggle */}
            <button
              onClick={() => setFilterMyOrdersOnly((prev) => !prev)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor: filterMyOrdersOnly ? "var(--color-primary)" : "var(--color-border)",
                backgroundColor: filterMyOrdersOnly ? "var(--color-primary-subtle)" : "#FFFFFF",
                color: filterMyOrdersOnly ? "var(--color-primary)" : "var(--color-text-muted)",
                fontSize: "0.825rem",
                fontWeight: filterMyOrdersOnly ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {filterMyOrdersOnly ? "✓ My Orders Only" : "All Waiters"}
            </button>

            {/* Clear Filters Button if any active */}
            {(activeTab !== "all" || searchQuery || filterMyOrdersOnly) && (
              <button
                onClick={handleClearFilters}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-danger)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Orders Data Table */}
      <Card padding="0" style={{ overflow: "hidden" }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--spacing-2xl) var(--spacing-lg)", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", margin: "0 0 4px 0" }}>
              No orders found
            </h3>
            <p style={{ fontSize: "0.825rem", margin: "0 0 16px 0" }}>
              No dining orders match your selected filters.
            </p>
            <Button variant="secondary" onClick={handleClearFilters} style={{ fontSize: "0.85rem" }}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--color-bg-page)",
                    borderBottom: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Order ID</th>
                  <th style={{ padding: "12px 16px" }}>Table</th>
                  <th style={{ padding: "12px 16px" }}>Guests</th>
                  <th style={{ padding: "12px 16px" }}>Waiter</th>
                  <th style={{ padding: "12px 16px" }}>Items</th>
                  <th style={{ padding: "12px 16px" }}>Time</th>
                  <th style={{ padding: "12px 16px" }}>Subtotal</th>
                  <th style={{ padding: "12px 16px" }}>Discount</th>
                  <th style={{ padding: "12px 16px" }}>Final Total</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => {
                  const isCompleted = ord.status === "completed";
                  const totalItemsCount = ord.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr
                      key={ord.order_id}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "var(--color-bg-page)",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Order ID & Version */}
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--color-primary)" }}>
                        <div>{ord.order_id}</div>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                          v{ord.version}
                        </span>
                      </td>

                      {/* Table */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600 }}>{ord.table_no}</div>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {ord.section}
                        </span>
                      </td>

                      {/* Guests */}
                      <td style={{ padding: "12px 16px" }}>
                        {ord.guest_count} guests
                      </td>

                      {/* Waiter */}
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                        {ord.waiter}
                      </td>

                      {/* Items */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          title={ord.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                          style={{ cursor: "help" }}
                        >
                          {totalItemsCount} items
                        </span>
                      </td>

                      {/* Time */}
                      <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>
                        {formatTime(ord.created_at)}
                      </td>

                      {/* Subtotal */}
                      <td style={{ padding: "12px 16px" }}>
                        {formatMoney(ord.subtotal, "₹")}
                      </td>

                      {/* Discount */}
                      <td style={{ padding: "12px 16px" }}>
                        {ord.discount_code ? (
                          <span style={{ color: "var(--pill-green-text)", fontWeight: 600 }}>
                            -{formatMoney(ord.discount_amount, "₹")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-light)" }}>–</span>
                        )}
                      </td>

                      {/* Final Total */}
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--color-text-main)" }}>
                        {formatMoney(ord.final_total, "₹")}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <StatusPill status={ord.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {isCompleted ? (
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedReceiptOrder(ord)}
                            style={{ padding: "4px 10px", fontSize: "0.775rem" }}
                          >
                            View Receipt
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => navigate(`/waiter/orders/${ord.order_id}`)}
                            style={{ padding: "4px 10px", fontSize: "0.775rem" }}
                          >
                            View Order →
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Customer Receipt Modal (Cashier Module Integration State) */}
      {selectedReceiptOrder && (
        <Modal
          isOpen={Boolean(selectedReceiptOrder)}
          onClose={() => setSelectedReceiptOrder(null)}
          title={`Settlement Receipt · ${selectedReceiptOrder.order_id}`}
          maxWidth="460px"
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Settled by Cashier Module
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="secondary" onClick={handlePrintReceipt} style={{ fontSize: "0.8rem" }}>
                  🖨 Print
                </Button>
                <Button variant="primary" onClick={() => setSelectedReceiptOrder(null)} style={{ fontSize: "0.8rem" }}>
                  Done
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
            {/* Header info */}
            <div style={{ textAlign: "center", paddingBottom: "12px", borderBottom: "1px dashed var(--color-border)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Restaurant Flow POS</h3>
              <p style={{ fontSize: "0.775rem", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
                Table {selectedReceiptOrder.table_no} • {selectedReceiptOrder.section} • {formatDateTime(selectedReceiptOrder.created_at)}
              </p>
              <div style={{ marginTop: "6px" }}>
                <StatusPill variant="green">PAID IN FULL</StatusPill>
              </div>
            </div>

            {/* Items Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {selectedReceiptOrder.items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {it.name} <span style={{ color: "var(--color-text-muted)" }}>x{it.quantity}</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(it.total_price, "₹")}</span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div
              style={{
                borderTop: "1px dashed var(--color-border)",
                paddingTop: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-muted)" }}>
                <span>Subtotal:</span>
                <span>{formatMoney(selectedReceiptOrder.subtotal, "₹")}</span>
              </div>
              {selectedReceiptOrder.discount_code && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--pill-green-text)", fontWeight: 600 }}>
                  <span>Discount ({selectedReceiptOrder.discount_code}):</span>
                  <span>-{formatMoney(selectedReceiptOrder.discount_amount, "₹")}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: 700, marginTop: "4px" }}>
                <span>Total Paid:</span>
                <span style={{ color: "var(--color-primary)" }}>{formatMoney(selectedReceiptOrder.final_total, "₹")}</span>
              </div>
            </div>

            {/* Cashier Verification Note */}
            <div
              style={{
                padding: "8px 10px",
                backgroundColor: "var(--color-bg-page)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              Staff: <strong>{selectedReceiptOrder.waiter}</strong> • Settlement Ref: <strong>#REC-8842</strong>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MyOrders;
