/**
 * src/components/StatusPill.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Badge pill displaying status labels with visual styling:
 * Variants: 'green', 'amber', 'red', 'grey'.
 */

import React from "react";

export function StatusPill({
  children,
  variant = "grey",
  status = null,
  className = "",
  style = {},
}) {
  // Automatic mapping of domain statuses to color variants if status string is passed
  const mapStatusToVariant = (stat) => {
    if (!stat) return variant;
    const lower = String(stat).toLowerCase();
    switch (lower) {
      case "free":
      case "active":
      case "served":
      case "paid":
      case "ready":
      case "completed":
        return "green";
      case "occupied":
      case "sent":
      case "cooking":
      case "in_progress":
      case "open":
        return "amber";
      case "needs_cleaning":
      case "cancelled":
      case "sold_out":
      case "issue":
      case "conflict":
        return "red";
      case "reserved":
      case "draft":
      case "inactive":
      case "closed":
      default:
        return "grey";
    }
  };

  const finalVariant = status ? mapStatusToVariant(status) : variant;

  const variantStyles = {
    green: {
      backgroundColor: "var(--pill-green-bg)",
      color: "var(--pill-green-text)",
      borderColor: "var(--pill-green-border)",
    },
    amber: {
      backgroundColor: "var(--pill-amber-bg)",
      color: "var(--pill-amber-text)",
      borderColor: "var(--pill-amber-border)",
    },
    red: {
      backgroundColor: "var(--pill-red-bg)",
      color: "var(--pill-red-text)",
      borderColor: "var(--pill-red-border)",
    },
    grey: {
      backgroundColor: "var(--pill-grey-bg)",
      color: "var(--pill-grey-text)",
      borderColor: "var(--pill-grey-border)",
    },
  };

  const currentStyle = variantStyles[finalVariant] || variantStyles.grey;

  const pillBaseStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "var(--radius-pill)",
    fontSize: "0.775rem",
    fontWeight: "600",
    lineHeight: "1.4",
    border: "1px solid",
    textTransform: "capitalize",
    ...currentStyle,
    ...style,
  };

  return (
    <span className={`status-pill pill-${finalVariant} ${className}`} style={pillBaseStyle}>
      {children || status}
    </span>
  );
}

export default StatusPill;
