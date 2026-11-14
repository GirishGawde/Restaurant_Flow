/**
 * src/layouts/RoleLayout.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Shared application layout for authenticated pages:
 * - TopBar at the top
 * - Responsive content container with Outlet for nested views
 */

import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "../components/TopBar";

export function RoleLayout({ pageTitle }) {
  const layoutStyle = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "var(--color-bg-page)",
  };

  const contentStyle = {
    flex: 1,
    padding: "var(--spacing-xl) var(--spacing-lg)",
    maxWidth: "1280px",
    width: "100%",
    margin: "0 auto",
  };

  return (
    <div style={layoutStyle}>
      <TopBar pageTitle={pageTitle} />
      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}

export default RoleLayout;
