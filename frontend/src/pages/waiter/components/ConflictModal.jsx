/**
 * src/pages/waiter/components/ConflictModal.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 8A: Optimistic Version Conflict Dialog
 * - Matches Figma Frame 40:1694
 * - Triggers when an order was modified concurrently by another staff member
 * - Shows current local version, remote server version, and last updated time/user
 * - Provides "Refresh Order" and "Cancel" actions
 */

import React from "react";
import Modal from "../../../components/Modal";
import Button from "../../../components/Button";

export function ConflictModal({ isOpen, onClose, currentVersion = 3, serverVersion = 4, onRefresh }) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Version Conflict · Refresh Required"
      maxWidth="460px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onRefresh();
              onClose();
            }}
          >
            Refresh &amp; Retry
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Warning Callout */}
        <div
          style={{
            padding: "14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--pill-amber-bg)",
            border: "1px solid var(--pill-amber-border)",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--pill-amber-text)" }}>
              Optimistic Versioning Conflict
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--color-text-main)", margin: "4px 0 0 0", lineHeight: 1.4 }}>
              This order was modified by another staff member (J. Lee) while you were editing it. Your local changes may be outdated.
            </p>
          </div>
        </div>

        {/* Conflict Specification Details */}
        <div
          style={{
            backgroundColor: "var(--color-bg-page)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-subtle)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Your Local Version:</span>
            <span style={{ fontWeight: 700 }}>v{currentVersion} (Outdated)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Server Version:</span>
            <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>v{serverVersion} (Latest)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Last Updated By:</span>
            <span style={{ fontWeight: 600 }}>J. Lee (Manager) • 1 min ago</span>
          </div>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
          Click <strong>Refresh &amp; Retry</strong> to reload the latest server state and prevent overwriting concurrent updates.
        </p>
      </div>
    </Modal>
  );
}

export default ConflictModal;
