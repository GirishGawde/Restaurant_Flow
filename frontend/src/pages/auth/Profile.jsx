/**
 * src/pages/auth/Profile.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 3: Profile and Settings
 */

import React from "react";
import { useAuth } from "../../auth/AuthContext";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

export function Profile() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Card title="Screen 3: Profile & Settings" subtitle="View and update your staff profile credentials">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>Staff Name</span>
            <span style={{ fontSize: "1rem", fontWeight: 600 }}>{user?.name || "Demo User"}</span>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>Username</span>
            <span>{user?.username || "demo"}</span>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>Role</span>
            <StatusPill variant="green">{user?.role || "admin"}</StatusPill>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>Staff ID</span>
            <code style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{user?.staff_id || "-"}</code>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Profile;
