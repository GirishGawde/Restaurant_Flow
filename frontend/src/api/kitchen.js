/**
 * src/api/kitchen.js
 * Owner: Diya (Module 3 - Kitchen)
 *
 * Client API for Kitchen Display (Screen 11), Ticket Detail (Screen 12),
 * Stations Management, and Kitchen Statistics.
 */

import apiClient from "./client";

/**
 * Fetch all kitchen stations (Grill, Cold, Oven, Bar, etc.)
 */
export async function fetchStations(activeOnly = false) {
  const query = activeOnly ? "?active_only=true" : "";
  const data = await apiClient(`/stations${query}`);
  return data.stations || [];
}

/**
 * Create a new kitchen station (Admin or Chef)
 */
export async function createStation(stationData) {
  const data = await apiClient("/stations", {
    method: "POST",
    body: JSON.stringify(stationData),
  });
  return data.station;
}

/**
 * Update a kitchen station (name, target prep time, order, active state)
 */
export async function updateStation(stationId, updates) {
  const data = await apiClient(`/stations/${stationId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.station;
}

/**
 * Fetch kitchen display board cards with status counts and average prep time.
 * @param {Object} params - { station, sort }
 */
export async function fetchKitchenBoard({ station = "", sort = "oldest_first" } = {}) {
  const searchParams = new URLSearchParams();
  if (station && station !== "all") {
    searchParams.append("station", station);
  }
  if (sort) {
    searchParams.append("sort", sort);
  }
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return await apiClient(`/kitchen/board${query}`);
}

/**
 * Fetch detailed ticket breakdown for a single order (Screen 12).
 */
export async function fetchOrderTicket(orderId) {
  return await apiClient(`/kitchen/orders/${orderId}/ticket`);
}

/**
 * Advance all tickets for an order to the next step ('cooking', 'ready', 'served').
 * Triggers card-level status transition.
 */
export async function advanceOrderTickets(orderId, newStatus) {
  return await apiClient(`/kitchen/orders/${orderId}/advance`, {
    method: "POST",
    body: JSON.stringify({ new_status: newStatus }),
  });
}

/**
 * Move a single ticket to a specific status.
 */
export async function updateTicketStatus(ticketId, newStatus) {
  return await apiClient(`/kitchen/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
}

/**
 * Report an issue note on a ticket (Screen 12: Report Issue).
 */
export async function reportTicketIssue(ticketId, note) {
  return await apiClient(`/kitchen/tickets/${ticketId}/issue`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

/**
 * Fetch kitchen load, capacity %, and prep time analytics.
 */
export async function fetchKitchenStats() {
  return await apiClient("/kitchen/stats");
}
