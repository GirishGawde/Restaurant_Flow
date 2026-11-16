/**
 * src/pages/waiter/OpenNewOrder.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 5: Waiter Open New Order
 * - Select an available free table
 * - Specify guest count with interactive stepper (capped by table capacity)
 * - Add order notes/special dietary requests
 * - Displays assigned logged-in waiter (read-only)
 * - Inline validation and table capacity limits
 * - Creates mock order, updates table status to Occupied, and navigates to Menu Browser
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { fetchTables, openOrder } from "../../api/waiter";
import { waiterStore } from "../../mocks/waiterMockStore";

export function OpenNewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Read preselected table passed from Table Map if available
  const initialTableId = location.state?.tableId || null;
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");

  const loggedInWaiterName = user?.name || user?.username || "A. Smith";

  // Load tables
  useEffect(() => {
    const load = async () => {
      const data = await fetchTables();
      setTables(data);
      // If no preselected table, default to first free table
      if (!initialTableId) {
        const firstFree = data.find((t) => t.status === "free");
        if (firstFree) {
          setSelectedTableId(firstFree.table_id);
          setGuestCount(Math.min(2, firstFree.capacity));
        }
      }
      setLoading(false);
    };
    load();

    let unsubscribe = () => {};
    if (import.meta.env.VITE_USE_MOCKS !== "false") {
      unsubscribe = waiterStore.subscribe((state) => {
        setTables([...state.tables]);
      });
    }
    return () => unsubscribe();
  }, [initialTableId]);

  // Only free tables are eligible for opening a new order
  const freeTables = useMemo(() => {
    return tables.filter((t) => t.status === "free");
  }, [tables]);

  const filteredFreeTables = useMemo(() => {
    if (sectionFilter === "All") return freeTables;
    return freeTables.filter((t) => t.section === sectionFilter);
  }, [freeTables, sectionFilter]);

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.table_id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Adjust guest count if selected table capacity changes
  const handleSelectTable = (table) => {
    setSelectedTableId(table.table_id);
    if (guestCount > table.capacity) {
      setGuestCount(table.capacity);
    } else if (guestCount < 1) {
      setGuestCount(1);
    }
  };

  const handleGuestCountChange = (delta) => {
    if (!selectedTable) return;
    const nextVal = guestCount + delta;
    if (nextVal >= 1 && nextVal <= selectedTable.capacity) {
      setGuestCount(nextVal);
    }
  };

  // Validation checks
  const validationError = useMemo(() => {
    if (!selectedTable) {
      return "Please select an available free table.";
    }
    if (selectedTable.status !== "free") {
      return `Table ${selectedTable.t_no} is currently ${selectedTable.status.replace("_", " ")} and cannot be opened.`;
    }
    if (guestCount < 1) {
      return "Guest count must be at least 1.";
    }
    if (guestCount > selectedTable.capacity) {
      return `Guest count cannot exceed table capacity (${selectedTable.capacity} seats).`;
    }
    return null;
  }, [selectedTable, guestCount]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (validationError || !selectedTable) {
      toast.error(validationError || "Invalid order details.");
      return;
    }

    try {
      setSubmitting(true);
      const newOrder = await openOrder({
        tableId: selectedTable.table_id,
        guestCount: guestCount,
        notes: notes.trim(),
        waiterName: loggedInWaiterName,
      });

      const targetOrderId = newOrder?.order_id || newOrder?.id;
      const targetTableNo = newOrder?.table_no || selectedTable?.table_label || (selectedTable?.t_no ? `T-${selectedTable.t_no}` : "Table");

      toast.success(`Order #${targetOrderId} created for Table ${targetTableNo}!`);

      // Navigate to Screen 6 (Menu Browser) with newly created order context
      navigate("/waiter/menu", {
        state: {
          orderId: targetOrderId,
          tableNo: targetTableNo,
          guestCount: guestCount,
        },
      });
    } catch (err) {
      toast.error(err.message || "Failed to open order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading free tables...
      </div>
    );
  }

  const sections = ["All", ...Array.from(new Set(freeTables.map((t) => t.section)))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", maxWidth: "1200px" }}>
      {/* Page Subheader with Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <button
            onClick={() => navigate("/waiter/tables")}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: 0,
              marginBottom: "4px",
            }}
          >
            ← Back to Table Map
          </button>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-main)" }}>
            Open New Table Order
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            Assign guests to an available table and initialize their dining ticket.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Available Free Tables:</span>
          <span
            style={{
              backgroundColor: "var(--pill-green-bg)",
              color: "var(--pill-green-text)",
              fontWeight: 700,
              fontSize: "0.9rem",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--pill-green-border)",
            }}
          >
            {freeTables.length} Free
          </span>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--spacing-xl)", alignItems: "start" }}>
        
        {/* Left Column: Select Table */}
        <Card padding="var(--spacing-lg)">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--spacing-md)",
              paddingBottom: "var(--spacing-sm)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                1. Select Available Table
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Click a card below to assign the order
              </span>
            </div>

            {/* Section Filter Pills */}
            <div style={{ display: "flex", gap: "4px" }}>
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSectionFilter(sec)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid",
                    borderColor: sectionFilter === sec ? "var(--color-primary)" : "var(--color-border)",
                    backgroundColor: sectionFilter === sec ? "var(--color-primary-subtle)" : "transparent",
                    color: sectionFilter === sec ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: sectionFilter === sec ? 600 : 500,
                    cursor: "pointer",
                  }}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {filteredFreeTables.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "var(--spacing-2xl) 0",
                backgroundColor: "var(--color-bg-page)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🪑</div>
              <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>No free tables in this section</div>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                Check other sections or mark tables clean from the Table Map.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "12px",
                maxHeight: "380px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {filteredFreeTables.map((table) => {
                const isSelected = selectedTable?.table_id === table.table_id;
                return (
                  <div
                    key={table.table_id}
                    onClick={() => handleSelectTable(table)}
                    style={{
                      border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      backgroundColor: isSelected ? "var(--color-primary-subtle)" : "#FFFFFF",
                      borderRadius: "var(--radius-lg)",
                      padding: "14px 12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 4px 10px rgba(30,111,92,0.18)" : "var(--shadow-sm)",
                      transform: isSelected ? "scale(1.02)" : "none",
                      position: "relative",
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "8px",
                          color: "var(--color-primary)",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        ✓
                      </span>
                    )}

                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {table.t_no}
                    </div>

                    <div style={{ fontSize: "0.775rem", color: "var(--color-text-muted)" }}>
                      {table.section}
                    </div>

                    <div
                      style={{
                        fontSize: "0.725rem",
                        fontWeight: 600,
                        backgroundColor: "#E8F5E9",
                        color: "#2D7A4F",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      {table.capacity} seats max
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Table Summary Confirmation Box */}
          {selectedTable && (
            <div
              style={{
                marginTop: "var(--spacing-md)",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-bg-page)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Selected Table
                </span>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-primary)" }}>
                  {selectedTable.t_no} • {selectedTable.section}
                </div>
              </div>
              <StatusPill variant="green">{selectedTable.capacity} Seats Available</StatusPill>
            </div>
          )}
        </Card>

        {/* Right Column: Order Details Form */}
        <Card padding="var(--spacing-lg)">
          <form onSubmit={handleSubmitOrder} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            <div style={{ paddingBottom: "var(--spacing-sm)", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                2. Guest Details & Preferences
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Specify headcount and special instructions
              </span>
            </div>

            {/* Stepper for Guest Count */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
                Number of Guests
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => handleGuestCountChange(-1)}
                  disabled={guestCount <= 1}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: guestCount <= 1 ? "var(--color-bg-page)" : "#FFFFFF",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    cursor: guestCount <= 1 ? "not-allowed" : "pointer",
                    color: guestCount <= 1 ? "var(--color-text-light)" : "var(--color-text-main)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  –
                </button>

                <div
                  style={{
                    width: "80px",
                    height: "42px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                  }}
                >
                  {guestCount}
                </div>

                <button
                  type="button"
                  onClick={() => handleGuestCountChange(1)}
                  disabled={!selectedTable || guestCount >= selectedTable.capacity}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: !selectedTable || guestCount >= selectedTable.capacity ? "var(--color-bg-page)" : "#FFFFFF",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    cursor: !selectedTable || guestCount >= selectedTable.capacity ? "not-allowed" : "pointer",
                    color: !selectedTable || guestCount >= selectedTable.capacity ? "var(--color-text-light)" : "var(--color-text-main)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>

                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  {selectedTable ? `Max capacity: ${selectedTable.capacity} guests` : "Select a table first"}
                </span>
              </div>
            </div>

            {/* Order Notes Textarea */}
            <div>
              <label htmlFor="order-notes" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
                Order Notes & Dietary Restrictions
              </label>
              <textarea
                id="order-notes"
                rows="4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special instructions, food allergies, or seating preferences (e.g. high chair needed, peanut allergy)..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            {/* Waiter assignment (Read-only) */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-bg-page)",
                border: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: "0.725rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Assigned Waiter
                </span>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{loggedInWaiterName}</div>
              </div>
              <StatusPill variant="grey">Logged In</StatusPill>
            </div>

            {/* Inline Validation Banner */}
            {validationError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--pill-red-bg)",
                  color: "var(--pill-red-text)",
                  border: "1px solid var(--pill-red-border)",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => navigate("/waiter/tables")}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={Boolean(validationError) || submitting}
                style={{ flex: 1.5, padding: "10px 16px" }}
              >
                {submitting ? "Opening Order..." : "Open Order & Go to Menu →"}
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </div>
  );
}

export default OpenNewOrder;
