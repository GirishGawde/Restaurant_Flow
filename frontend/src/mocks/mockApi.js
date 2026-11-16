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
import kitchenData from "./data/kitchen.json";

// In-memory state so edits persist while browsing in mock mode
let mockMenuItems = [...menuData];
let mockStaff = [...staffData];
let mockAudit = { ...auditData };
let mockStations = JSON.parse(JSON.stringify(stationsData));
let mockKitchenOrders = JSON.parse(JSON.stringify(kitchenData));
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

  // 9. Stations (Diya - Module 3)
  if (path === "/stations" && method === "GET") {
    const activeOnly = searchParams.get("active_only") === "true";
    const res = activeOnly ? mockStations.filter((s) => s.is_active) : mockStations;
    return { stations: res };
  }

  if (path === "/stations" && method === "POST") {
    const { s_name, display_order = 0, target_prep_minutes = 15, is_active = true } = body;
    if (!s_name || !s_name.trim()) {
      const err = new Error("Station name is required.");
      err.code = "BAD_REQUEST";
      err.status = 400;
      throw err;
    }
    const newStation = {
      station_id: mockStations.length ? Math.max(...mockStations.map((s) => s.station_id)) + 1 : 1,
      s_name: s_name.trim(),
      display_order: parseInt(display_order, 10),
      target_prep_minutes: parseInt(target_prep_minutes, 10),
      is_active: Boolean(is_active),
    };
    mockStations.push(newStation);
    return { station: newStation };
  }

  if (path.startsWith("/stations/") && method === "PATCH") {
    const stId = parseInt(path.split("/")[2], 10);
    const index = mockStations.findIndex((s) => s.station_id === stId);
    if (index === -1) {
      const err = new Error(`Station ${stId} not found.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }
    const current = mockStations[index];
    const updated = {
      ...current,
      ...(body.s_name !== undefined ? { s_name: body.s_name.trim() } : {}),
      ...(body.display_order !== undefined ? { display_order: parseInt(body.display_order, 10) } : {}),
      ...(body.target_prep_minutes !== undefined ? { target_prep_minutes: parseInt(body.target_prep_minutes, 10) } : {}),
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
    };
    mockStations[index] = updated;
    return { station: updated };
  }

  // 9.1 Kitchen Display Board (Screen 11: Diya)
  if (path === "/kitchen/board" && method === "GET") {
    const stationFilter = searchParams.get("station");
    const sort = searchParams.get("sort") || "oldest_first";

    let cards = mockKitchenOrders.map((order) => {
      // Calculate age minutes and timer color
      const ageMinutes = Math.floor(order.placed_at_offset_sec / 60);
      let timerColor = "green";
      if (order.ticket_status === "served") {
        timerColor = null;
      } else if (ageMinutes < 10) {
        timerColor = "green";
      } else if (ageMinutes <= 15) {
        timerColor = "amber";
      } else {
        timerColor = "red";
      }

      // Format timer text (MM:SS)
      const mins = Math.floor(order.placed_at_offset_sec / 60);
      const secs = order.placed_at_offset_sec % 60;
      const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      return {
        ...order,
        age_minutes: ageMinutes,
        timer_color: timerColor,
        timer_text: order.wait_offset_sec
          ? `Wait ${String(Math.floor(order.wait_offset_sec / 60)).padStart(2, "0")}:${String(order.wait_offset_sec % 60).padStart(2, "0")}`
          : formattedTime,
        ticket_count: order.items.length,
        item_count: order.items.reduce((acc, it) => acc + (it.quantity || 1), 0),
      };
    });

    if (stationFilter && stationFilter !== "all") {
      const stIdNum = parseInt(stationFilter, 10);
      cards = cards.filter((c) =>
        isNaN(stIdNum)
          ? c.station_names.toLowerCase().includes(stationFilter.toLowerCase())
          : c.station_ids.includes(stIdNum)
      );
    }

    if (sort === "newest_first") {
      cards.sort((a, b) => a.placed_at_offset_sec - b.placed_at_offset_sec);
    } else if (sort === "table") {
      cards.sort((a, b) => a.table_id - b.table_id);
    } else {
      cards.sort((a, b) => b.placed_at_offset_sec - a.placed_at_offset_sec);
    }

    const counts = {
      all: mockKitchenOrders.length,
      new: mockKitchenOrders.filter((o) => o.ticket_status === "queued").length,
      cooking: mockKitchenOrders.filter((o) => o.ticket_status === "cooking").length,
      ready: mockKitchenOrders.filter((o) => o.ticket_status === "ready").length,
      done: mockKitchenOrders.filter((o) => o.ticket_status === "served").length,
    };

    return {
      cards,
      counts,
      avg_prep_time: "12:40",
    };
  }

  // 9.2 Kitchen Ticket Detail (Screen 12: Diya)
  if (path.startsWith("/kitchen/orders/") && path.endsWith("/ticket") && method === "GET") {
    const orderId = parseInt(path.split("/")[3], 10);
    const order = mockKitchenOrders.find((o) => o.order_id === orderId);
    if (!order) {
      const err = new Error(`Order #${orderId} not found.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const elapsedMin = Math.floor(order.placed_at_offset_sec / 60);
    const elapsedSec = order.placed_at_offset_sec % 60;
    const elapsedStr = `${String(elapsedMin).padStart(2, "0")}:${String(elapsedSec).padStart(2, "0")}`;

    // Target prep calculation
    const targetMin = order.due_in_min || 15;
    const minLeft = Math.max(0, targetMin - elapsedMin);

    const history = [
      {
        stage_no: 1,
        stage: "Placed",
        happened_at: "12:14",
        by_name: `${order.waiter_name} (waiter)`,
        is_done: true,
      },
      {
        stage_no: 2,
        stage: "Accepted",
        happened_at: order.ticket_status !== "queued" ? "12:15" : null,
        by_name: "Chef R. Patel",
        is_done: order.ticket_status !== "queued",
      },
      {
        stage_no: 3,
        stage: "Preparing",
        happened_at: ["cooking", "ready", "served"].includes(order.ticket_status) ? "12:16" : null,
        by_name: `${order.station_names || "Grill"} station`,
        is_done: ["cooking", "ready", "served"].includes(order.ticket_status),
      },
      {
        stage_no: 4,
        stage: "Ready to serve",
        happened_at: ["ready", "served"].includes(order.ticket_status) ? "12:28" : null,
        by_name: ["ready", "served"].includes(order.ticket_status) ? "Chef R. Patel" : "Waiting for kitchen",
        is_done: ["ready", "served"].includes(order.ticket_status),
      },
      {
        stage_no: 5,
        stage: "Served",
        happened_at: order.ticket_status === "served" ? "12:35" : null,
        by_name: order.ticket_status === "served" ? `${order.waiter_name}` : "Waiting for waiter",
        is_done: order.ticket_status === "served",
      },
    ];

    return {
      order: {
        ...order,
        elapsed_str: elapsedStr,
        target_minutes: targetMin,
        minutes_left: minLeft,
        placed_time: "12:14",
        started_time: "12:16",
        due_by_time: "12:31",
      },
      items: order.items,
      history,
    };
  }

  // 9.3 Advance Order Tickets (Card-level step: Diya)
  if (path.startsWith("/kitchen/orders/") && path.endsWith("/advance") && method === "POST") {
    const orderId = parseInt(path.split("/")[3], 10);
    const { new_status } = body;
    const orderIndex = mockKitchenOrders.findIndex((o) => o.order_id === orderId);

    if (orderIndex === -1) {
      const err = new Error(`Order #${orderId} not found.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const order = mockKitchenOrders[orderIndex];
    const allowedProgression = {
      queued: "cooking",
      cooking: "ready",
      ready: "served",
    };

    if (allowedProgression[order.ticket_status] !== new_status) {
      const err = new Error(
        `Ticket is '${order.ticket_status}' and cannot move to '${new_status}' (allowed order: queued -> cooking -> ready -> served).`
      );
      err.code = "KT001";
      err.status = 409;
      throw err;
    }

    order.ticket_status = new_status;
    order.board_column =
      new_status === "cooking" ? "Preparing" : new_status === "ready" ? "Ready to serve" : "Done";
    // Also move all items together
    order.items.forEach((item) => {
      item.status = new_status;
    });

    return {
      order_id: orderId,
      new_status,
      moved_count: order.items.length,
      message: `Successfully advanced ${order.items.length} items to ${new_status}.`,
    };
  }

  // 9.4 Update Single Ticket Status (Diya)
  if (path.startsWith("/kitchen/tickets/") && path.endsWith("/status") && method === "PATCH") {
    const ticketId = parseInt(path.split("/")[2], 10);
    const { status: newStatus } = body;

    let targetItem = null;
    let targetOrder = null;

    for (const order of mockKitchenOrders) {
      const item = order.items.find((it) => it.ticket_id === ticketId);
      if (item) {
        targetItem = item;
        targetOrder = order;
        break;
      }
    }

    if (!targetItem) {
      const err = new Error(`Ticket #${ticketId} not found.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const ranks = { queued: 1, cooking: 2, ready: 3, served: 4 };
    if (ranks[newStatus] !== ranks[targetItem.status] + 1) {
      const err = new Error(
        `Ticket #${ticketId} is '${targetItem.status}' and cannot move to '${newStatus}'. Must follow queued -> cooking -> ready -> served.`
      );
      err.code = "KT001";
      err.status = 409;
      throw err;
    }

    targetItem.status = newStatus;

    // Check if all items in order have reached or exceeded this stage
    const allReady = targetOrder.items.every((it) => ["ready", "served"].includes(it.status));
    const allServed = targetOrder.items.every((it) => it.status === "served");
    const anyCooking = targetOrder.items.some((it) => it.status === "cooking");

    if (allServed) {
      targetOrder.ticket_status = "served";
      targetOrder.board_column = "Done";
    } else if (allReady) {
      targetOrder.ticket_status = "ready";
      targetOrder.board_column = "Ready to serve";
    } else if (anyCooking) {
      targetOrder.ticket_status = "cooking";
      targetOrder.board_column = "Preparing";
    }

    return { ticket: targetItem };
  }

  // 9.5 Report Issue on Ticket (Screen 12: Diya)
  if (path.startsWith("/kitchen/tickets/") && path.endsWith("/issue") && method === "POST") {
    const ticketId = parseInt(path.split("/")[2], 10);
    const { note } = body;
    if (!note || !note.trim()) {
      const err = new Error("Issue description 'note' cannot be empty.");
      err.code = "BAD_REQUEST";
      err.status = 400;
      throw err;
    }

    for (const order of mockKitchenOrders) {
      const item = order.items.find((it) => it.ticket_id === ticketId);
      if (item) {
        item.issue_note = note.trim();
        order.has_issue = true;
        break;
      }
    }

    return { ticket_id: ticketId, issue_note: note.trim() };
  }

  // 9.6 Kitchen Statistics (Diya)
  if (path === "/kitchen/stats" && method === "GET") {
    const stationLoads = mockStations.map((st) => {
      let queued = 0;
      let cooking = 0;
      let ready = 0;

      mockKitchenOrders.forEach((order) => {
        if (order.ticket_status !== "served") {
          order.items.forEach((it) => {
            if (it.station_id === st.station_id || it.station === st.s_name) {
              if (it.status === "queued") queued += it.quantity || 1;
              else if (it.status === "cooking") cooking += it.quantity || 1;
              else if (it.status === "ready") ready += it.quantity || 1;
            }
          });
        }
      });

      return {
        station_id: st.station_id,
        station_name: st.s_name,
        queued_items: queued,
        cooking_items: cooking,
        ready_items: ready,
        in_progress_items: queued + cooking,
        capacity: 20,
        load_pct: Math.min(100, Math.round(((queued + cooking) / 20) * 100)),
        target_minutes: st.target_prep_minutes || 15,
        avg_prep_minutes: st.s_name === "Grill" ? 14.2 : st.s_name === "Cold" ? 6.5 : st.s_name === "Oven" ? 11.8 : 4.0,
      };
    });

    return {
      load: stationLoads,
      prep_times: stationLoads,
    };
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
