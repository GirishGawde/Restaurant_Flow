/**
 * src/pages/admin/Dashboard.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 16: Manager Dashboard
 * - Eyebrow: "16 / MANAGER DASHBOARD"
 * - Title: "Service overview"
 * - Subtitle: "Monitor the floor, sales and kitchen queue across all staff."
 * - "Live · Updated hh:mm" indicator, "Today" dropdown, Refresh button
 * - Auto-refreshes every 10 seconds via usePolling hook
 * - Four stat cards: Today's sales, Occupied tables, Active orders, Kitchen load
 * - "Live table status" grid (T-01 to T-18) with color-coded status and counts
 * - "Kitchen load" card with progress bar, stage counts, and ticket timer
 * - "Active orders" table with waiter filter, status pills, and attention table footer
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { fetchDashboard } from "../../api/admin";
import { usePolling } from "../../hooks/usePolling";
import { formatMoney, formatTime } from "../../utils/format";

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [waiterFilter, setWaiterFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("today");

  const loadDashboard = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetchDashboard();
      setData(res);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // Auto-refresh every 10 seconds (Screen 16 real-time requirement)
  usePolling(() => {
    loadDashboard(true);
  }, 10000);

  if (loading && !data) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading service dashboard...
      </div>
    );
  }

  const stats = data?.stats || {};
  const tables = data?.tables || [];
  const kitchen = data?.kitchen_queue || {};
  const allOrders = data?.active_orders || [];
  const attentionTables = data?.attention_tables || [];

  // Filter orders by waiter if selected
  const filteredOrders =
    waiterFilter === "all"
      ? allOrders
      : allOrders.filter((o) => o.waiter.toLowerCase() === waiterFilter.toLowerCase());

  // Waiter options for filter
  const waiterNames = Array.from(new Set(allOrders.map((o) => o.waiter)));

  // Table status tile styling
  const getTableTileStyle = (status) => {
    const base = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 4px",
      borderRadius: "var(--radius-md)",
      fontSize: "0.825rem",
      fontWeight: "700",
      minHeight: "56px",
      cursor: "pointer",
      transition: "transform 0.1s ease",
    };

    switch (status) {
      case "occupied":
        return {
          ...base,
          backgroundColor: "var(--color-primary)",
          color: "#FFFFFF",
          border: "1px solid var(--color-primary)",
        };
      case "reserved":
        return {
          ...base,
          backgroundColor: "var(--pill-amber-bg)",
          color: "var(--pill-amber-text)",
          border: "1px solid var(--pill-amber-border)",
        };
      case "needs_cleaning":
        return {
          ...base,
          backgroundColor: "var(--pill-red-bg)",
          color: "var(--pill-red-text)",
          border: "1px solid var(--pill-red-border)",
        };
      case "free":
      default:
        return {
          ...base,
          backgroundColor: "#FFFFFF",
          color: "var(--color-text-main)",
          border: "1px solid var(--color-border)",
        };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-xl)",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--color-text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            16 / MANAGER DASHBOARD
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
            Service overview
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
            Monitor the floor, sales and kitchen queue across all staff.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginRight: "4px" }}>
            Live · Updated {lastUpdated || "now"}
          </span>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              fontSize: "0.85rem",
              color: "var(--color-text-main)",
            }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 days</option>
          </select>

          <Button
            variant="secondary"
            onClick={() => loadDashboard(false)}
            style={{ padding: "7px 14px", fontSize: "0.85rem" }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        {/* Card 1: Today's Sales */}
        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Today's Sales
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {formatMoney(stats.today_sales || 2845.5)}
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            <strong>{stats.paid_orders || 42}</strong> paid orders · Avg <strong>{formatMoney(stats.avg_bill || 67.75)}</strong>
          </div>
        </Card>

        {/* Card 2: Occupied Tables */}
        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Occupied Tables
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {stats.occupied_tables || 6} <span style={{ fontSize: "1.1rem", fontWeight: 400, color: "var(--color-text-muted)" }}>/ {stats.total_tables || 18}</span>
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            {stats.free_tables || 10} free · {stats.reserved_tables || 1} reserved · {stats.needs_cleaning_tables || 1} attention
          </div>
        </Card>

        {/* Card 3: Active Orders */}
        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Active Orders
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {stats.active_orders || 8}
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            Serving <strong>{stats.active_guests || 26}</strong> seated guests
          </div>
        </Card>

        {/* Card 4: Kitchen Load */}
        <Card padding="var(--spacing-md)">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              Kitchen Load
            </span>
            <StatusPill variant={kitchen.status_pill === "Busy" ? "amber" : "green"}>
              {kitchen.status_pill || "Normal"}
            </StatusPill>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {stats.kitchen_load_percent || 60}%
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            {stats.kitchen_items_active || 12} / {stats.kitchen_capacity || 20} items active
          </div>
        </Card>
      </div>

      {/* Main Floor & Kitchen Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        {/* Live Table Status */}
        <Card
          title="Live table status"
          subtitle="Real-time layout across Main Hall, Terrace, Bar & Private Room"
          headerAction={
            <Link to="/waiter/tables" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              View table map &rarr;
            </Link>
          }
        >
          {/* 18 Table Tiles Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "8px",
              marginBottom: "var(--spacing-md)",
            }}
          >
            {tables.map((t) => (
              <div
                key={t.t_no}
                style={getTableTileStyle(t.status)}
                title={`Table ${t.t_no} (${t.section}) - Capacity: ${t.capacity} - Status: ${t.status}`}
                onClick={() => navigate("/waiter/tables")}
              >
                <span>T-{String(t.t_no).padStart(2, "0")}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 500, opacity: 0.9 }}>
                  {t.status === "needs_cleaning" ? "!" : `${t.capacity}p`}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.775rem",
              color: "var(--color-text-muted)",
              paddingTop: "var(--spacing-sm)",
              borderTop: "1px solid var(--color-border-subtle)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 10, height: 10, backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)", borderRadius: "2px" }} />
              <span>Free ({stats.free_tables || 10})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 10, height: 10, backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
              <span>Occupied ({stats.occupied_tables || 6})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 10, height: 10, backgroundColor: "var(--pill-amber-bg)", border: "1px solid var(--pill-amber-border)", borderRadius: "2px" }} />
              <span>Reserved ({stats.reserved_tables || 1})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 10, height: 10, backgroundColor: "var(--pill-red-bg)", border: "1px solid var(--pill-red-border)", borderRadius: "2px" }} />
              <span>Needs Cleaning ({stats.needs_cleaning_tables || 1})</span>
            </div>
          </div>
        </Card>

        {/* Kitchen Load Card */}
        <Card
          title="Kitchen queue & stations"
          subtitle="Item volume versus prep station capacity"
          headerAction={
            <Link to="/kitchen/board" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              View kitchen &rarr;
            </Link>
          }
        >
          <div style={{ marginBottom: "var(--spacing-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600 }}>
                {kitchen.items_active || 12} / {kitchen.capacity || 20} items active
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>
                {kitchen.active_orders || 3} orders in queue
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "var(--color-bg-page)",
                borderRadius: "var(--radius-pill)",
                overflow: "hidden",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, ((kitchen.items_active || 12) / (kitchen.capacity || 20)) * 100)}%`,
                  height: "100%",
                  backgroundColor: kitchen.status_pill === "Busy" ? "var(--pill-amber-text)" : "var(--color-primary)",
                  borderRadius: "var(--radius-pill)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Ticket stage breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "var(--spacing-sm)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            <div style={{ backgroundColor: "var(--color-bg-page)", padding: "10px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>Queued</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{kitchen.queued || 4}</span>
            </div>
            <div style={{ backgroundColor: "var(--color-bg-page)", padding: "10px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>Cooking</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{kitchen.cooking || 6}</span>
            </div>
            <div style={{ backgroundColor: "var(--color-bg-page)", padding: "10px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>Ready</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--pill-green-text)" }}>
                {kitchen.ready || 2}
              </span>
            </div>
          </div>

          {/* Timer metric */}
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-page)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>Oldest ticket waiting:</span>
            <span style={{ fontWeight: 600 }}>
              {kitchen.oldest_ticket_age_min || 14}m{" "}
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                (target: {kitchen.target_prep_min || 20}m)
              </span>
            </span>
          </div>
        </Card>
      </div>

      {/* Active Orders Section */}
      <Card
        title="Active orders on the floor"
        subtitle="Unclosed orders currently held by waitstaff and kitchen"
        headerAction={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
            {/* Waiter filter */}
            <select
              value={waiterFilter}
              onChange={(e) => setWaiterFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "0.825rem",
                backgroundColor: "#FFFFFF",
              }}
            >
              <option value="all">All Waiters</option>
              {waiterNames.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            <Link to="/waiter/orders" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              View all orders &rarr;
            </Link>
          </div>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Order</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Table / Guests</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Waiter</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Open for</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--color-text-muted)" }}>Total</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--color-text-muted)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No active orders found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.order_id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>#{ord.order_id}</td>
                    <td style={{ padding: "12px" }}>
                      T-{String(ord.table_no).padStart(2, "0")} · {ord.guests} guests
                    </td>
                    <td style={{ padding: "12px" }}>{ord.waiter}</td>
                    <td style={{ padding: "12px" }}>
                      <StatusPill status={ord.status}>{ord.status}</StatusPill>
                    </td>
                    <td style={{ padding: "12px", color: "var(--color-text-muted)" }}>{ord.open_for}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(ord.total)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <Link to={`/waiter/orders/${ord.order_id}`}>
                        <Button variant="secondary" style={{ padding: "4px 8px", fontSize: "0.775rem" }}>
                          Open order
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info line */}
        <div
          style={{
            marginTop: "var(--spacing-md)",
            paddingTop: "var(--spacing-sm)",
            borderTop: "1px solid var(--color-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.825rem",
            color: "var(--color-text-muted)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            {attentionTables.length > 0 && (
              <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                &bull; Table {attentionTables.map((t) => t.table_no).join(", ")} needs cleaning before reseating.
              </span>
            )}
          </div>
          <div>
            Showing <strong>{filteredOrders.length}</strong> active orders · Total volume:{" "}
            <strong>
              {formatMoney(filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0))}
            </strong>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
