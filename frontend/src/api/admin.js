/**
 * src/api/admin.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Admin API client functions for Screens 16, 17, 18, 19, 20:
 * - Dashboard (stats, table map, kitchen load, active orders)
 * - Menu Management (list, create, edit/deactivate)
 * - Staff Management (list, create, edit/deactivate)
 * - Reports (sales by day, best-sellers, waiter performance)
 * - Audit Log (paged history, hash chain verification)
 *
 * NOTE ON PER-ENDPOINT MOCKS:
 * Because backend views for Dashboard, Reports, and Audit Log will be created in SQL 08/09,
 * their flags in ADMIN_MOCK_CONFIG default to true. You can flip them to false one-by-one
 * when the database views and backend routes are deployed.
 */

import { apiClient } from "./client";
import { handleMockRequest } from "../mocks/mockApi";

const GLOBAL_USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// Fine-grained toggle per feature
export const ADMIN_MOCK_CONFIG = {
  staff: false,       // Uses real backend when VITE_USE_MOCKS=false
  menuItems: false,   // Uses real backend when VITE_USE_MOCKS=false
  stations: false,    // Uses real backend when VITE_USE_MOCKS=false
  dashboard: true,    // Kept on mocks until dashboard view SQL is deployed
  reports: true,      // Kept on mocks until reports views SQL is deployed
  auditLog: true,     // Kept on mocks until audit trigger & views are deployed
};

async function executeRequest(endpoint, options = {}, featureKey) {
  if (GLOBAL_USE_MOCKS || ADMIN_MOCK_CONFIG[featureKey]) {
    return handleMockRequest(endpoint, options);
  }
  return apiClient(endpoint, options);
}


// =====================================================================
// Screen 16: Dashboard
// =====================================================================

export async function fetchDashboard() {
  return executeRequest("/dashboard", { method: "GET" }, "dashboard");
}


// =====================================================================
// Screen 17: Menu Management
// =====================================================================

export async function fetchMenuItems({ category, status, search } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.append("category", category);
  if (status && status !== "all") params.append("status", status);
  if (search) params.append("search", search);

  const query = params.toString() ? `?${params.toString()}` : "";
  return executeRequest(`/menu-items${query}`, { method: "GET" }, "menuItems");
}

export async function createMenuItem(itemData) {
  return executeRequest(
    "/menu-items",
    {
      method: "POST",
      body: JSON.stringify(itemData),
    },
    "menuItems"
  );
}

export async function updateMenuItem(itemId, itemData) {
  return executeRequest(
    `/menu-items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(itemData),
    },
    "menuItems"
  );
}

export async function fetchStations() {
  return executeRequest("/stations", { method: "GET" }, "stations");
}


// =====================================================================
// Screen 18: Staff Management
// =====================================================================

export async function fetchStaff({ role, active, search } = {}) {
  const params = new URLSearchParams();
  if (role && role !== "all") params.append("role", role);
  if (active !== undefined && active !== null && active !== "all") params.append("active", active);
  if (search) params.append("search", search);

  const query = params.toString() ? `?${params.toString()}` : "";
  return executeRequest(`/staff${query}`, { method: "GET" }, "staff");
}

export async function createStaff(staffData) {
  return executeRequest(
    "/staff",
    {
      method: "POST",
      body: JSON.stringify(staffData),
    },
    "staff"
  );
}

export async function updateStaff(staffId, staffData) {
  return executeRequest(
    `/staff/${staffId}`,
    {
      method: "PATCH",
      body: JSON.stringify(staffData),
    },
    "staff"
  );
}


// =====================================================================
// Screen 19: Reports
// =====================================================================

export async function fetchReports({ dateRange = "7days", section = "all" } = {}) {
  const params = new URLSearchParams({ date_range: dateRange, section });
  return executeRequest(`/reports?${params.toString()}`, { method: "GET" }, "reports");
}


// =====================================================================
// Screen 20: Audit Log
// =====================================================================

export async function fetchAuditLog({ page = 1, limit = 10, user, table, date } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (user) params.append("user", user);
  if (table && table !== "all") params.append("table", table);
  if (date) params.append("date", date);

  return executeRequest(`/audit-log?${params.toString()}`, { method: "GET" }, "auditLog");
}

export async function verifyAuditChain() {
  return executeRequest("/audit-log/verify", { method: "GET" }, "auditLog");
}
