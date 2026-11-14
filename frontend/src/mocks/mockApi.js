/**
 * src/mocks/mockApi.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Intercepts API requests when VITE_USE_MOCKS=true.
 * - Accepts any username with password "test" for login.
 * - Returns realistic mock data for tables and menu items.
 * - Allows teammates to develop frontend screens before backend endpoints are built.
 */

import menuData from "./data/menu.json";
import tablesData from "./data/tables.json";

// In-memory mock storage for active mock user
let currentMockUser = null;

export async function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // Simulate network latency (150ms)
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 1. Health check
  if (endpoint === "/health") {
    return { status: "ok" };
  }

  // 2. Auth: Login
  if (endpoint === "/auth/login" && method === "POST") {
    const { username, password, role } = body;

    if (!username || !password || !role) {
      const err = new Error("Missing username, password, or role");
      err.code = "BAD_REQUEST";
      err.status = 400;
      throw err;
    }

    // Mock rule: accepts any username with the password "test"
    if (password !== "test") {
      const err = new Error("Invalid username or password (mock expects password: 'test')");
      err.code = "UNAUTHORIZED";
      err.status = 401;
      throw err;
    }

    const mockStaff = {
      staff_id: "11111111-2222-3333-4444-555555555555",
      name: username.charAt(0).toUpperCase() + username.slice(1),
      username: username,
      role: role,
    };

    currentMockUser = mockStaff;

    return {
      access_token: `mock-token-${role}-${Date.now()}`,
      user: mockStaff,
    };
  }

  // 3. Auth: Me
  if (endpoint === "/auth/me" && method === "GET") {
    if (!currentMockUser) {
      // Return a fallback mock user if called directly
      currentMockUser = {
        staff_id: "11111111-2222-3333-4444-555555555555",
        name: "Demo Staff",
        username: "demo",
        role: "admin",
      };
    }
    return { user: currentMockUser };
  }

  // 4. Tables list
  if (endpoint === "/tables" && method === "GET") {
    return tablesData;
  }

  // 5. Menu list
  if ((endpoint === "/menu" || endpoint === "/menu-items" || endpoint === "/test/menu") && method === "GET") {
    return { menu_items: menuData };
  }

  // Fallback for unmocked routes
  return {
    mock: true,
    endpoint,
    message: "Mock data not yet specified for this endpoint.",
  };
}
