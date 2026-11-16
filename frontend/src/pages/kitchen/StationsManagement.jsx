/**
 * src/pages/kitchen/StationsManagement.jsx
 * Owner: Diya (Module 3 - Kitchen)
 *
 * Stations Management & Real-time Load Monitor:
 * - List and manage kitchen stations (Grill, Cold, Oven, Bar, etc.)
 * - Station routing configuration: target prep time, display order, active flag
 * - Station load analytics: queued items, cooking items, ready items, capacity load %
 * - Station creation and editing modals
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStations, createStation, updateStation, fetchKitchenStats } from "../../api/kitchen";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import FormField from "../../components/FormField";

export function StationsManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState({ load: [], prep_times: [] });
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState({
    s_name: "",
    display_order: 1,
    target_prep_minutes: 15,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stationList, statsData] = await Promise.all([
        fetchStations(),
        fetchKitchenStats().catch(() => ({ load: [], prep_times: [] })),
      ]);
      setStations(stationList);
      setStats(statsData);
    } catch (err) {
      showToast(err.message || "Failed to load station details", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingStation(null);
    setFormData({
      s_name: "",
      display_order: stations.length + 1,
      target_prep_minutes: 15,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (station) => {
    setEditingStation(station);
    setFormData({
      s_name: station.s_name,
      display_order: station.display_order || 0,
      target_prep_minutes: station.target_prep_minutes || 15,
      is_active: station.is_active !== undefined ? station.is_active : true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.s_name.trim()) {
      showToast("Station name cannot be empty.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingStation) {
        await updateStation(editingStation.station_id, formData);
        showToast(`Station '${formData.s_name}' updated successfully`, "success");
      } else {
        await createStation(formData);
        showToast(`Station '${formData.s_name}' created successfully`, "success");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to save station", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Find load stats for station
  const getStationLoad = (stationId) => {
    return (
      stats.load?.find((l) => l.station_id === stationId) || {
        queued_items: 0,
        cooking_items: 0,
        ready_items: 0,
        in_progress_items: 0,
        capacity: 20,
        load_pct: 0,
        avg_prep_minutes: 12.0,
      }
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* Top Header */}
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
          KITCHEN STATIONS & WORKLOAD MONITOR
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              Kitchen Stations
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Configure preparation lines, prep time thresholds, and monitor real-time ticket distribution.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={() => navigate("/kitchen/board")}>
              ← Kitchen Display
            </Button>
            <Button variant="primary" onClick={handleOpenAdd}>
              + Add Station
            </Button>
          </div>
        </div>
      </div>

      {/* Stations Summary Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {stations.map((st) => {
          const loadInfo = getStationLoad(st.station_id);

          return (
            <div
              key={st.station_id}
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Card Header: Station Name & Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
                      {st.s_name}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      #0{st.display_order}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    Target: {st.target_prep_minutes || 15} min target prep
                  </div>
                </div>

                <StatusPill variant={st.is_active ? "green" : "grey"}>
                  {st.is_active ? "Active" : "Inactive"}
                </StatusPill>
              </div>

              {/* Station Load Progress Bar */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  <span>Active Load</span>
                  <span style={{ fontWeight: "600", color: "var(--color-text-main)" }}>
                    {loadInfo.load_pct || 0}% capacity
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    width: "100%",
                    backgroundColor: "#ECEAE4",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, loadInfo.load_pct || 0)}%`,
                      backgroundColor:
                        (loadInfo.load_pct || 0) > 80 ? "var(--color-danger)" : "var(--color-primary)",
                      borderRadius: "var(--radius-pill)",
                    }}
                  />
                </div>
              </div>

              {/* Workload breakdown metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  textAlign: "center",
                  backgroundColor: "#FAF9F5",
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Queued</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#2D7A4F" }}>
                    {loadInfo.queued_items || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Cooking</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#B47818" }}>
                    {loadInfo.cooking_items || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Ready</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)" }}>
                    {loadInfo.ready_items || 0}
                  </div>
                </div>
              </div>

              {/* Card Footer: Edit Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-light)" }}>
                  Avg prep: {loadInfo.avg_prep_minutes ? `${loadInfo.avg_prep_minutes}m` : "N/A"}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenEdit(st)}
                  style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                >
                  Configure
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Information Callout */}
      <div
        style={{
          backgroundColor: "#FAF9F5",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          lineHeight: "1.6",
        }}
      >
        <strong style={{ color: "var(--color-text-main)" }}>DBMS Architecture Note (Diya):</strong>
        <br />
        Every menu item is assigned to a station in the database via foreign key{" "}
        <code>menu_item.station_id → station.station_id</code>. When a waiter clicks "Send to Kitchen", the database
        trigger <code>create_ticket_for_item()</code> automatically queries the item's station and routes the ticket to
        that station's queue with target due date computed as <code>now() + target_prep_minutes</code>.
      </div>

      {/* Add / Edit Station Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStation ? `Edit Station: ${editingStation.s_name}` : "Add Kitchen Station"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField label="Station Name" required>
            <input
              type="text"
              value={formData.s_name}
              onChange={(e) => setFormData({ ...formData, s_name: e.target.value })}
              placeholder="e.g. Grill, Cold, Oven, Bar, Tandoor"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "0.9rem",
              }}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Display Order" required>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 1 })}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.9rem",
                }}
              />
            </FormField>

            <FormField label="Target Prep (minutes)" required>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.target_prep_minutes}
                onChange={(e) => setFormData({ ...formData, target_prep_minutes: parseInt(e.target.value, 10) || 15 })}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.9rem",
                }}
              />
            </FormField>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
            <input
              type="checkbox"
              id="station_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="station_is_active" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
              Station is active and receiving orders
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingStation ? "Save Changes" : "Create Station"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StationsManagement;
