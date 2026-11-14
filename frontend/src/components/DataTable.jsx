/**
 * src/components/DataTable.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Lightweight table component for tabular data display.
 * Props:
 * - columns: Array of { key, label, render?, align? }
 * - rows: Array of row objects
 * - emptyMessage: String shown when rows array is empty
 */

import React from "react";

export function DataTable({
  columns = [],
  rows = [],
  emptyMessage = "No records found.",
  className = "",
  style = {},
}) {
  const tableContainerStyle = {
    width: "100%",
    overflowX: "auto",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-bg-card)",
    ...style,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.875rem",
  };

  const thStyle = (align = "left") => ({
    backgroundColor: "var(--color-bg-page)",
    color: "var(--color-text-muted)",
    padding: "10px 14px",
    fontWeight: "600",
    borderBottom: "1px solid var(--color-border)",
    textAlign: align,
  });

  const tdStyle = (align = "left") => ({
    padding: "12px 14px",
    borderBottom: "1px solid var(--color-border-subtle)",
    color: "var(--color-text-main)",
    textAlign: align,
  });

  return (
    <div className={`data-table-container ${className}`} style={tableContainerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle(col.align)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  ...tdStyle("center"),
                  padding: "var(--spacing-xl)",
                  color: "var(--color-text-muted)",
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id || row._id || rowIndex}>
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle(col.align)}>
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
