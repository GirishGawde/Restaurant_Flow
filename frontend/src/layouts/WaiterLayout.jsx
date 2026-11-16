/**
 * src/layouts/WaiterLayout.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Dedicated POS layout for Waiter Module (Screens 4 to 10):
 * - Fixed left sidebar with branding, navigation links, active states, staff info, and logout.
 * - Top header with breadcrumb, live date, and role status pill.
 * - Responsive main content container rendering child views via <Outlet />.
 */

import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import StatusPill from "../components/StatusPill";
import { resetStoreData } from "../api/waiter";

export function WaiterLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleResetData = async () => {
    if (window.confirm("Reset all mock tables and orders to default demo data?")) {
      await resetStoreData();
      toast.info("Mock state has been reset to defaults.");
      window.location.reload();
    }
  };

  const navItems = [
    {
      label: "Table Map",
      path: "/waiter/tables",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: "Open New Order",
      path: "/waiter/orders/new",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
    {
      label: "Menu Browser",
      path: "/waiter/menu",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="13" y2="11" />
        </svg>
      ),
    },
    {
      label: "Current Orders",
      path: "/waiter/orders/ORD-101",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      label: "My Orders",
      path: "/waiter/orders",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      ),
    },
  ];

  // Helper for screen header labels
  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.startsWith("/waiter/tables")) {
      return {
        title: "Table Overview",
        subtitle: "Monitor table availability and manage guest orders.",
        tag: "Screen 04 / Table Map",
      };
    }
    if (path.startsWith("/waiter/orders/new")) {
      return {
        title: "Open New Order",
        subtitle: "Select a free table and enter guest details to start an order.",
        tag: "Screen 05 / Open Order",
      };
    }
    if (path.startsWith("/waiter/menu")) {
      return {
        title: "Menu Browser",
        subtitle: "Browse dishes, filter by dietary category, and add items to order.",
        tag: "Screen 06 / Menu Browser",
      };
    }
    if (path.startsWith("/waiter/orders/")) {
      return {
        title: "Order Details",
        subtitle: "Review items, send tickets to kitchen, and request checkout bill.",
        tag: "Screen 07 / Order Panel",
      };
    }
    if (path === "/waiter/orders") {
      return {
        title: "My Orders",
        subtitle: "Track your active, in-progress, and past settled guest orders.",
        tag: "Screen 10 / My Orders",
      };
    }
    return {
      title: "Waiter Dashboard",
      subtitle: "Floor and order management",
      tag: "Waiter POS",
    };
  };

  const headerInfo = getHeaderInfo();
  const waiterDisplayName = user?.name || user?.username || "A. Smith";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-page)" }}>
      {/* Fixed Left Sidebar */}
      <aside
        style={{
          width: "240px",
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
          zIndex: 90,
        }}
      >
        {/* Brand header */}
        <div
          style={{
            padding: "20px var(--spacing-lg)",
            borderBottom: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "1.1rem",
              boxShadow: "0 2px 4px rgba(30,111,92,0.25)",
            }}
          >
            🍽
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--color-text-main)", letterSpacing: "-0.01em" }}>
              Restaurant Flow
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Waiter POS Simulator
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-light)",
              padding: "4px 12px 8px 12px",
            }}
          >
            Floor Operations
          </div>

          {navItems.map((item) => {
            const isActive =
              item.path === "/waiter/orders"
                ? location.pathname === "/waiter/orders"
                : item.path === "/waiter/orders/ORD-101"
                ? location.pathname.startsWith("/waiter/orders/") && location.pathname !== "/waiter/orders/new"
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.label}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--color-primary)" : "var(--color-text-main)",
                  backgroundColor: isActive ? "var(--color-primary-subtle)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  borderLeft: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                }}
              >
                <span style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Separator and Footer profile */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border-subtle)", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Quick reset button for testing */}
          <button
            onClick={handleResetData}
            title="Reset mock data to initial demo state"
            style={{
              background: "none",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "5px 8px",
              fontSize: "0.725rem",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            ↻ Reset Mock Data
          </button>

          {/* Waiter Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              backgroundColor: "var(--color-bg-page)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <Link
              to="/profile"
              style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "inherit", minWidth: 0 }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  flexShrink: 0,
                }}
              >
                {waiterDisplayName.charAt(0)}
              </div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                  {waiterDisplayName}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                  Waiter
                </div>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Log out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: "64px",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid var(--color-border)",
            padding: "0 var(--spacing-xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 80,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)", margin: 0 }}>
                {headerInfo.title}
              </h1>
              <span
                style={{
                  fontSize: "0.725rem",
                  fontWeight: 600,
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                {headerInfo.tag}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
              {headerInfo.subtitle}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Live Clock / Date */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-bg-page)",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{currentDate}</span>
            </div>

            {/* Waiter Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{waiterDisplayName}</span>
              <StatusPill variant="green">Active Shift</StatusPill>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, padding: "var(--spacing-xl)", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default WaiterLayout;
