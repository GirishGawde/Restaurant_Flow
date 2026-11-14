/**
 * src/components/FormField.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Form field wrapper providing consistent layout for labels, inputs, errors, and hints.
 */

import React from "react";

export function FormField({
  label,
  id,
  error,
  helperText,
  required = false,
  children,
  className = "",
  style = {},
}) {
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--spacing-xs)",
    marginBottom: "var(--spacing-md)",
    width: "100%",
    ...style,
  };

  const labelStyle = {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "var(--color-text-main)",
  };

  const errorStyle = {
    fontSize: "0.8rem",
    color: "var(--color-danger)",
    marginTop: "2px",
  };

  const helperStyle = {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    marginTop: "2px",
  };

  return (
    <div className={`form-field ${className}`} style={containerStyle}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label} {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
        </label>
      )}
      {children}
      {error && <span style={errorStyle}>{error}</span>}
      {!error && helperText && <span style={helperStyle}>{helperText}</span>}
    </div>
  );
}

export default FormField;
