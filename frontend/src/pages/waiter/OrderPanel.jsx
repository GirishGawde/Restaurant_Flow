/**
 * src/pages/waiter/OrderPanel.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 7: Waiter Order Panel
 * - Order metadata (ID, Table, Guests, Waiter, Version, Status)
 * - Separation of Draft Items vs Kitchen-Processed Items
 * - Quantity modification and removal for draft items
 * - Kitchen progress simulation helper (advances Sent -> Preparing -> Served)
 * - Send to Kitchen (creates tickets, updates version)
 * - Request Bill (only enabled when all tickets are served)
 * - Apply Discount integration (Screen 9 Modal)
 * - Order Transaction Activity Timeline
 * - Concurrency conflict & lock wait modal integration (Screen 8)
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { formatMoney, formatTime } from "../../utils/format";
import { waiterStore } from "../../mocks/waiterMockStore";
import {
  fetchOrder,
  fetchMyOrders,
  updateOrderItemQty,
  removeOrderItem,
  sendToKitchen,
  requestBill,
  applyDiscount,
  removeDiscount,
} from "../../api/waiter";

import ConflictModal from "./components/ConflictModal";
import LockWaitModal from "./components/LockWaitModal";
import ApplyDiscountModal from "./components/ApplyDiscountModal";

export function OrderPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal dialog states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showLockWaitModal, setShowLockWaitModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showBillConfirm, setShowBillConfirm] = useState(false);

  // Load order data
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let data = null;
        const targetId = id && id !== "current" && id !== "ORD-101" ? id : null;
        if (targetId) {
          try {
            data = await fetchOrder(targetId);
          } catch (err) {
            console.warn(`Order ${targetId} fetch failed:`, err);
          }
        }
        if (!data) {
          // Find first active order
          const all = await fetchMyOrders();
          const list = Array.isArray(all) ? all : all?.orders || [];
          if (list.length > 0) {
            const active = list.find((o) => o.status !== "closed" && o.status !== "cancelled") || list[0];
            try {
              data = await fetchOrder(active.order_id);
            } catch {
              data = { ...active, items: active.items || [] };
            }
          }
        }
        if (isMounted) {
          setOrder(data);
        }
      } catch (err) {
        console.error("OrderPanel failed to load order:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();

    const unsubscribe = waiterStore.subscribe((state) => {
      if (order?.order_id) {
        const updated = state.orders.find((o) => o.order_id === order.order_id);
        if (updated && isMounted) setOrder({ ...updated });
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id, order?.order_id]);

  // Derived states (safe against null / undefined)
  const orderItems = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order?.items]);

  const draftItems = useMemo(() => {
    return orderItems.filter((i) => i.status === "draft");
  }, [orderItems]);

  const kitchenItems = useMemo(() => {
    return orderItems.filter((i) => i.status !== "draft");
  }, [orderItems]);

  const allItemsServed = useMemo(() => {
    if (!order || orderItems.length === 0) return false;
    return orderItems.every((i) => i.status === "served");
  }, [order, orderItems]);

  const isFrozen = order?.status === "bill_requested" || order?.status === "completed";

  // Handlers
  const handleQtyChange = async (itemId, delta) => {
    if (isFrozen) {
      toast.error("This order is locked because the bill has been requested.");
      return;
    }
    try {
      const updated = await updateOrderItemQty(order.order_id, itemId, delta);
      setOrder({ ...updated });
    } catch (err) {
      toast.error(err.message || "Failed to update item quantity.");
    }
  };

  const handleRemove = async (itemId) => {
    if (isFrozen) return;
    try {
      const updated = await removeOrderItem(order.order_id, itemId);
      setOrder({ ...updated });
      toast.info("Draft item removed.");
    } catch (err) {
      toast.error(err.message || "Failed to remove item.");
    }
  };

  const handleSendToKitchen = async () => {
    if (draftItems.length === 0) {
      toast.error("No draft items to send.");
      return;
    }
    try {
      const updated = await sendToKitchen(order.order_id);
      setOrder({ ...updated });
      setShowSendConfirm(false);
      toast.success(`${draftItems.length} draft item(s) sent to Kitchen (Version updated to v${updated.version})!`);
    } catch (err) {
      toast.error(err.message || "Failed to send to kitchen.");
    }
  };

  const handleRequestBill = async () => {
    if (!allItemsServed) {
      toast.error("All dishes must be served before requesting the bill.");
      return;
    }
    try {
      const updated = await requestBill(order.order_id);
      setOrder({ ...updated });
      setShowBillConfirm(false);
      toast.success(`Bill requested for ${order.table_no}. Order forwarded to Cashier.`);
    } catch (err) {
      toast.error(err.message || "Failed to request bill.");
    }
  };

  // Helper for demo: Advance item prep state (Sent -> Preparing -> Served)
  const handleSimulateAdvanceStatus = (item) => {
    if (isFrozen) return;
    const nextStatus = item.status === "sent" ? "preparing" : item.status === "preparing" ? "served" : "served";
    item.status = nextStatus;
    
    order.history.unshift({
      action: `${item.name} advanced to ${nextStatus}`,
      staff: "Diya (Kitchen Display)",
      timestamp: new Date().toISOString(),
    });

    if (orderItems.every((i) => i.status === "served")) {
      order.status = "served";
    }

    waiterStore.saveState();
    setOrder({ ...order });
    toast.info(`${item.name} status updated to "${nextStatus}".`);
  };

  const handleApplyPromo = async (code) => {
    try {
      const updated = await applyDiscount(order.order_id, code);
      setOrder({ ...updated });
      toast.success(`Promotion ${code} applied successfully!`);
    } catch (err) {
      toast.error(err.message || "Invalid promotion.");
    }
  };

  const handleRemovePromo = async () => {
    try {
      const updated = await removeDiscount(order.order_id);
      setOrder({ ...updated });
      toast.info("Promotion removed from order.");
    } catch (err) {
      toast.error(err.message || "Failed to remove discount.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0", color: "var(--color-text-muted)" }}>
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-2xl) 0" }}>
        <Card style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 24px" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>No Active Order Selected</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
            There is currently no active order. Choose an occupied table from the Table Map or open a new one.
          </p>
          <Button variant="primary" onClick={() => navigate("/waiter/tables")}>
            View Table Map
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)" }}>
      {/* 1. Header Banner & Order Meta */}
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
              Order Panel
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-primary)",
              }}
            >
              {order.table_no} · v{order.version}
            </span>
            <StatusPill status={order.status} />
          </div>

          <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            <strong>{order.order_id}</strong> • {order.guest_count} guests • Section: {order.section} • Waiter: {order.waiter}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/waiter/menu", { state: { orderId: order.order_id } })}
            style={{ fontSize: "0.85rem" }}
          >
            ← Add More from Menu
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/waiter/tables")}
            style={{ fontSize: "0.85rem" }}
          >
            Table Map
          </Button>
        </div>
      </div>

      {/* Notice if order is frozen */}
      {isFrozen && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--pill-amber-bg)",
            border: "1px solid var(--pill-amber-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.85rem",
            color: "var(--pill-amber-text)",
            fontWeight: 600,
          }}
        >
          <span>🔒</span>
          <span>
            {order.status === "bill_requested"
              ? "Bill Requested: This order has been forwarded to the Cashier for final settlement. Item quantities are locked."
              : "Order Completed: This ticket has been paid in full and closed."}
          </span>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--spacing-xl)", alignItems: "start" }}>
        
        {/* Left Column: Order Items (Draft vs Sent) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <Card padding="var(--spacing-lg)">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--color-border-subtle)",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Order Items ({orderItems.length})
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  Review dishes before dispatching to kitchen stations
                </span>
              </div>

              {!isFrozen && (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/waiter/menu", { state: { orderId: order.order_id } })}
                  style={{ fontSize: "0.775rem", padding: "4px 10px" }}
                >
                  + Add Item
                </Button>
              )}
            </div>

            {/* A. Draft Items Section */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--color-primary)",
                  backgroundColor: "var(--color-primary-subtle)",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "8px",
                }}
              >
                <span>Draft Items (Not Sent Yet)</span>
                <span>{draftItems.length} item(s)</span>
              </div>

              {draftItems.length === 0 ? (
                <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-light)", fontSize: "0.825rem", fontStyle: "italic" }}>
                  No unsent draft items. Click "+ Add Item" to add more dishes.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {draftItems.map((item) => (
                    <div
                      key={item.item_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      {/* Left: Quantity Stepper */}
                      {!isFrozen ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            onClick={() => handleQtyChange(item.item_id, -1)}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "4px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "#FFFFFF",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: "0.9rem",
                            }}
                          >
                            –
                          </button>
                          <span style={{ fontSize: "0.95rem", fontWeight: 700, minWidth: "20px", textAlign: "center" }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item.item_id, 1)}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "4px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "#FFFFFF",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: "0.9rem",
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.quantity}x</span>
                      )}

                      {/* Center: Name & Unit price */}
                      <div style={{ flex: 1, margin: "0 14px" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-main)" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {formatMoney(item.unit_price, "₹")} each
                        </div>
                      </div>

                      {/* Right: Total Price & Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {formatMoney(item.total_price, "₹")}
                        </span>
                        <StatusPill status="draft" />
                        {!isFrozen && (
                          <button
                            onClick={() => handleRemove(item.item_id)}
                            title="Remove draft item"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-danger)",
                              cursor: "pointer",
                              padding: "4px",
                              fontSize: "0.9rem",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. Sent / Kitchen Processed Items Section */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  backgroundColor: "var(--color-bg-page)",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "8px",
                }}
              >
                <span>Kitchen Tickets ({kitchenItems.length})</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Tap badge to advance prep stage</span>
              </div>

              {kitchenItems.length === 0 ? (
                <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-light)", fontSize: "0.825rem", fontStyle: "italic" }}>
                  No items sent to the kitchen yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {kitchenItems.map((item) => (
                    <div
                      key={item.item_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "4px",
                            backgroundColor: "var(--color-bg-page)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                          }}
                        >
                          {item.quantity}×
                        </span>

                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-main)" }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {formatMoney(item.unit_price, "₹")} each
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {formatMoney(item.total_price, "₹")}
                        </span>

                        {/* Status badge with interactive simulation toggle */}
                        <button
                          onClick={() => handleSimulateAdvanceStatus(item)}
                          disabled={isFrozen}
                          title="Click to advance status (Sent -> Preparing -> Served)"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: isFrozen ? "default" : "pointer",
                            padding: 0,
                          }}
                        >
                          <StatusPill status={item.status} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Order Notes */}
            {order.notes && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-bg-page)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <span style={{ fontSize: "0.725rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Order Notes:
                </span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.825rem", color: "var(--color-text-main)" }}>
                  {order.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Activity Timeline Card */}
          <Card padding="var(--spacing-lg)">
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
              Order Activity &amp; Transaction Log
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {order.history && order.history.length > 0 ? (
                order.history.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.825rem" }}>
                    <span style={{ color: "var(--color-primary)", marginTop: "2px" }}>•</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>{h.action}</span>
                      <div style={{ fontSize: "0.725rem", color: "var(--color-text-light)" }}>
                        {formatTime(h.timestamp)} • {h.staff}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>No events logged yet.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary, Totals, Actions, Concurrency Demos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          
          {/* Summary Card */}
          <Card padding="var(--spacing-lg)">
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                marginBottom: "12px",
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "8px",
              }}
            >
              Order Settlement Summary
            </div>

            {/* Discount line */}
            <div style={{ marginBottom: "14px", padding: "10px", backgroundColor: "var(--color-bg-page)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Promotion / Discount</span>
                {!isFrozen && (
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {order.discount_code ? "Change / Remove" : "+ Apply Code"}
                  </button>
                )}
              </div>

              {order.discount_code ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ backgroundColor: "var(--color-primary)", color: "#FFFFFF", padding: "1px 6px", borderRadius: "3px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {order.discount_code}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--pill-green-text)", fontWeight: 600 }}>Active</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--pill-green-text)", fontSize: "0.9rem" }}>
                    -{formatMoney(order.discount_amount, "₹")}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginTop: "4px" }}>
                  No coupon applied (e.g. STAFF10 or WELCOME5)
                </div>
              )}
            </div>

            {/* Calculations */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Subtotal ({orderItems.reduce((s, i) => s + (i.quantity || 0), 0)} items):</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(order.subtotal, "₹")}</span>
              </div>

              {order.discount_code && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--pill-green-text)" }}>
                  <span>Discount Savings:</span>
                  <span style={{ fontWeight: 600 }}>-{formatMoney(order.discount_amount, "₹")}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "10px",
                  marginTop: "6px",
                  borderTop: "2px solid var(--color-border)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                <span>Final Total:</span>
                <span style={{ color: "var(--color-primary)" }}>{formatMoney(order.final_total, "₹")}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              {/* Send to Kitchen Button */}
              <Button
                variant="primary"
                fullWidth
                disabled={draftItems.length === 0 || isFrozen}
                onClick={() => setShowSendConfirm(true)}
                style={{ padding: "12px", fontSize: "0.95rem" }}
              >
                Send to Kitchen ({draftItems.length} Drafts) →
              </Button>

              {/* Request Bill Button */}
              <Button
                variant={allItemsServed ? "primary" : "secondary"}
                fullWidth
                disabled={!allItemsServed || isFrozen}
                onClick={() => setShowBillConfirm(true)}
                style={{
                  padding: "12px",
                  fontSize: "0.95rem",
                  backgroundColor: allItemsServed && !isFrozen ? "#2D7A4F" : undefined,
                  borderColor: allItemsServed && !isFrozen ? "#2D7A4F" : undefined,
                }}
              >
                Request Bill
              </Button>

              {!allItemsServed && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)", textAlign: "center", lineHeight: 1.3 }}>
                  Bill can only be requested once all dishes are marked <strong>Served</strong>. (Tap kitchen status badge to simulate).
                </span>
              )}
            </div>
          </Card>

          {/* Screen 8: Concurrency Demo Controls */}
          <Card padding="var(--spacing-md)" style={{ backgroundColor: "var(--color-bg-page)" }}>
            <div style={{ fontSize: "0.725rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Screen 08: Concurrency Simulator
            </div>
            <p style={{ fontSize: "0.775rem", color: "var(--color-text-muted)", margin: "0 0 10px 0" }}>
              Simulate multi-waiter race conditions and database locks:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                onClick={() => setShowConflictModal(true)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--pill-amber-border)",
                  backgroundColor: "var(--pill-amber-bg)",
                  color: "var(--pill-amber-text)",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                ⚡ Trigger Version Conflict Dialog (8A)
              </button>
              <button
                onClick={() => setShowLockWaitModal(true)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "#FFFFFF",
                  color: "var(--color-text-main)",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                🔒 Trigger 30s Lock Wait Dialog (8B)
              </button>
            </div>
          </Card>

        </div>
      </div>

      {/* Confirmation Dialog: Send to Kitchen */}
      {showSendConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(27,27,27,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              maxWidth: "420px",
              width: "100%",
              padding: "20px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px 0" }}>
              Send {draftItems.length} Draft Item(s) to Kitchen?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              Dishes will be routed to respective preparation stations. The order version will advance to v{order.version + 1}.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setShowSendConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSendToKitchen}>
                Confirm &amp; Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Request Bill */}
      {showBillConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(27,27,27,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-lg)",
              maxWidth: "420px",
              width: "100%",
              padding: "20px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px 0" }}>
              Request Bill for {order.table_no}?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              All items are served. Requesting the bill will freeze item edits and notify the cashier for bill generation and payment settlement.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setShowBillConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRequestBill}
                style={{ backgroundColor: "#2D7A4F", borderColor: "#2D7A4F" }}
              >
                Confirm Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Screen 8A: Version Conflict Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        currentVersion={order.version}
        serverVersion={order.version + 1}
        onRefresh={() => {
          toast.success("Order refreshed with latest server data.");
        }}
      />

      {/* Screen 8B: Lock Wait Modal */}
      <LockWaitModal
        isOpen={showLockWaitModal}
        onClose={() => setShowLockWaitModal(false)}
        lockHolder="J. Lee"
        onUnlocked={() => {
          toast.success("Lock acquired. You can now edit the order.");
        }}
      />

      {/* Screen 9: Apply Discount Modal */}
      <ApplyDiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        order={order}
        onApplyPromo={handleApplyPromo}
        onRemovePromo={handleRemovePromo}
      />
    </div>
  );
}

export default OrderPanel;
