/**
 * src/components/TopBar.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Top navigation bar:
 * - App title: "Restaurant Table & Kitchen Order Flow Simulator"
 * - Role-based navigation tabs for Admin (Dashboard, Menu, Staff, Reports, Audit log)
 * - User name, role pill, profile link, and logout button
 */

import React from "react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/roles";
import StatusPill from "./StatusPill";
import Button from "./Button";

export function TopBar({ pageTitle }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const adminNavItems = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Menu", path: "/admin/menu" },
    { label: "Staff", path: "/admin/staff" },
    { label: "Reports", path: "/admin/reports" },
    { label: "Audit log", path: "/admin/audit" },
  ];

  const barStyle = {
    backgroundColor: "var(--color-bg-card)",
    borderBottom: "1px solid var(--color-border)",
    padding: "0 var(--spacing-lg)",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
  };

  const leftSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-md)",
  };

  const titleStyle = {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--color-primary)",
    letterSpacing: "-0.01em",
    textDecoration: "none",
  };

  const navTabsStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "var(--spacing-md)",
  };

  const rightSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-md)",
  };

  const userInfoStyle = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-sm)",
    fontSize: "0.875rem",
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <header style={barStyle}>
      <div style={leftSectionStyle}>
        <Link to="/" style={titleStyle}>
          Restaurant Simulator
        </Link>

        {/* Admin Navigation Tabs */}
        {role === "admin" && (
          <nav style={navTabsStyle} aria-label="Admin Navigation">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                  backgroundColor: isActive ? "var(--color-primary-subtle)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <div style={rightSectionStyle}>
        {user && (
          <Link to="/profile" title="View Profile & Settings" style={userInfoStyle}>
            <span style={{ fontWeight: 500 }}>{user.name || user.username}</span>
            <StatusPill variant="green">{ROLE_LABELS[role] || role}</StatusPill>
          </Link>
        )}
        <Button variant="secondary" onClick={handleLogout} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
          Log out
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
