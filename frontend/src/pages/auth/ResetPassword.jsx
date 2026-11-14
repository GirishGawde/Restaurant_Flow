/**
 * src/pages/auth/ResetPassword.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 2.1: Reset Password
 */

import React from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import FormField from "../../components/FormField";

export function ResetPassword() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--spacing-lg)" }}>
      <Card style={{ width: "100%", maxWidth: "440px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "var(--spacing-xs)" }}>
          Screen 2.1: Reset Password
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--spacing-md)" }}>
          Set your new password to complete account recovery.
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <FormField label="New Password" id="new-password" required>
            <input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            />
          </FormField>

          <FormField label="Confirm Password" id="confirm-password" required>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            />
          </FormField>

          <Button variant="primary" fullWidth style={{ marginTop: "var(--spacing-sm)" }}>
            Update Password
          </Button>

          <div style={{ marginTop: "var(--spacing-md)", textAlign: "center", fontSize: "0.85rem" }}>
            <Link to="/login" style={{ color: "var(--color-text-muted)" }}>
              Back to Sign In
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ResetPassword;
