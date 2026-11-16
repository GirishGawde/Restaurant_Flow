/**
 * src/pages/auth/Login.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 * Enhanced for friction-free developer/demo login
 *
 * Screen 1: Login
 * - Role selector tiles: Admin, Cashier, Waiter, Kitchen Staff (chef)
 * - Auto-prefills demo credentials on role select
 * - 1-Click Instant Login button as Waiter
 * - Username & Password inputs with lenient demo fallbacks
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ROLES, ROLE_LABELS, getHomeRouteForRole } from "../../auth/roles";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";

const DEFAULT_CREDENTIALS = {
  [ROLES.WAITER]: { username: "asmith", password: "password123" },
  [ROLES.ADMIN]: { username: "jlee", password: "password123" },
  [ROLES.CASHIER]: { username: "mrossi", password: "password123" },
  [ROLES.CHEF]: { username: "krao", password: "password123" },
};

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Default to Waiter role with pre-filled working credentials for Ayush
  const [selectedRole, setSelectedRole] = useState(ROLES.WAITER);
  const [username, setUsername] = useState("asmith");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { role: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN], description: "Management, menu, staff, and reports" },
    { role: ROLES.CASHIER, label: ROLE_LABELS[ROLES.CASHIER], description: "Billing, promotions, and payments" },
    { role: ROLES.WAITER, label: ROLE_LABELS[ROLES.WAITER], description: "Table management and order entry" },
    { role: ROLES.CHEF, label: ROLE_LABELS[ROLES.CHEF], description: "Kitchen display and order tickets" },
  ];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const creds = DEFAULT_CREDENTIALS[role];
    if (creds) {
      setUsername(creds.username);
      setPassword(creds.password);
    }
    setError("");
  };

  const handleFastWaiterLogin = async () => {
    setError("");
    try {
      setLoading(true);
      const user = await login("asmith", "password123", ROLES.WAITER);
      navigate("/waiter/tables", { replace: true });
    } catch (err) {
      setError(err.message || "Fast login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Fall back to role default if user left it blank
    const finalUsername = (username || "").trim() || DEFAULT_CREDENTIALS[selectedRole]?.username || "asmith";
    const finalPassword = password || "password123";

    try {
      setLoading(true);
      const user = await login(finalUsername, finalPassword, selectedRole);
      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid credentials or login failed.");
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
    marginBottom: "var(--spacing-md)",
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
          Restaurant Table &amp; Kitchen Order Flow
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
          Database Concurrency &amp; Order Lifecycle Simulator
        </p>
      </div>

      <Card style={cardStyle}>
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            01 / SIGN IN
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "2px" }}>Staff Sign In</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            Select your assigned role and log in with your credentials.
          </p>
        </div>

        {/* 1-Click Instant Login for Waiter */}
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <button
            type="button"
            onClick={handleFastWaiterLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 6px rgba(30,111,92,0.3)",
              transition: "transform 0.1s ease",
            }}
          >
            <span>🚀 1-Click Instant Login as Waiter</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "14px 0", color: "var(--color-text-light)", fontSize: "0.75rem" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border-subtle)" }} />
          <span style={{ margin: "0 10px", textTransform: "uppercase" }}>Or Log In Manually</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border-subtle)" }} />
        </div>

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
                onClick={() => handleRoleSelect(opt.role)}
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
              placeholder="e.g. asmith, jlee, or your name"
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
              placeholder="Password (defaults to 'password123')"
              style={inputStyle}
            />
          </FormField>

          <Button type="submit" variant="primary" fullWidth disabled={loading} style={{ marginTop: "var(--spacing-sm)" }}>
            {loading ? "Authenticating..." : `Log in as ${ROLE_LABELS[selectedRole] || selectedRole}`}
          </Button>

          {/* Quick Pre-fill helper badges */}
          <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "var(--color-bg-page)", borderRadius: "var(--radius-md)", fontSize: "0.75rem" }}>
            <div style={{ color: "var(--color-text-muted)", marginBottom: "6px", fontWeight: 600 }}>
              💡 Quick demo accounts (Password: <code>password123</code>):
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleRoleSelect(ROLES.WAITER)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Waiter (<code>asmith</code>)
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect(ROLES.ADMIN)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Admin (<code>jlee</code>)
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect(ROLES.CHEF)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Kitchen (<code>krao</code>)
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect(ROLES.CASHIER)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Cashier (<code>mrossi</code>)
              </button>
            </div>
          </div>

          <div style={{ marginTop: "var(--spacing-md)", textAlign: "center", fontSize: "0.85rem" }}>
            <Link to="/forgot-password" style={{ color: "var(--color-text-muted)" }}>
              Forgot password?
            </Link>
          </div>

          {/* Error message from API shown under the form */}
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
      </Card>
    </div>
  );
}

export default Login;
