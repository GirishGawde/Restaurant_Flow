/**
 * src/api/waiter.js
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * API functions for Waiter Module (Screens 4 to 10).
 * Connects to the Flask backend REST API (http://localhost:5000),
 * with automatic fallback to reactive waiter mock store when VITE_USE_MOCKS=true.
 */

import apiClient from "./client";
import waiterStore from "../mocks/waiterMockStore";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";
const delay = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchTables(section) {
  if (!USE_MOCKS) {
    try {
      const url = section && section !== "All" ? `/tables?section=${encodeURIComponent(section)}` : "/tables";
      const data = await apiClient(url);
      return data.tables || data;
    } catch (err) {
      console.warn("fetchTables API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.getTables();
}

export async function fetchTableById(tableId) {
  if (!USE_MOCKS) {
    try {
      const tables = await fetchTables();
      const table = tables.find((t) => t.table_id === Number(tableId) || t.id === Number(tableId));
      if (table) return table;
    } catch (err) {
      console.warn("fetchTableById API failed:", err.message);
    }
  }
  await delay();
  const table = waiterStore.getTableById(tableId);
  if (!table) throw new Error(`Table ${tableId} not found`);
  return table;
}

export async function markTableClean(tableId) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/tables/${tableId}/mark-clean`, { method: "POST" });
      waiterStore.markTableClean(tableId); // sync local store
      return res;
    } catch (err) {
      console.warn("markTableClean API failed, using store:", err.message);
    }
  }
  await delay();
  const updated = waiterStore.markTableClean(tableId);
  if (!updated) throw new Error("Table could not be marked clean");
  return updated;
}

export async function fetchMenu(category = "All", search = "") {
  if (!USE_MOCKS) {
    try {
      const params = new URLSearchParams();
      if (category && category !== "All") params.append("category", category);
      if (search && search.trim()) params.append("search", search.trim());
      const qs = params.toString() ? `?${params.toString()}` : "";
      const data = await apiClient(`/menu${qs}`);
      if (data && data.items) return data.items;
    } catch (err) {
      console.warn("fetchMenu API failed, using store fallback:", err.message);
    }
  }
  await delay();
  let items = waiterStore.getMenuItems();
  if (category && category !== "All") {
    items = items.filter(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.ingredients && item.ingredients.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }
  return items;
}

export async function openOrder({ tableId, guestCount, notes, waiterName }) {
  if (!USE_MOCKS) {
    try {
      const data = await apiClient("/orders", {
        method: "POST",
        body: JSON.stringify({
          table_id: Number(tableId),
          guests: Number(guestCount),
          notes: notes || "",
        }),
      });
      waiterStore.createOrder({ tableId, guestCount, notes, waiterName }); // sync local store
      return data;
    } catch (err) {
      console.warn("openOrder API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.createOrder({ tableId, guestCount, notes, waiterName });
}

export async function fetchOrder(orderId) {
  if (!USE_MOCKS) {
    try {
      const order = await apiClient(`/orders/${orderId}`);
      if (order) return order;
    } catch (err) {
      console.warn("fetchOrder API failed, using store fallback:", err.message);
    }
  }
  await delay();
  const order = waiterStore.getOrderById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  return order;
}

export async function fetchMyOrders(filters = {}) {
  if (!USE_MOCKS) {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "All") params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const data = await apiClient(`/orders${qs}`);
      if (data && data.orders) return data.orders;
    } catch (err) {
      console.warn("fetchMyOrders API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.getOrders();
}

export async function addOrderItem(orderId, menuItem, expectedVersion = 1) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/items`, {
        method: "POST",
        body: JSON.stringify({
          item_id: menuItem.id || menuItem.item_id,
          quantity: menuItem.quantity || 1,
          notes: menuItem.notes || "",
          expected_version: expectedVersion,
        }),
      });
      waiterStore.addDraftItem(orderId, menuItem);
      return res;
    } catch (err) {
      if (err.code === "VERSION_CONFLICT") throw err;
      console.warn("addOrderItem API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.addDraftItem(orderId, menuItem);
}

export async function updateOrderItemQty(orderId, itemId, delta, expectedVersion = 1) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: delta,
          expected_version: expectedVersion,
        }),
      });
      waiterStore.updateItemQuantity(orderId, itemId, delta);
      return res;
    } catch (err) {
      if (err.code === "VERSION_CONFLICT") throw err;
      console.warn("updateOrderItemQty API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.updateItemQuantity(orderId, itemId, delta);
}

export async function removeOrderItem(orderId, itemId, expectedVersion = 1) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/items/${itemId}`, {
        method: "DELETE",
        body: JSON.stringify({ expected_version: expectedVersion }),
      });
      waiterStore.removeOrderItem(orderId, itemId);
      return res;
    } catch (err) {
      if (err.code === "VERSION_CONFLICT") throw err;
      console.warn("removeOrderItem API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.removeOrderItem(orderId, itemId);
}

export async function sendToKitchen(orderId, expectedVersion = 1) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/send-to-kitchen`, {
        method: "POST",
        body: JSON.stringify({ expected_version: expectedVersion }),
      });
      waiterStore.sendToKitchen(orderId);
      return res;
    } catch (err) {
      if (err.code === "VERSION_CONFLICT") throw err;
      console.warn("sendToKitchen API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.sendToKitchen(orderId);
}

export async function requestBill(orderId) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/request-bill`, { method: "POST" });
      waiterStore.requestBill(orderId);
      return res;
    } catch (err) {
      console.warn("requestBill API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.requestBill(orderId);
}

export async function cancelOrder(orderId) {
  if (!USE_MOCKS) {
    try {
      const res = await apiClient(`/orders/${orderId}/cancel`, { method: "POST" });
      waiterStore.cancelOrder(orderId);
      return res;
    } catch (err) {
      console.warn("cancelOrder API failed, using store fallback:", err.message);
    }
  }
  await delay();
  return waiterStore.cancelOrder(orderId);
}

export async function applyDiscount(orderId, promoCode) {
  await delay();
  return waiterStore.applyDiscount(orderId, promoCode);
}

export async function removeDiscount(orderId) {
  await delay();
  return waiterStore.removeDiscount(orderId);
}

export async function simulateKitchenProgress(orderId) {
  await delay();
  return waiterStore.simulateKitchenProgress(orderId);
}

export async function triggerExternalOrderUpdate(orderId) {
  await delay();
  return waiterStore.triggerExternalOrderUpdate(orderId);
}

export function resetStoreData() {
  waiterStore.resetToDefaults();
}
