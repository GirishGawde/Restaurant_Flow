/**
 * src/pages/kitchen/KitchenDisplay.jsx
 * Owner: Diya (Module 3 - Kitchen)
 *
 * Screen 11: Kitchen Display
 * - Live Kanban columns: New, Preparing, Ready to serve, Done
 * - Card timers with color thresholds: green < 10m, amber 10-15m, red > 15m
 * - Card-level buttons: Start preparing, Mark ready, Mark served
 * - Station filter (All stations, Grill, Cold, Oven, Bar, etc.)
 * - Auto-refresh polling every 10 seconds with pause/resume toggle
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchKitchenBoard, advanceOrderTickets, fetchStations } from "../../api/kitchen";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";

export function KitchenDisplay() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [boardData, setBoardData] = useState({
    cards: [],
    counts: { all: 0, new: 0, cooking: 0, ready: 0, done: 0 },
    avg_prep_time: "12:40",
  });
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("all");
  const [sortOrder, setSortOrder] = useState("oldest_first");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState(null);
  const [autoRefreshSec, setAutoRefreshSec] = useState(10);
  const [isPaused, setIsPaused] = useState(false);

  // Load stations
  useEffect(() => {
    fetchStations()
      .then((data) => setStations(data))
      .catch((err) => console.error("Failed to load stations:", err));
  }, []);

  // Fetch board data
  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchKitchenBoard({
        station: selectedStation,
        sort: sortOrder,
      });
      setBoardData(data);
      setAutoRefreshSec(10);
    } catch (err) {
      if (!silent) {
        showToast(err.message || "Failed to load kitchen board", "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedStation, sortOrder, showToast]);

  // Polling interval (10 seconds)
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setAutoRefreshSec((prev) => {
        if (prev <= 1) {
          loadBoard(true);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, loadBoard]);

  // Handle advancing an entire order card
  const handleAdvanceOrder = async (orderId, newStatus, e) => {
    e.stopPropagation();
    setAdvancingId(orderId);
    try {
      const res = await advanceOrderTickets(orderId, newStatus);
      showToast(res.message || `Order #${orderId} moved to ${newStatus}`, "success");
      await loadBoard(true);
    } catch (err) {
      showToast(err.message || "Cannot advance ticket status (transition conflict)", "error");
    } finally {
      setAdvancingId(null);
    }
  };

  // Group cards by column
  const cards = boardData.cards || [];

  const columns = [
    {
      id: "queued",
      title: "New",
      dotColor: "#2D7A4F",
      actionLabel: "Start preparing",
      actionStatus: "cooking",
      cards: cards.filter((c) => c.ticket_status === "queued"),
    },
    {
      id: "cooking",
      title: "Preparing",
      dotColor: "#B47818",
      actionLabel: "Mark ready",
      actionStatus: "ready",
      cards: cards.filter((c) => c.ticket_status === "cooking"),
    },
    {
      id: "ready",
      title: "Ready to serve",
      dotColor: "#2D7A4F",
      actionLabel: "Mark served",
      actionStatus: "served",
      cards: cards.filter((c) => c.ticket_status === "ready"),
    },
    {
      id: "served",
      title: "Done",
      dotColor: "#6B6860",
      actionLabel: null,
      actionStatus: null,
      cards: cards.filter((c) => c.ticket_status === "served"),
    },
  ];

  // Tab filtering if a tab is selected
  const visibleColumns =
    activeTab === "all"
      ? columns
      : columns.filter((col) => {
          if (activeTab === "new") return col.id === "queued";
          if (activeTab === "cooking") return col.id === "cooking";
          if (activeTab === "ready") return col.id === "ready";
          if (activeTab === "done") return col.id === "served";
          return true;
        });

  // Timer pill styling
  const getTimerPillStyle = (color) => {
    switch (color) {
      case "red":
        return {
          backgroundColor: "#FEE2E2",
          color: "#C53030",
          border: "1px solid #FECACA",
        };
      case "amber":
        return {
          backgroundColor: "#FEF7E6",
          color: "#B47818",
          border: "1px solid #FDE3A7",
        };
      case "green":
      default:
        return {
          backgroundColor: "#E8F5E9",
          color: "#2D7A4F",
          border: "1px solid #C8E6C9",
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* Top Banner Header */}
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
          11. KITCHEN DISPLAY
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              Kitchen Display
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Tickets grouped by status. Open a ticket for items, notes and history, or move it to the next status.
            </p>
          </div>

          {/* Quick links to Stations & Simulator */}
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              onClick={() => navigate("/kitchen/stations")}
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            >
              Stations View
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/kitchen/demo")}
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            >
              Concurrency Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--color-bg-card)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>New</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: "700", color: "#2D7A4F" }}>
              {boardData.counts.new}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-bg-card)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>Preparing</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: "700", color: "#B47818" }}>
              {boardData.counts.cooking}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-bg-card)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>Ready to serve</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: "700", color: "#2D7A4F" }}>
              {boardData.counts.ready}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-bg-card)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>Done (last hour)</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: "700", color: "var(--color-text-main)" }}>
              {boardData.counts.done}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-bg-card)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>Avg. prep time</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "1.85rem", fontWeight: "700", color: "var(--color-text-main)", fontFamily: "var(--font-mono)" }}>
              {boardData.avg_prep_time || "12:40"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Controls Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
          paddingBottom: "4px",
        }}
      >
        {/* Left Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All tickets (${boardData.counts.all})` },
            { id: "new", label: `New (${boardData.counts.new})` },
            { id: "cooking", label: `Preparing (${boardData.counts.cooking})` },
            { id: "ready", label: `Ready (${boardData.counts.ready})` },
            { id: "done", label: `Done (${boardData.counts.done})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? "600" : "500",
                  backgroundColor: isActive ? "var(--color-primary)" : "var(--color-bg-card)",
                  color: isActive ? "#FFFFFF" : "var(--color-text-muted)",
                  border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Station, Sort & Auto-refresh Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Station dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Station:</span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-card)",
                fontSize: "0.85rem",
                color: "var(--color-text-main)",
                cursor: "pointer",
              }}
            >
              <option value="all">All stations</option>
              {stations.map((st) => (
                <option key={st.station_id} value={st.station_id}>
                  {st.s_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-card)",
                fontSize: "0.85rem",
                color: "var(--color-text-main)",
                cursor: "pointer",
              }}
            >
              <option value="oldest_first">Oldest first</option>
              <option value="newest_first">Newest first</option>
              <option value="table">Table number</option>
            </select>
          </div>

          {/* Auto-refresh pill indicator */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Polling is paused. Click to resume." : "Click to pause polling."}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--color-border)",
              backgroundColor: isPaused ? "#FEE2E2" : "#E8F4F0",
              color: isPaused ? "#C53030" : "var(--color-primary)",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isPaused ? "#C53030" : "var(--color-primary)",
                display: "inline-block",
              }}
            />
            {isPaused ? "Paused" : `Refresh: ${autoRefreshSec}s`}
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(260px, 1fr))`,
          gap: "var(--spacing-md)",
          alignItems: "flex-start",
        }}
      >
        {visibleColumns.map((col) => (
          <div
            key={col.id}
            style={{
              backgroundColor: "#EFECE6",
              borderRadius: "var(--radius-lg)",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minHeight: "450px",
            }}
          >
            {/* Column Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "2px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: col.dotColor,
                }}
              />
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--color-text-main)" }}>
                {col.title}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  fontWeight: "600",
                  marginLeft: "auto",
                }}
              >
                {col.cards.length}
              </span>
            </div>

            {/* Column Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {col.cards.map((card) => {
                const timerStyle = getTimerPillStyle(card.timer_color);
                const isAdvancing = advancingId === card.order_id;

                return (
                  <div
                    key={card.order_id}
                    onClick={() => navigate(`/kitchen/tickets/${card.order_id}`)}
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                  >
                    {/* Card Top: Order ID & Table info + Timer Pill */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                            #{card.order_id}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>
                            {card.table_label || `T-${String(card.table_id).padStart(2, "0")}`} · {card.section || "Main Hall"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.775rem", color: "var(--color-text-light)", marginTop: "2px" }}>
                          {card.waiter_name || "Waiter"} · {card.guests} guests
                        </div>
                      </div>

                      {/* Timer Pill */}
                      {card.timer_text && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            fontFamily: "var(--font-mono)",
                            ...timerStyle,
                          }}
                        >
                          {card.timer_text}
                        </span>
                      )}
                    </div>

                    {/* Items List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
                      {card.items &&
                        card.items.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              color: "var(--color-text-main)",
                            }}
                          >
                            <span>
                              <span style={{ fontWeight: "600", color: "var(--color-primary)", marginRight: "6px" }}>
                                {it.quantity}×
                              </span>
                              {it.item}
                            </span>
                            {it.station && (
                              <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                                {it.station}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Order or Allergy Note Warning Pill if any */}
                    {card.order_notes && (
                      <div
                        style={{
                          backgroundColor: "#FEF7E6",
                          border: "1px solid #FDE3A7",
                          color: "#B47818",
                          padding: "4px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.775rem",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>!</span>
                        <span>{card.order_notes}</span>
                      </div>
                    )}

                    {/* Card Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "4px",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--color-border-subtle)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/kitchen/tickets/${card.order_id}`)}
                        style={{
                          flex: col.actionLabel ? 1 : "auto",
                          padding: "6px 10px",
                          fontSize: "0.8rem",
                          width: col.actionLabel ? "auto" : "100%",
                        }}
                      >
                        Details
                      </Button>

                      {col.actionLabel && (
                        <Button
                          variant="primary"
                          disabled={isAdvancing}
                          onClick={(e) => handleAdvanceOrder(card.order_id, col.actionStatus, e)}
                          style={{
                            flex: 1.6,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {isAdvancing ? "Updating..." : col.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Ready column hint text as shown in Figma */}
              {col.id === "ready" && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "0.775rem",
                    padding: "12px 8px",
                    fontStyle: "italic",
                  }}
                >
                  Ready tickets wait here for the waiter
                </div>
              )}

              {col.cards.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "0.825rem",
                    padding: "36px 12px",
                  }}
                >
                  No tickets in this column
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info Notice */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "0.8rem",
          color: "var(--color-text-muted)",
        }}
      >
        <div>
          Timer colour: <span style={{ color: "#2D7A4F", fontWeight: "600" }}>green under 10 min</span> ·{" "}
          <span style={{ color: "#B47818", fontWeight: "600" }}>amber 10–15 min</span> ·{" "}
          <span style={{ color: "#C53030", fontWeight: "600" }}>red over 15 min</span>. Auto-refreshes every 10 seconds.
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <span>Diya (Module 3 - Kitchen)</span>
          <span>Supabase / PostgreSQL + Flask</span>
        </div>
      </div>
    </div>
  );
}

export default KitchenDisplay;
