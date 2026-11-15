/**
 * src/pages/auth/ForgotPassword.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 2: Forgot Password
 * - Email address input
 * - "Send reset link" action
 * - Confirmation alert upon submission
 * - Link back to login
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import { forgotPassword } from "../../api/auth";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered staff email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--spacing-lg)",
    backgroundColor: "var(--color-bg-page)",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "440px",
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
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            02 / RECOVERY
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "2px" }}>Forgot Password</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            Enter your registered staff email address to receive a secure recovery link.
          </p>
        </div>

        {submitted ? (
          <div>
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--pill-green-bg)",
                color: "var(--pill-green-text)",
                border: "1px solid var(--pill-green-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                marginBottom: "var(--spacing-lg)",
              }}
            >
              If an account with <strong>{email}</strong> is registered, a password recovery link has been dispatched.
              Please check your inbox.
            </div>
            <Link to="/login">
              <Button variant="secondary" fullWidth>
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormField label="Staff Email" id="email" required>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jlee@resto.test"
                style={inputStyle}
              />
            </FormField>

            <Button type="submit" variant="primary" fullWidth disabled={loading} style={{ marginTop: "var(--spacing-sm)" }}>
              {loading ? "Sending link..." : "Send reset link"}
            </Button>

            <div style={{ marginTop: "var(--spacing-md)", textAlign: "center", fontSize: "0.85rem" }}>
              <Link to="/login" style={{ color: "var(--color-text-muted)" }}>
                Remember your password? Back to Sign In
              </Link>
            </div>

            {error && (
              <div
                style={{
                  marginTop: "var(--spacing-md)",
                  padding: "10px 12px",
                  backgroundColor: "var(--pill-red-bg)",
                  color: "var(--pill-red-text)",
                  border: "1px solid var(--pill-red-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}

export default ForgotPassword;
