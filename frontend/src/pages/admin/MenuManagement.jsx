/**
 * src/pages/admin/MenuManagement.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 17: Menu Management
 * - Eyebrow: "17 / MENU MANAGEMENT"
 * - Title: "Menu items"
 * - Top right: Search input, Category filter, "+ Add item" button
 * - Left column: Menu items table (Item, Category, Station, Price, Status pill, Edit action)
 * - Right column: Add/Edit side panel (Name, Category, Station, Price, Description, Status)
 * - Actions: "Save changes", "Create item", "Deactivate" (sets status to inactive)
 * - Integrates validation error messages and success toast notifications
 */

import React, { useState, useEffect, useCallback } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import FormField from "../../components/FormField";
import { useToast } from "../../components/Toast";
import { fetchMenuItems, createMenuItem, updateMenuItem, fetchStations } from "../../api/admin";
import { formatMoney } from "../../utils/format";

const CATEGORIES = ["Starters", "Mains", "Sides", "Drinks", "Desserts"];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "sold_out", label: "Sold Out" },
  { value: "inactive", label: "Inactive" },
];

export function MenuManagement() {
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Panel state: 'add' or 'edit'
  const [panelMode, setPanelMode] = useState("add"); // 'add' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Starters");
  const [formStationId, setFormStationId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, stationsRes] = await Promise.all([
        fetchMenuItems({ category: selectedCategory, search }),
        fetchStations(),
      ]);

      const loadedStations = stationsRes?.stations || [];
      setStations(loadedStations);
      setItems(itemsRes?.menu_items || []);

      if (loadedStations.length > 0 && !formStationId) {
        setFormStationId(loadedStations[0].station_id);
      }
    } catch (err) {
      showToast(err.message || "Failed to load menu data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open "Add Item" panel
  const handleAddNew = () => {
    setPanelMode("add");
    setSelectedItem(null);
    setFormName("");
    setFormCategory("Starters");
    setFormStationId(stations[0]?.station_id || "");
    setFormPrice("");
    setFormDescription("");
    setFormStatus("active");
    setFormError("");
  };

  // Open "Edit Item" panel
  const handleSelectEdit = (item) => {
    setPanelMode("edit");
    setSelectedItem(item);
    setFormName(item.name || "");
    setFormCategory(item.category || "Starters");
    setFormStationId(item.station_id || stations[0]?.station_id || "");
    setFormPrice(item.price !== undefined ? item.price : "");
    setFormDescription(item.description || "");
    setFormStatus(item.status || "active");
    setFormError("");
  };

  // Submit Add or Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Menu item name is required.");
      return;
    }
    if (formPrice === "" || isNaN(Number(formPrice)) || Number(formPrice) < 0) {
      setFormError("Please enter a valid price (>= 0).");
      return;
    }
    if (!formStationId) {
      setFormError("Please select a kitchen station.");
      return;
    }

    const payload = {
      name: formName.trim(),
      category: formCategory,
      price: parseFloat(formPrice),
      station_id: parseInt(formStationId, 10),
      description: formDescription.trim(),
      status: formStatus,
    };

    try {
      setSaving(true);
      if (panelMode === "add") {
        await createMenuItem(payload);
        showToast(`Item "${payload.name}" added successfully.`, "success");
        handleAddNew();
      } else {
        await updateMenuItem(selectedItem.item_id, payload);
        showToast(`Item "${payload.name}" updated successfully.`, "success");
      }
      await loadData();
    } catch (err) {
      setFormError(err.message || "Failed to save menu item.");
    } finally {
      setSaving(false);
    }
  };

  // Quick Deactivate
  const handleDeactivate = async () => {
    if (!selectedItem) return;
    try {
      setSaving(true);
      await updateMenuItem(selectedItem.item_id, { status: "inactive" });
      setFormStatus("inactive");
      showToast(`Item "${selectedItem.name}" deactivated.`, "info");
      await loadData();
    } catch (err) {
      setFormError(err.message || "Failed to deactivate item.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "#FFFFFF",
    color: "var(--color-text-main)",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-lg)",
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
            17 / MENU MANAGEMENT
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
            Menu items
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
            Manage food & drink catalogue, pricing, station routing, and kitchen availability.
          </p>
        </div>

        {/* Top Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "200px" }}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ ...inputStyle, width: "150px" }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <Button variant="primary" onClick={handleAddNew} style={{ padding: "8px 14px" }}>
            + Add item
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Table (1.6fr), Right Form Panel (1fr) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--spacing-lg)" }}>
        {/* Left: Menu Items Table */}
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Item</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Category</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Station</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--color-text-muted)" }}>Price</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--color-text-muted)" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--color-text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                      Loading menu catalogue...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                      No menu items match your search or filter.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isSelected = selectedItem?.item_id === item.item_id;
                    return (
                      <tr
                        key={item.item_id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSelectEdit(item)}
                      >
                        <td style={{ padding: "12px", fontWeight: 600 }}>
                          <div>{item.name}</div>
                          {item.description && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px", color: "var(--color-text-muted)" }}>{item.category}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ fontSize: "0.8rem", backgroundColor: "var(--color-bg-page)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                            {item.station_name || "Kitchen"}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>
                          {formatMoney(item.price)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <StatusPill status={item.status} />
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEdit(item);
                            }}
                            style={{ padding: "4px 10px", fontSize: "0.775rem" }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "var(--spacing-md)", fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", justifyContent: "space-between" }}>
            <span>Showing {items.length} items</span>
            <span>Prices include tax</span>
          </div>
        </Card>

        {/* Right: Add / Edit Side Panel */}
        <Card
          title={panelMode === "add" ? "Add new item" : `Edit item #${selectedItem?.item_id}`}
          subtitle={
            panelMode === "add"
              ? "Specify item details and assign kitchen station"
              : `Updating details for ${selectedItem?.name}`
          }
        >
          {formError && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--pill-red-bg)",
                color: "var(--pill-red-text)",
                border: "1px solid var(--pill-red-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                marginBottom: "var(--spacing-md)",
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <FormField label="Item Name" id="itemName" required>
              <input
                id="itemName"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Garlic Butter Naan"
                style={inputStyle}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
              <FormField label="Category" id="itemCat" required>
                <select
                  id="itemCat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={inputStyle}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Kitchen Station" id="itemStation" required>
                <select
                  id="itemStation"
                  value={formStationId}
                  onChange={(e) => setFormStationId(e.target.value)}
                  style={inputStyle}
                >
                  {stations.map((st) => (
                    <option key={st.station_id} value={st.station_id}>
                      {st.s_name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
              <FormField label="Price ($)" id="itemPrice" required>
                <input
                  id="itemPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Status" id="itemStatus" required>
                <select
                  id="itemStatus"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Description / Ingredients" id="itemDesc">
              <textarea
                id="itemDesc"
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="List ingredients or allergens searchable by waitstaff..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </FormField>

            <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
              <Button type="submit" variant="primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? "Saving..." : panelMode === "add" ? "Create item" : "Save changes"}
              </Button>

              {panelMode === "edit" && formStatus !== "inactive" && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={saving}
                  onClick={handleDeactivate}
                  title="Sets item status to inactive"
                >
                  Deactivate
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default MenuManagement;
