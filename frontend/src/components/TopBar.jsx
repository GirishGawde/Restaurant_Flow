/**
 * src/components/TopBar.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Top navigation bar:
 * - App title: "Restaurant Table & Kitchen Order Flow Simulator"
 * - Current screen / page label
 * - User name and role pill
 * - Logout button
 */

import React from "react";
import { useNavigate } from "react-router-dom";
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
    fontSize: "1rem",
    fontWeight: "700",
    color: "var(--color-primary)",
    letterSpacing: "-0.01em",
  };

  const dividerStyle = {
    height: "20px",
    width: "1px",
    backgroundColor: "var(--color-border)",
  };

  const pageLabelStyle = {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "var(--color-text-main)",
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
  };

  return (
    <header style={barStyle}>
      <div style={leftSectionStyle}>
        <span style={titleStyle}>Restaurant Table & Kitchen Order Flow Simulator</span>
        {pageTitle && (
          <>
            <div style={dividerStyle} />
            <span style={pageLabelStyle}>{pageTitle}</span>
          </>
        )}
      </div>

      <div style={rightSectionStyle}>
        {user && (
          <div style={userInfoStyle}>
            <span style={{ fontWeight: 500 }}>{user.name || user.username}</span>
            <StatusPill variant="green">{ROLE_LABELS[role] || role}</StatusPill>
          </div>
        )}
        <Button variant="secondary" onClick={handleLogout} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
          Log out
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
