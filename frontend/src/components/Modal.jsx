/**
 * src/components/Modal.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Accessible dialog modal overlay with header, body content, and action buttons.
 */

import React, { useEffect } from "react";
import Button from "./Button";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "500px",
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backdropStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(27, 27, 27, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "var(--spacing-md)",
  };

  const modalBoxStyle = {
    backgroundColor: "var(--color-bg-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-md)",
    width: "100%",
    maxWidth: maxWidth,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--spacing-md) var(--spacing-lg)",
    borderBottom: "1px solid var(--color-border-subtle)",
  };

  const bodyStyle = {
    padding: "var(--spacing-lg)",
    overflowY: "auto",
  };

  const footerStyle = {
    padding: "var(--spacing-md) var(--spacing-lg)",
    borderTop: "1px solid var(--color-border-subtle)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--spacing-sm)",
    backgroundColor: "var(--color-bg-page)",
  };

  return (
    <div style={backdropStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              color: "var(--color-text-muted)",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
