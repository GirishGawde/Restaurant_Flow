/**
 * src/components/Card.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * White card surface with thin light border matching the Figma aesthetic.
 */

import React from "react";

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  className = "",
  style = {},
  padding = "var(--spacing-lg)",
  ...props
}) {
  const cardStyle = {
    backgroundColor: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-sm)",
    padding: padding,
    ...style,
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "var(--spacing-md)",
    paddingBottom: "var(--spacing-sm)",
    borderBottom: "1px solid var(--color-border-subtle)",
  };

  return (
    <div className={`card ${className}`} style={cardStyle} {...props}>
      {(title || subtitle || headerAction) && (
        <div style={headerStyle}>
          <div>
            {title && <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{title}</h3>}
            {subtitle && (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
