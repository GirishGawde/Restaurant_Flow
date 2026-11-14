/**
 * src/auth/AuthContext.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * React context provider managing:
 * - Current logged-in user and token (persisted in sessionStorage)
 * - login() and logout() functions
 * - Active role helper
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("access_token") || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync token to sessionStorage
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("access_token", token);
    } else {
      sessionStorage.removeItem("access_token");
    }
  }, [token]);

  // Sync user to sessionStorage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem("user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("user");
    }
  }, [user]);

  const login = async (username, password, role) => {
    setLoading(true);
    try {
      const res = await apiLogin({ username, password, role });
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
  };

  const role = user?.role || null;
  const isAuthenticated = Boolean(token && user);

  const value = {
    user,
    token,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
