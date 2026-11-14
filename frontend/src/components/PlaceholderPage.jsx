/**
 * src/components/PlaceholderPage.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Shared placeholder page for screens awaiting teammate implementation.
 * Displays:
 * - Screen title & number
 * - Module owner name
 * - Short explanation of what this screen will do
 */

import React from "react";
import Card from "./Card";
import StatusPill from "./StatusPill";

export function PlaceholderPage({
  screenNumber,
  title,
  owner,
  description,
}) {
  return (
    <div style={{ maxWidth: "800px", margin: "var(--spacing-xl) auto", padding: "0 var(--spacing-md)" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-md)" }}>
          <div>
            {screenNumber && (
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                Screen {screenNumber}
              </span>
            )}
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>{title}</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Owner</span>
            <StatusPill variant="amber">{owner}</StatusPill>
          </div>
        </div>

        <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "var(--spacing-lg)" }}>
          {description || "This screen is part of the project skeleton. The module owner will implement the full UI and business logic here."}
        </p>

        <div style={{ backgroundColor: "var(--color-bg-page)", padding: "var(--spacing-md)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            <strong>Note for {owner}:</strong> When you are ready to build this screen, replace this placeholder with your component inside <code>src/pages/</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default PlaceholderPage;
