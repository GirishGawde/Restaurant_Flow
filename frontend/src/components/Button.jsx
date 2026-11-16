/**
 * Reusable button supporting variants:
 * - 'primary': dark green (#1E6F5C)
 * - 'secondary': clean white card with subtle border
 * - 'danger': red (#C53030)
 */

import React from "react";

export function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled = false,
  fullWidth = false,
  className = "",
  style = {},
  ...props
}) {
  const baseStyles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--spacing-sm)",
    padding: "8px 16px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.925rem",
    fontWeight: "500",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
    border: "1px solid transparent",
    width: fullWidth ? "100%" : "auto",
    opacity: disabled ? 0.6 : 1,
  };

  const variantStyles = {
    primary: {
      backgroundColor: "var(--color-primary)",
      color: "var(--color-primary-contrast)",
      borderColor: "var(--color-primary)",
    },
    secondary: {
      backgroundColor: "var(--color-secondary-bg)",
      color: "var(--color-text-main)",
      borderColor: "var(--color-secondary-border)",
    },
    danger: {
      backgroundColor: "var(--color-danger)",
      color: "var(--color-danger-contrast)",
      borderColor: "var(--color-danger)",
    },
  };

  const selectedVariantStyle = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className}`}
      style={{ ...baseStyles, ...selectedVariantStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
