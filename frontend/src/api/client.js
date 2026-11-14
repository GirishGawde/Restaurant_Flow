/**
 * src/api/client.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Central HTTP client fetch wrapper:
 * - Injects Authorization Bearer token from sessionStorage.
 * - Parses JSON responses automatically.
 * - Normalizes error responses to match { code, message, status, ...extra } matching docs/api.md.
 * - Intercepts calls to src/mocks/mockApi.js when VITE_USE_MOCKS=true.
 */

import { handleMockRequest } from "../mocks/mockApi";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export async function apiClient(endpoint, options = {}) {
  // If mock mode is enabled, route call through mock handler
  if (USE_MOCKS) {
    try {
      return await handleMockRequest(endpoint, options);
    } catch (err) {
      // Normalize mock errors
      const normalizedError = new Error(err.message || "Mock error occurred");
      normalizedError.code = err.code || "MOCK_ERROR";
      normalizedError.status = err.status || 400;
      throw normalizedError;
    }
  }

  // Ensure leading slash on endpoint
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;

  // Read stored auth token from sessionStorage
  const token = sessionStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    const error = new Error(`Network error: ${networkErr.message}`);
    error.code = "NETWORK_ERROR";
    error.status = 0;
    throw error;
  }

  // Parse JSON response body if present
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // API returns errors in format: { "error": { "code": "...", "message": "...", ... } }
    const errorPayload = data?.error || {};
    const message = errorPayload.message || response.statusText || "Request failed";
    const error = new Error(message);

    error.code = errorPayload.code || "REQUEST_FAILED";
    error.status = response.status;

    // Attach any extra properties like current_version, locked_by, etc.
    Object.assign(error, errorPayload);

    throw error;
  }

  return data;
}

export default apiClient;
