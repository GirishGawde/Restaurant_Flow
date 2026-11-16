/**
 * src/mocks/mockApi.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Mock API layer providing complete mock data for all screens.
 * Enables full frontend testing with VITE_USE_MOCKS=true.
 */

import menuData from "./data/menu.json";
import tablesData from "./data/tables.json";
import stationsData from "./data/stations.json";
import staffData from "./data/staff.json";
import dashboardData from "./data/dashboard.json";
import reportsData from "./data/reports.json";
import auditData from "./data/audit.json";

// In-memory state so edits persist while browsing in mock mode
let mockMenuItems = [...menuData];
let mockStaff = [...staffData];
let mockAudit = { ...auditData };
let mockCurrentStaff = mockStaff[0]; // J. Lee (admin)

export async function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // Extract path and query params
  const [path, queryString] = endpoint.split("?");
  const searchParams = new URLSearchParams(queryString || "");

  // Simulate network latency (100ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 1. Health
  if (path === "/health") {
    return { status: "ok" };
  }

  // 2. Auth: Login
  if (path === "/auth/login" && method === "POST") {
    let { username, password, role } = body;
    
    // Auto-fill default username if blank
    if (!username || !username.trim()) {
      username = role === "waiter" ? "asmith" : role === "admin" ? "jlee" : role === "cashier" ? "mrossi" : "krao";
    }
    if (!password) {
      password = "test";
    }
    if (!role) {
      role = "waiter";
    }

    const matchedStaff = mockStaff.find(
      (s) => s.username.toLowerCase() === username.trim().toLowerCase()
    );

    const user = matchedStaff
      ? { ...matchedStaff, role }
      : {
          staff_id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          username: username.trim(),
          role: role,
          email: `${username.trim()}@resto.test`,
        };

    mockCurrentStaff = user;

    return {
      access_token: `mock-token-${role}-${Date.now()}`,
      user: user,
    };
  }

  // 3. Auth: Me
  if (path === "/auth/me" && method === "GET") {
    return { user: mockCurrentStaff };
  }

  // 4. Auth: Forgot Password
  if (path === "/auth/forgot-password" && method === "POST") {
    return { message: "If this email is registered, a password recovery link has been sent." };
  }

  // 5. Auth: Reset Password
  if (path === "/auth/reset-password" && method === "POST") {
    if (!body.new_password || body.new_password.length < 8) {
      const err = new Error("Password must be at least 8 characters long.");
      err.code = "VALIDATION_ERROR";
      err.status = 422;
      throw err;
    }
    return { message: "Password updated successfully. You can now log in." };
  }

  // 6. Auth: Change Password
  if (path === "/auth/change-password" && method === "POST") {
    if (body.current_password !== "test" && body.current_password !== "admin123") {
      const err = new Error("Current password is incorrect.");
      err.code = "UNAUTHORIZED";
      err.status = 401;
      throw err;
    }
    if (!body.new_password || body.new_password.length < 8) {
      const err = new Error("New password must be at least 8 characters long.");
      err.code = "VALIDATION_ERROR";
      err.status = 422;
      throw err;
    }
    return { message: "Password changed successfully." };
  }

  // 7. Staff Management
  if (path === "/staff") {
    if (method === "GET") {
      let filtered = [...mockStaff];
      const roleFilter = searchParams.get("role");
      const searchFilter = searchParams.get("search");
      const activeFilter = searchParams.get("active");

      if (roleFilter && roleFilter !== "all") {
        filtered = filtered.filter((s) => s.role === roleFilter);
      }
      if (activeFilter !== null && activeFilter !== undefined && activeFilter !== "") {
        const isActiveBool = activeFilter === "true" || activeFilter === "1";
        filtered = filtered.filter((s) => s.is_active === isActiveBool);
      }
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.username.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
        );
      }
      return { staff: filtered };
    }

    if (method === "POST") {
      const { name, username, email, role, phone } = body;
      if (!name || !username || !email || !role) {
        const err = new Error("Name, username, email, and role are required.");
        err.code = "VALIDATION_ERROR";
        err.status = 422;
        throw err;
      }
      const existing = mockStaff.find(
        (s) => s.username.toLowerCase() === username.toLowerCase() || s.email.toLowerCase() === email.toLowerCase()
      );
      if (existing) {
        const err = new Error("A staff member with this username or email already exists.");
        err.code = "DUPLICATE";
        err.status = 409;
        throw err;
      }
      const newPerson = {
        staff_id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
        name,
        username,
        email,
        phone: phone || null,
        role,
        is_active: true,
        last_login: null,
      };
      mockStaff.push(newPerson);
      return { staff: newPerson };
    }
  }

  if (path.startsWith("/staff/") && method === "PATCH") {
    const staffId = path.split("/")[2];
    const index = mockStaff.findIndex((s) => s.staff_id === staffId);
    if (index === -1) {
      const err = new Error("Staff member not found.");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }
    const target = mockStaff[index];
    if (body.is_active === false && target.role === "admin") {
      const activeAdmins = mockStaff.filter((s) => s.role === "admin" && s.is_active && s.staff_id !== staffId);
      if (activeAdmins.length === 0) {
        const err = new Error("Cannot deactivate the last active administrator.");
        err.code = "LAST_ADMIN";
        err.status = 409;
        throw err;
      }
    }
    const updated = {
      ...target,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    };
    mockStaff[index] = updated;
    return { staff: updated };
  }

  // 8. Menu Management
  if (path === "/menu-items" || path === "/menu" || path === "/test/menu") {
    if (method === "GET") {
      let filtered = [...mockMenuItems];
      const cat = searchParams.get("category");
      const status = searchParams.get("status");
      const search = searchParams.get("search");

      if (cat && cat !== "all") {
        filtered = filtered.filter((i) => i.category === cat);
      }
      if (status && status !== "all") {
        filtered = filtered.filter((i) => i.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (i) => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q))
        );
      }
      return { menu_items: filtered };
    }

    if (method === "POST") {
      const { name, category, price, station_id, description, status } = body;
      if (!name || !category || price === undefined || !station_id) {
        const err = new Error("Name, category, price, and kitchen station are required.");
        err.code = "VALIDATION_ERROR";
        err.status = 422;
        throw err;
      }
      const st = stationsData.find((s) => s.station_id === Number(station_id));
      const newItem = {
        item_id: mockMenuItems.length ? Math.max(...mockMenuItems.map((i) => i.item_id)) + 1 : 1,
        name,
        category,
        description: description || null,
        price: parseFloat(price),
        status: status || "active",
        station_id: Number(station_id),
        station_name: st ? st.s_name : "General",
      };
      mockMenuItems.push(newItem);
      return { menu_item: newItem };
    }
  }

  if (path.startsWith("/menu-items/") && method === "PATCH") {
    const itemId = parseInt(path.split("/")[2], 10);
    const index = mockMenuItems.findIndex((i) => i.item_id === itemId);
    if (index === -1) {
      const err = new Error("Menu item not found.");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }
    const current = mockMenuItems[index];
    const stId = body.station_id !== undefined ? Number(body.station_id) : current.station_id;
    const st = stationsData.find((s) => s.station_id === stId);

    const updated = {
      ...current,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price !== undefined ? { price: parseFloat(body.price) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      station_id: stId,
      station_name: st ? st.s_name : current.station_name,
    };
    mockMenuItems[index] = updated;
    return { menu_item: updated };
  }

  // 9. Stations
  if (path === "/stations" && method === "GET") {
    return { stations: stationsData };
  }

  // 10. Dashboard (Screen 16)
  if (path === "/dashboard" && method === "GET") {
    return dashboardData;
  }

  // 11. Reports (Screen 19)
  if (path.startsWith("/reports")) {
    return reportsData;
  }

  // 12. Audit Log (Screen 20)
  if (path === "/audit-log/verify" && method === "GET") {
    return mockAudit.verification;
  }

  if (path === "/audit-log" && method === "GET") {
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const userFilter = searchParams.get("user");
    const tableFilter = searchParams.get("table");

    let entries = [...mockAudit.entries];
    if (userFilter) {
      entries = entries.filter((e) => e.changed_by.toLowerCase().includes(userFilter.toLowerCase()));
    }
    if (tableFilter && tableFilter !== "all") {
      entries = entries.filter((e) => e.table_name === tableFilter);
    }

    const total = entries.length;
    const startIndex = (page - 1) * limit;
    const paginated = entries.slice(startIndex, startIndex + limit);

    return {
      entries: paginated,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
      verification: mockAudit.verification,
    };
  }

  // 13. Tables list
  if (path === "/tables" && method === "GET") {
    return tablesData;
  }

  // Fallback
  return {
    mock: true,
    endpoint,
    message: "Endpoint response provided by fallback mock.",
  };
}
