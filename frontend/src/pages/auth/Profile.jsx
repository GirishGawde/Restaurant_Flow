/**
 * src/pages/auth/Profile.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 3: Profile and Settings
 * - Displays authenticated staff account details (Name, Username, Email, Role, ID)
 * - "Change Password" form (current password, new password, confirm)
 * - Calls POST /auth/change-password
 */

import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ROLE_LABELS } from "../../auth/roles";
import Card from "../../components/Card";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import StatusPill from "../../components/StatusPill";
import { changePassword } from "../../api/auth";

export function Profile() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!currentPassword) {
      setMessage({ text: "Please enter your current password.", type: "error" });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setMessage({ text: "New password must be at least 8 characters long.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match. Please verify.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ text: res.message || "Password updated successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ text: err.message || "Failed to change password.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "#FFFFFF",
    color: "var(--color-text-main)",
    outline: "none",
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          03 / SETTINGS
        </span>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
          Profile & Account Settings
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
          Manage your staff account credentials and security preferences.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--spacing-lg)" }}>
        {/* Profile Card */}
        <Card title="Staff Identity">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Full Name
              </span>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "2px" }}>
                {user?.name || "Demo Staff"}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Username
              </span>
              <p style={{ fontSize: "0.95rem", marginTop: "2px" }}>{user?.username || "demo"}</p>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Email Address
              </span>
              <p style={{ fontSize: "0.95rem", marginTop: "2px" }}>{user?.email || `${user?.username}@resto.test`}</p>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Assigned Role
              </span>
              <div style={{ marginTop: "4px" }}>
                <StatusPill variant="green">{ROLE_LABELS[user?.role] || user?.role || "Staff"}</StatusPill>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Account ID
              </span>
              <p style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginTop: "2px", wordBreak: "break-all" }}>
                {user?.staff_id || "00000000-0000-0000-0000-000000000001"}
              </p>
            </div>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card title="Change Password">
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--spacing-md)" }}>
            Keep your account secure by using at least 8 characters.
          </p>

          {message.text && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                marginBottom: "var(--spacing-md)",
                backgroundColor: message.type === "success" ? "var(--pill-green-bg)" : "var(--pill-red-bg)",
                color: message.type === "success" ? "var(--pill-green-text)" : "var(--pill-red-text)",
                border: `1px solid ${message.type === "success" ? "var(--pill-green-border)" : "var(--pill-red-border)"}`,
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <FormField label="Current Password" id="currentPassword" required>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={inputStyle}
              />
            </FormField>

            <FormField label="New Password (min 8 chars)" id="newPassword" required>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Confirm New Password" id="confirmPassword" required>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={inputStyle}
              />
            </FormField>

            <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: "var(--spacing-sm)" }}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
