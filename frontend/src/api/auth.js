/**
 * src/api/auth.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Authentication API methods:
 * - login({ username, password, role })
 * - me()
 */

import { apiClient } from "./client";

/**
 * Signs in a staff member with username, password, and designated role.
 * Returns { access_token, user: { staff_id, name, username, role } }
 */
export async function login({ username, password, role }) {
  return apiClient("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

/**
 * Retrieves the currently authenticated staff user profile.
 */
export async function me() {
  return apiClient("/auth/me", {
    method: "GET",
  });
}
