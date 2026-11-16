/**
 * src/pages/waiter/TableMap.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 4: Waiter Table Map
 * - Summary metric cards: Total Tables, Free Tables, Occupied Tables, Needs Cleaning
 * - Section navigation filter & status legend
 * - Table cards grid with real-time status badges, capacity, guest count, waiter, and activity
 * - Table Context detail panel with contextual actions:
 *   - Free: Open New Order (navigates to Screen 5)
 *   - Occupied: View Current Order (navigates to Screen 7)
 *   - Needs Cleaning: Mark as Clean (re-activates table to Free reactively)
 *   - Reserved: Warning indicator
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { waiterStore } from "../../mocks/waiterMockStore";
import { fetchTables, markTableClean } from "../../api/waiter";

export function TableMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("All");
  const [filterMyTables, setFilterMyTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(2); // default selection: T-02

  const loggedInWaiterName = user?.name || user?.username || "A. Smith";

  // Load tables from store and subscribe to real-time changes
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTables();
      setTables(data);
      setLoading(false);
    };
    loadData();

    // Subscribe to mock store changes only when in mock mode
    let unsubscribe = () => {};
    if (import.meta.env.VITE_USE_MOCKS !== "false") {
      unsubscribe = waiterStore.subscribe((newState) => {
        setTables([...newState.tables]);
      });
    }
    return () => unsubscribe();
  }, []);

  // Summary statistics
  const stats = useMemo(() => {
    const total = tables.length;
    const free = tables.filter((t) => t.status === "free").length;
    const occupied = tables.filter((t) => t.status === "occupied").length;
    const reserved = tables.filter((t) => t.status === "reserved").length;
    const cleaning = tables.filter((t) => t.status === "needs_cleaning").length;
    return { total, free, occupied, reserved, cleaning };
  }, [tables]);

  // Section list
  const sections = useMemo(() => {
    const unique = Array.from(new Set(tables.map((t) => t.section)));
    return ["All", ...unique];
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSection = selectedSection === "All" || t.section === selectedSection;
      const matchMyTables = !filterMyTables || (t.waiter && t.waiter.toLowerCase() === loggedInWaiterName.toLowerCase());
      return matchSection && matchMyTables;
    });
  }, [tables, selectedSection, filterMyTables, loggedInWaiterName]);

  // Selected table object
  const selectedTable = useMemo(() => {
    return tables.find((t) => t.table_id === selectedTableId) || tables[0] || null;
  }, [tables, selectedTableId]);

  // Mark table as clean handler
  const handleMarkClean = async (tableId) => {
    try {
      const updated = await markTableClean(tableId);
      toast.success(`Table ${updated.t_no} marked as clean and ready for new guests!`);
    } catch (err) {
      toast.error(err.message || "Failed to mark table clean.");
    }
  };

  // Navigate to Open New Order with selected table
  const handleOpenOrder = (table) => {
    navigate("/waiter/orders/new", { state: { tableId: table.table_id, tableNo: table.t_no, capacity: table.capacity } });
  };

  // Navigate to Order Panel
  const handleViewOrder = (table) => {
    const orderId = table.order_id || table.active_order_id;
    if (orderId) {
      navigate(`/waiter/orders/${orderId}`);
    } else {
      navigate("/waiter/orders/current");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading restaurant tables...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)" }}>
      {/* 1. Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {/* Total Tables */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--color-primary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Total Tables
              </span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "4px" }}>
                {stats.total}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>4 Floor Sections</span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Free Tables */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--pill-green-text)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Free Tables
              </span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--pill-green-text)", marginTop: "4px" }}>
                {stats.free}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Ready to seat guests</span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--pill-green-bg)",
                color: "var(--pill-green-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Occupied Tables */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--pill-amber-text)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Occupied Tables
              </span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--pill-amber-text)", marginTop: "4px" }}>
                {stats.occupied}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Active orders in dining</span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--pill-amber-bg)",
                color: "var(--pill-amber-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Needs Cleaning */}
        <Card padding="var(--spacing-md) var(--spacing-lg)" style={{ borderLeft: "4px solid var(--pill-red-text)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Needs Cleaning
              </span>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--pill-red-text)", marginTop: "4px" }}>
                {stats.cleaning}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>Requires bussing/clean</span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--pill-red-bg)",
                color: "var(--pill-red-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Main Floor Section: Left Nav + Floor Grid + Right Context Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 310px", gap: "var(--spacing-lg)", alignItems: "start" }}>
        
        {/* Left Column: Section Selector & Status Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <Card padding="var(--spacing-md)">
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}
            >
              Sections
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sections.map((sec) => {
                const isSelected = selectedSection === sec;
                const count = sec === "All" ? tables.length : tables.filter((t) => t.section === sec).length;
                return (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
                      color: isSelected ? "var(--color-primary)" : "var(--color-text-main)",
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{sec === "All" ? "All Sections" : sec}</span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-bg-page)",
                        color: isSelected ? "#FFFFFF" : "var(--color-text-muted)",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Legend */}
          <Card padding="var(--spacing-md)">
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}
            >
              Status Legend
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.825rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#2D7A4F" }} />
                <span>Free ({stats.free})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#B47818" }} />
                <span>Occupied ({stats.occupied})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#8A6D3B" }} />
                <span>Reserved ({stats.reserved})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#C53030" }} />
                <span>Needs Cleaning ({stats.cleaning})</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Center Column: Floor Grid */}
        <Card padding="var(--spacing-lg)">
          {/* Floor Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--spacing-lg)",
              paddingBottom: "var(--spacing-sm)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {selectedSection === "All" ? "All Restaurant Tables" : `${selectedSection} Floor`}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Showing {filteredTables.length} tables
              </span>
            </div>

            {/* Quick Filter Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setFilterMyTables(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid",
                  borderColor: !filterMyTables ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: !filterMyTables ? "var(--color-primary-subtle)" : "#FFFFFF",
                  color: !filterMyTables ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontWeight: !filterMyTables ? 600 : 500,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                All Tables
              </button>
              <button
                onClick={() => setFilterMyTables(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid",
                  borderColor: filterMyTables ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: filterMyTables ? "var(--color-primary-subtle)" : "#FFFFFF",
                  color: filterMyTables ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontWeight: filterMyTables ? 600 : 500,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                My Tables
              </button>
              <Button
                variant="secondary"
                onClick={() => toast.info("Table map refreshed.")}
                style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                title="Refresh Table Map"
              >
                ↻ Refresh
              </Button>
            </div>
          </div>

          {/* Grid of Tables */}
          {filteredTables.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--spacing-xl) 0", color: "var(--color-text-muted)" }}>
              No tables match your selected filters.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
                gap: "14px",
              }}
            >
              {filteredTables.map((table) => {
                const isSelected = selectedTable?.table_id === table.table_id;

                // Border accent based on status
                const getStatusBorder = () => {
                  switch (table.status) {
                    case "free":
                      return "2px solid #2D7A4F";
                    case "occupied":
                      return "2px solid #B47818";
                    case "reserved":
                      return "2px solid #8A6D3B";
                    case "needs_cleaning":
                      return "2px solid #C53030";
                    default:
                      return "1px solid var(--color-border)";
                  }
                };

                return (
                  <div
                    key={table.table_id}
                    onClick={() => setSelectedTableId(table.table_id)}
                    style={{
                      backgroundColor: isSelected ? "var(--color-primary-subtle)" : "#FFFFFF",
                      border: isSelected ? "2px solid var(--color-primary)" : getStatusBorder(),
                      borderRadius: "var(--radius-lg)",
                      padding: "12px 10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: "115px",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      boxShadow: isSelected ? "0 4px 10px rgba(30,111,92,0.18)" : "var(--shadow-sm)",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      position: "relative",
                    }}
                  >
                    {/* Table Number */}
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {table.t_no}
                    </div>

                    {/* Capacity */}
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {table.capacity} seats
                    </div>

                    {/* Status Pill */}
                    <div style={{ marginTop: "6px" }}>
                      <StatusPill status={table.status} />
                    </div>

                    {/* Extra context if occupied or cleaning */}
                    {table.status === "occupied" && (
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--color-text-muted)",
                          marginTop: "6px",
                          textAlign: "center",
                          lineHeight: "1.2",
                        }}
                      >
                        {table.guest_count} guests • {table.waiter}
                      </div>
                    )}

                    {table.status === "needs_cleaning" && (
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--color-danger)",
                          fontWeight: 600,
                          marginTop: "6px",
                        }}
                      >
                        Tap to clean
                      </div>
                    )}

                    {table.status === "reserved" && (
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--color-text-light)",
                          marginTop: "6px",
                        }}
                      >
                        Reserved
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Column: Selected Table Context Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {selectedTable ? (
            <Card padding="var(--spacing-lg)">
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "8px",
                }}
              >
                Table Context
              </div>

              {/* Table header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
                    {selectedTable.t_no}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {selectedTable.section}
                  </span>
                </div>
                <StatusPill status={selectedTable.status} />
              </div>

              {/* Table metadata specs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "16px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Capacity:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTable.capacity} Guests Max</span>
                </div>

                {selectedTable.status === "occupied" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Current Guests:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTable.guest_count || 3} seated</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Assigned Waiter:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTable.waiter || "A. Smith"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Active Order:</span>
                      <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                        {selectedTable.order_id ? `ORD-${String(selectedTable.order_id).padStart(3, '0')}` : (selectedTable.active_order_id ? `ORD-${String(selectedTable.active_order_id).padStart(3, '0')}` : "Active Order")}
                      </span>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Last Activity:</span>
                  <span style={{ fontWeight: 500 }}>{selectedTable.last_activity || "Just now"}</span>
                </div>
              </div>

              {/* Contextual Action Button */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "18px" }}>
                {selectedTable.status === "free" && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleOpenOrder(selectedTable)}
                    style={{ padding: "10px 16px" }}
                  >
                    + Open New Order
                  </Button>
                )}

                {selectedTable.status === "occupied" && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleViewOrder(selectedTable)}
                    style={{ padding: "10px 16px" }}
                  >
                    View Current Order →
                  </Button>
                )}

                {selectedTable.status === "needs_cleaning" && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleMarkClean(selectedTable.table_id)}
                    style={{ backgroundColor: "#2D7A4F", borderColor: "#2D7A4F", padding: "10px 16px" }}
                  >
                    ✓ Mark as Clean
                  </Button>
                )}

                {selectedTable.status === "reserved" && (
                  <div
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--pill-amber-bg)",
                      color: "var(--pill-amber-text)",
                      fontSize: "0.8rem",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    Reserved table cannot accept new orders. Managed by host/admin.
                  </div>
                )}

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate("/waiter/orders")}
                  style={{ fontSize: "0.825rem" }}
                >
                  View All Waiter Orders
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="var(--spacing-lg)">
              <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                Select a table on the floor grid to view details and available actions.
              </div>
            </Card>
          )}

          {/* Handoff Guidance Card (from Figma Frame 28:2) */}
          <Card padding="var(--spacing-md)" style={{ backgroundColor: "var(--color-bg-page)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Waiter Handoff
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.4, margin: 0 }}>
              Use <strong>Open New Order</strong> to seat incoming guests, or tap any occupied table to modify drafts, send tickets to the kitchen, or request checkout.
            </p>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default TableMap;
