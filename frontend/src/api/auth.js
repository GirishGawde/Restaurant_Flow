/**
 * src/api/auth.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Authentication & Password Management API methods:
 * - login({ username, password, role })
 * - me()
 * - forgotPassword(email)
 * - resetPassword({ access_token, new_password })
 * - changePassword({ current_password, new_password })
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

/**
 * Screen 2: Sends password reset recovery email.
 */
export async function forgotPassword(email) {
  return apiClient("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Screen 2.1: Sets a new password using token from recovery email.
 */
export async function resetPassword({ access_token, new_password }) {
  return apiClient("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ access_token, new_password }),
  });
}

/**
 * Screen 3: Updates user password for logged-in staff.
 */
export async function changePassword({ current_password, new_password }) {
  return apiClient("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}
