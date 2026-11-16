/**
 * src/api/waiter.js
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * API functions for Waiter Module (Screens 4 to 10).
 * Connects directly to the reactive waiter mock store.
 */

import waiterStore from "../mocks/waiterMockStore";

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchTables() {
  await delay();
  return waiterStore.getTables();
}

export async function fetchTableById(tableId) {
  await delay();
  const table = waiterStore.getTableById(tableId);
  if (!table) throw new Error(`Table ${tableId} not found`);
  return table;
}

export async function markTableClean(tableId) {
  await delay();
  const updated = waiterStore.markTableClean(tableId);
  if (!updated) throw new Error("Table could not be marked clean");
  return updated;
}

export async function fetchMenu(category = "All", search = "") {
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
  await delay();
  return waiterStore.createOrder({ tableId, guestCount, notes, waiterName });
}

export async function fetchOrder(orderId) {
  await delay();
  const order = waiterStore.getOrderById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  return order;
}

export async function fetchMyOrders() {
  await delay();
  return waiterStore.getOrders();
}

export async function addOrderItem(orderId, menuItem) {
  await delay();
  return waiterStore.addDraftItem(orderId, menuItem);
}

export async function updateOrderItemQty(orderId, itemId, delta) {
  await delay();
  return waiterStore.updateItemQuantity(orderId, itemId, delta);
}

export async function removeOrderItem(orderId, itemId) {
  await delay();
  return waiterStore.removeOrderItem(orderId, itemId);
}

export async function sendToKitchen(orderId) {
  await delay();
  return waiterStore.sendToKitchen(orderId);
}

export async function requestBill(orderId) {
  await delay();
  return waiterStore.requestBill(orderId);
}

export async function applyDiscount(orderId, promoCode) {
  await delay();
  return waiterStore.applyDiscount(orderId, promoCode);
}

export async function removeDiscount(orderId) {
  await delay();
  return waiterStore.removeDiscount(orderId);
}

export async function resetStoreData() {
  await delay();
  waiterStore.resetStore();
  return { success: true };
}
