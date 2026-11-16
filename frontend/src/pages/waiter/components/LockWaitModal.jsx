/**
 * src/pages/waiter/components/LockWaitModal.jsx
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Screen 8B: Pessimistic Lock Wait Dialog
 * - Matches Figma Frame 40:1734
 * - Triggers when order has an exclusive transaction lock (FOR UPDATE 30s timeout)
 * - Displays active countdown timer, progress bar, and lock holder details
 */

import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import Button from "../../../components/Button";

export function LockWaitModal({ isOpen, onClose, lockHolder = "J. Lee", onUnlocked }) {
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRemainingSeconds(30);
      setIsUnlocked(false);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsUnlocked(true);
          return 0;
        }
        // Simulate random early lock release around 22 seconds for good demo UX
        if (prev === 23) {
          clearInterval(interval);
          setIsUnlocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = ((30 - remainingSeconds) / 30) * 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUnlocked ? "Lock Released · Order Ready" : "Order Locked · Please Wait"}
      maxWidth="440px"
      footer={
        isUnlocked ? (
          <Button
            variant="primary"
            onClick={() => {
              if (onUnlocked) onUnlocked();
              onClose();
            }}
          >
            Continue Editing
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel Waiting
          </Button>
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {isUnlocked ? (
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--pill-green-bg)",
              border: "1px solid var(--pill-green-border)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>🔓</div>
            <div style={{ fontWeight: 700, color: "var(--pill-green-text)", fontSize: "1rem" }}>
              Order Lock Released!
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--color-text-main)", margin: "4px 0 0 0" }}>
              {lockHolder} has finished editing this order. You now have exclusive access to apply updates.
            </p>
          </div>
        ) : (
          <>
            {/* Lock Summary Card */}
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
              <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--pill-amber-text)" }}>
                  Pessimistic Order Lock Active
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--color-text-main)", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                  This order is currently being updated by <strong>{lockHolder}</strong>. Please wait while the transaction lock completes.
                </p>
              </div>
            </div>

            {/* Countdown and Progress */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
                <span>Lock Timeout</span>
                <span style={{ color: "var(--color-primary)" }}>00:{remainingSeconds.toString().padStart(2, "0")} remaining</span>
              </div>
              <div
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: "var(--color-border-subtle)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    backgroundColor: "var(--color-primary)",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </div>

            {/* Lock Metadata Specs */}
            <div
              style={{
                backgroundColor: "var(--color-bg-page)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-subtle)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "0.825rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Lock Holder:</span>
                <span style={{ fontWeight: 600 }}>{lockHolder} (Manager)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Acquired Time:</span>
                <span style={{ fontWeight: 500 }}>Just now</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Maximum Lock:</span>
                <span style={{ fontWeight: 500 }}>30 seconds max</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              <span className="live-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
              <span>Operation will automatically resume when unlocked.</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default LockWaitModal;
