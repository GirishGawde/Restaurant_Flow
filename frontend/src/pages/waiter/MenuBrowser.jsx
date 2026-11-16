/**
 * src/pages/waiter/MenuBrowser.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 6: Waiter Menu Browser
 * - Live search dishes by name, description, or ingredients
 * - Filter by categories: All, Starters, Main Course, Desserts, Beverages
 * - Menu item cards with images, prices in ₹, dietary info, and availability state
 * - Real-time add to draft order with instant feedback toast
 * - Side Order Summary Panel displaying active table, draft items, quantities, subtotal
 * - "View Order" button navigating to Screen 7 (Order Panel)
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../components/Toast";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { formatMoney } from "../../utils/format";
import { waiterStore } from "../../mocks/waiterMockStore";
import { fetchMenu, fetchMyOrders, fetchOrder, addOrderItem, updateOrderItemQty } from "../../api/waiter";

export function MenuBrowser() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [currentOrderDetails, setCurrentOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Determine active order from navigation state or latest active order in store
  const stateOrderId = location.state?.orderId;
  const [activeOrderId, setActiveOrderId] = useState(stateOrderId || null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [items, allOrders] = await Promise.all([fetchMenu(), fetchMyOrders()]);
        if (!isMounted) return;
        setMenuItems(Array.isArray(items) ? items : []);
        setOrders(Array.isArray(allOrders) ? allOrders : []);

        // Default to first open or in_kitchen order if none selected
        if (!activeOrderId && Array.isArray(allOrders) && allOrders.length > 0) {
          const defaultOrder = allOrders.find(
            (o) => o.status === "open" || o.status === "in_kitchen"
          ) || allOrders[0];
          if (defaultOrder) {
            setActiveOrderId(defaultOrder.order_id);
          }
        }
      } catch (err) {
        console.warn("Failed to load initial menu browser data:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();

    let unsubscribe = () => {};
    if (import.meta.env.VITE_USE_MOCKS !== "false") {
      unsubscribe = waiterStore.subscribe((state) => {
        if (isMounted) {
          setMenuItems([...state.menu]);
          setOrders([...state.orders]);
        }
      });
    }
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeOrderId]);

  // Current active order object from orders list
  const currentOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    return orders.find((o) => o.order_id === activeOrderId) || orders[0] || null;
  }, [orders, activeOrderId]);

  // Load detailed items and current version for the active order
  const targetOrderId = activeOrderId || currentOrder?.order_id;

  const reloadOrderDetails = useCallback(async (oid) => {
    if (!oid) return;
    try {
      const fullOrder = await fetchOrder(oid);
      if (fullOrder) {
        setCurrentOrderDetails(fullOrder);
      }
    } catch (err) {
      console.warn("reloadOrderDetails failed:", err.message);
    }
  }, []);

  useEffect(() => {
    if (targetOrderId) {
      reloadOrderDetails(targetOrderId);
    } else {
      setCurrentOrderDetails(null);
    }
  }, [targetOrderId, reloadOrderDetails]);

  // Safe items array from detailed order or order list
  const currentItems = useMemo(() => {
    if (Array.isArray(currentOrderDetails?.items)) {
      return currentOrderDetails.items;
    }
    if (Array.isArray(currentOrder?.items)) {
      return currentOrder.items;
    }
    return [];
  }, [currentOrderDetails?.items, currentOrder?.items]);

  // Safe subtotal calculation
  const currentSubtotal = useMemo(() => {
    if (currentOrderDetails?.subtotal !== undefined) {
      return Number(currentOrderDetails.subtotal) || 0;
    }
    if (currentOrder?.subtotal !== undefined) {
      return Number(currentOrder.subtotal) || 0;
    }
    return currentItems.reduce(
      (sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 1),
      0
    );
  }, [currentOrderDetails?.subtotal, currentOrder?.subtotal, currentItems]);

  // Categories list
  const categories = ["All", "Starters", "Main Course", "Desserts", "Beverages"];

  // Filtered menu items based on category and search query
  const filteredItems = useMemo(() => {
    if (!Array.isArray(menuItems)) return [];
    return menuItems.filter((item) => {
      const itemCat = (item.category || "").toLowerCase();
      const selCat = selectedCategory.toLowerCase();

      // Flexible category matching (e.g. Mains vs Main Course)
      const matchCategory =
        selectedCategory === "All" ||
        itemCat === selCat ||
        (selCat === "main course" && (itemCat === "mains" || itemCat === "main course"));

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.ingredients && item.ingredients.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle adding an item to the active order
  const handleAddItem = async (item) => {
    const activeObj = currentOrderDetails || currentOrder;
    if (!activeObj) {
      toast.error("Please open or select an active table order first.");
      return;
    }
    if (item.status === "sold_out" || item.status === "inactive") {
      toast.error(`${item.name} is currently sold out.`);
      return;
    }

    const oid = activeObj.order_id;
    const version = currentOrderDetails?.version || currentOrder?.version || 1;

    try {
      await addOrderItem(oid, item, version);
      await reloadOrderDetails(oid);
      toast.success(`Added ${item.name} to ${activeObj.table_no || "Table"} (#${oid})`);
    } catch (err) {
      toast.error(err.message || "Failed to add item.");
    }
  };

  // Handle quantity adjustment in the summary panel
  const handleUpdateQty = async (itemId, delta) => {
    const activeObj = currentOrderDetails || currentOrder;
    if (!activeObj) return;

    const oid = activeObj.order_id;
    const version = currentOrderDetails?.version || currentOrder?.version || 1;

    try {
      await updateOrderItemQty(oid, itemId, delta, version);
      await reloadOrderDetails(oid);
    } catch (err) {
      toast.error(err.message || "Failed to update quantity.");
    }
  };

  // Navigate to Screen 7 (Order Panel)
  const handleViewOrder = () => {
    const activeObj = currentOrderDetails || currentOrder;
    if (!activeObj) return;
    navigate(`/waiter/orders/${activeObj.order_id}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading menu items and active orders...
      </div>
    );
  }

  // Active open orders for the dropdown switcher
  const openOrders = orders.filter((o) => o.status !== "closed" && o.status !== "cancelled");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* 1. Header Banner & Current Order Context */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "#FFFFFF",
          padding: "14px 20px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--color-text-main)" }}>
              Browse Restaurant Menu
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
              Prices in INR (₹)
            </span>
          </div>
          <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
            Select dishes to add to draft. Drafts are sent to the kitchen from the Order Panel.
          </p>
        </div>

        {/* Current Table Selector Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
            Active Ticket:
          </span>
          {openOrders.length > 0 ? (
            <select
              value={currentOrder?.order_id || ""}
              onChange={(e) => setActiveOrderId(Number(e.target.value) || e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-primary)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {openOrders.map((o) => (
                <option key={o.order_id} value={o.order_id}>
                  {o.table_no || `T-${o.table_id}`} (#{o.order_id}) • {o.guest_count || o.guests || 2} Guests
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--color-danger)" }}>
              No active orders. Open an order first.
            </span>
          )}

          {currentOrder && (
            <Button
              variant="primary"
              onClick={handleViewOrder}
              style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            >
              View Order ({currentItems.length}) →
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Area: Menu Catalog + Order Summary Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--spacing-lg)", alignItems: "start" }}>
        
        {/* Left Column: Search, Category Filters, Menu Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {/* Search bar and Category Tabs */}
          <Card padding="var(--spacing-md)">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Search Bar */}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes, categories or ingredients (e.g. Salmon, Salad, Basil)..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)",
                    fontSize: "1rem",
                  }}
                >
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "var(--radius-pill)",
                        border: "1px solid",
                        borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                        backgroundColor: isSelected ? "var(--color-primary)" : "#FFFFFF",
                        color: isSelected ? "#FFFFFF" : "var(--color-text-main)",
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: "0.825rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Menu Items Grid */}
          {filteredItems.length === 0 ? (
            <Card padding="var(--spacing-2xl)">
              <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🍽</div>
                <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--color-text-main)" }}>
                  No menu items found
                </div>
                <p style={{ fontSize: "0.825rem", marginTop: "4px" }}>
                  Try adjusting your search terms or category filter.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  style={{ marginTop: "12px", fontSize: "0.825rem" }}
                >
                  Clear Filters
                </Button>
              </div>
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredItems.map((item) => {
                const isSoldOut = item.status === "sold_out" || item.status === "inactive";
                
                // Count how many of this item are currently in draft in the active order
                const draftCount =
                  currentItems.find(
                    (i) => (i.item_id === item.item_id || i.item_id === item.id) && i.status === "draft"
                  )?.quantity || 0;

                return (
                  <div
                    key={item.item_id || item.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--color-border)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "var(--shadow-sm)",
                      opacity: isSoldOut ? 0.65 : 1,
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      position: "relative",
                    }}
                  >
                    {/* Food Image */}
                    <div
                      style={{
                        height: "120px",
                        position: "relative",
                        backgroundColor: "#EAE8E3",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60"}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />

                      {/* Station Badge overlay */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: "6px",
                          left: "8px",
                          fontSize: "0.68rem",
                          backgroundColor: "rgba(27,27,27,0.75)",
                          color: "#FFFFFF",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 500,
                        }}
                      >
                        {item.station_name || "Kitchen"}
                      </span>

                      {/* Status overlay if sold out */}
                      {isSoldOut && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(255,255,255,0.75)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <StatusPill variant="red">Sold Out</StatusPill>
                        </div>
                      )}

                      {/* In draft counter pill */}
                      {draftCount > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            backgroundColor: "var(--color-primary)",
                            color: "#FFFFFF",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          {draftCount} in draft
                        </div>
                      )}
                    </div>

                    {/* Dish Info */}
                    <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--color-text-main)" }}>
                          {item.name}
                        </h4>
                      </div>

                      <p
                        style={{
                          fontSize: "0.775rem",
                          color: "var(--color-text-muted)",
                          margin: "6px 0 8px 0",
                          lineHeight: 1.35,
                          flex: 1,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.description || "Freshly prepared with quality seasonal ingredients."}
                      </p>

                      {/* Ingredients list */}
                      {item.ingredients && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-light)",
                            marginBottom: "10px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={item.ingredients}
                        >
                          🥗 {item.ingredients}
                        </div>
                      )}

                      {/* Bottom Price and Add Action */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                          {formatMoney(item.price, "₹")}
                        </span>

                        <Button
                          variant={draftCount > 0 ? "secondary" : "primary"}
                          disabled={isSoldOut}
                          onClick={() => handleAddItem(item)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {isSoldOut ? "Unavailable" : draftCount > 0 ? "+ Add More" : "+ Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Summary Panel */}
        <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <Card padding="var(--spacing-lg)">
            {/* Panel Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "10px",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.725rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Order Summary
                </span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
                  {currentOrder ? `${currentOrder.table_no || `Table ${currentOrder.table_id}`} • #${currentOrder.order_id}` : "No Order Selected"}
                </h3>
              </div>
              {currentOrder && <StatusPill status={currentOrderDetails?.status || currentOrder.status} />}
            </div>

            {/* Table context specs */}
            {currentOrder && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <span>Section: <strong>{currentOrderDetails?.section || currentOrder.section || "Main"}</strong></span>
                <span>Guests: <strong>{currentOrderDetails?.guest_count || currentOrderDetails?.guests || currentOrder.guest_count || currentOrder.guests || 2}</strong></span>
                <span>Staff: <strong>{currentOrderDetails?.waiter_name || currentOrder.waiter_name || currentOrder.waiter || "Staff"}</strong></span>
              </div>
            )}

            {/* Draft Items list */}
            <div style={{ margin: "14px 0", maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {!currentOrder || currentItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: "0.825rem" }}>
                  No items added yet. Click "+ Add" on any menu card to build the order draft.
                </div>
              ) : (
                currentItems.map((item, idx) => {
                  const isDraft = item.status === "draft";
                  const unitPrice = Number(item.unit_price) || 0;
                  const qty = Number(item.quantity) || 1;
                  const itemTotal = Number(item.total_price) || unitPrice * qty;

                  return (
                    <div
                      key={`${item.order_item_id || item.item_id || idx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        backgroundColor: isDraft ? "var(--color-primary-subtle)" : "var(--color-bg-page)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border-subtle)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: "8px" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {formatMoney(unitPrice, "₹")} each •{" "}
                          <span style={{ fontWeight: 600, color: isDraft ? "var(--color-primary)" : "var(--color-text-main)" }}>
                            {isDraft ? "Draft" : item.status}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper (for drafts) */}
                      {isDraft ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            onClick={() => handleUpdateQty(item.order_item_id || item.item_id, -1)}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "#FFFFFF",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                            }}
                          >
                            –
                          </button>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                            {qty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.order_item_id || item.item_id, 1)}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "#FFFFFF",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                          x{qty}
                        </span>
                      )}

                      {/* Total Price for item */}
                      <div style={{ minWidth: "60px", textAlign: "right", fontSize: "0.85rem", fontWeight: 700 }}>
                        {formatMoney(itemTotal, "₹")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Subtotal and Actions */}
            {currentOrder && (
              <div style={{ paddingTop: "12px", borderTop: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Total Items:</span>
                  <span style={{ fontWeight: 600 }}>
                    {currentItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)} items
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "1.1rem" }}>
                  <span style={{ fontWeight: 700 }}>Subtotal:</span>
                  <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                    {formatMoney(currentSubtotal, "₹")}
                  </span>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleViewOrder}
                  style={{ padding: "12px 16px", fontSize: "0.925rem" }}
                >
                  View Order Details →
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MenuBrowser;
