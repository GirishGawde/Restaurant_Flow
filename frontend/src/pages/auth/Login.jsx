/**
 * src/pages/auth/Login.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 1: Login
 * - Username & Password inputs
 * - Four role selector tiles: Admin, Cashier, Waiter, Kitchen Staff (chef)
 * - Submit button: "Log in as <Role>"
 * - Authenticates against API (or mockApi when VITE_USE_MOCKS=true)
 * - Redirects upon success to the role's home screen
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ROLES, ROLE_LABELS, getHomeRouteForRole } from "../../auth/roles";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { role: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN], description: "Management, menu, staff, and reports" },
    { role: ROLES.CASHIER, label: ROLE_LABELS[ROLES.CASHIER], description: "Billing, promotions, and payments" },
    { role: ROLES.WAITER, label: ROLE_LABELS[ROLES.WAITER], description: "Table management and order entry" },
    { role: ROLES.CHEF, label: ROLE_LABELS[ROLES.CHEF], description: "Kitchen display and order tickets" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const user = await login(username.trim(), password, selectedRole);
      // Navigate to the role's home route
      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
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
    maxWidth: "460px",
  };

  const roleGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--spacing-sm)",
    marginBottom: "var(--spacing-lg)",
  };

  const getTileStyle = (role) => {
    const isSelected = selectedRole === role;
    return {
      padding: "12px",
      borderRadius: "var(--radius-md)",
      border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
      backgroundColor: isSelected ? "var(--color-primary-subtle)" : "var(--color-bg-card)",
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.15s ease",
    };
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
      <div style={{ textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
          Restaurant Table & Kitchen Order Flow
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
          Database Concurrency & Order Lifecycle Simulator
        </p>
      </div>

      <Card style={cardStyle}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "var(--spacing-xs)" }}>Staff Sign In</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "var(--spacing-md)" }}>
          Select your assigned role and log in with your credentials.
        </p>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "var(--pill-red-bg)",
              color: "var(--pill-red-text)",
              border: "1px solid var(--pill-red-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              marginBottom: "var(--spacing-md)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role selector tiles */}
          <label style={{ fontSize: "0.85rem", fontWeight: "500", display: "block", marginBottom: "var(--spacing-xs)" }}>
            Select Role:
          </label>
          <div style={roleGridStyle}>
            {roleOptions.map((opt) => (
              <div
                key={opt.role}
                style={getTileStyle(opt.role)}
                onClick={() => setSelectedRole(opt.role)}
                role="button"
                tabIndex={0}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-main)" }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                  {opt.description}
                </div>
              </div>
            ))}
          </div>

          {/* Username */}
          <FormField label="Username" id="username" required>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jlee, asmith, krao, mrossi"
              style={inputStyle}
            />
          </FormField>

          {/* Password */}
          <FormField label="Password" id="password" required>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (mock mode accepts 'test')"
              style={inputStyle}
            />
          </FormField>

          <Button type="submit" variant="primary" fullWidth disabled={loading} style={{ marginTop: "var(--spacing-sm)" }}>
            {loading ? "Authenticating..." : `Log in as ${ROLE_LABELS[selectedRole] || selectedRole}`}
          </Button>

          <div style={{ marginTop: "var(--spacing-md)", textAlign: "center", fontSize: "0.85rem" }}>
            <Link to="/forgot-password" style={{ color: "var(--color-text-muted)" }}>
              Forgot your password?
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default Login;
