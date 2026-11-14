/**
 * src/components/Toast.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Lightweight toast notification context and component.
 * Usage:
 *   const { showToast } = useToast();
 *   showToast("Item sent to kitchen!", "success");
 */

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastContainerStyle = {
    position: "fixed",
    bottom: "var(--spacing-lg)",
    right: "var(--spacing-lg)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--spacing-sm)",
    zIndex: 2000,
  };

  const getToastStyle = (type) => {
    const base = {
      padding: "10px 16px",
      borderRadius: "var(--radius-md)",
      fontSize: "0.875rem",
      boxShadow: "var(--shadow-md)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--spacing-md)",
      minWidth: "260px",
      maxWidth: "400px",
      border: "1px solid",
    };

    switch (type) {
      case "success":
        return {
          ...base,
          backgroundColor: "var(--pill-green-bg)",
          color: "var(--pill-green-text)",
          borderColor: "var(--pill-green-border)",
        };
      case "error":
        return {
          ...base,
          backgroundColor: "var(--pill-red-bg)",
          color: "var(--pill-red-text)",
          borderColor: "var(--pill-red-border)",
        };
      default:
        return {
          ...base,
          backgroundColor: "var(--color-bg-card)",
          color: "var(--color-text-main)",
          borderColor: "var(--color-border)",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={toastContainerStyle}>
        {toasts.map((t) => (
          <div key={t.id} style={getToastStyle(t.type)}>
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontSize: "1rem",
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
