/**
 * src/pages/admin/AuditLog.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 20: Audit Log
 * - Eyebrow: "20 / AUDIT LOG"
 * - Title: "Order change history"
 * - Subtitle: "Every change with timestamp, user, and old and new values."
 * - Filters: User, Table, Date
 * - Table columns: Time, User, Record, Action (INSERT/UPDATE/DELETE pills), Old value, New value
 * - Footer: Hash chain verification badge, "Verify now" button, Pagination controls, Export button
 */

import React, { useState, useEffect, useCallback } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import { fetchAuditLog, verifyAuditChain } from "../../api/admin";
import { formatDateTime } from "../../utils/format";

const AUDIT_TABLES = [
  "all",
  "orders",
  "order_item",
  "kitchen_ticket",
  "restaurant_table",
  "payment",
  "bill",
  "staff",
  "menu_item",
];

export function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(null);

  // Filters & Pagination
  const [tableFilter, setTableFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const loadAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAuditLog({
        page,
        limit: 10,
        user: userFilter,
        table: tableFilter,
        date: dateFilter,
      });

      setEntries(res?.entries || []);
      setTotalPages(res?.total_pages || 1);
      setTotalEntries(res?.total || 0);
      if (res?.verification) {
        setVerification(res.verification);
      }
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [page, tableFilter, userFilter, dateFilter]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  // Cryptographic hash chain verification
  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const result = await verifyAuditChain();
      setVerification(result);
      setVerifyMessage({
        valid: result.valid,
        text: result.valid
          ? `Cryptographic chain intact. Verified ${result.entries_checked} sequential records via SHA-256.`
          : "Hash chain verification failed. Data tampering detected!",
      });
    } catch (err) {
      setVerifyMessage({
        valid: false,
        text: `Verification call failed: ${err.message}`,
      });
    } finally {
      setVerifying(false);
    }
  };

  // Export audit log data
  const handleExport = () => {
    if (!entries.length) return;
    const jsonStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_log_page_${page}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionPill = (action) => {
    switch (action) {
      case "INSERT":
        return <StatusPill variant="green">INSERT</StatusPill>;
      case "UPDATE":
        return <StatusPill variant="amber">UPDATE</StatusPill>;
      case "DELETE":
        return <StatusPill variant="red">DELETE</StatusPill>;
      default:
        return <StatusPill variant="grey">{action}</StatusPill>;
    }
  };

  const formatJsonSnippet = (val) => {
    if (!val) return <span style={{ color: "var(--color-text-light)" }}>&mdash;</span>;
    if (typeof val === "object") {
      return (
        <code style={{ fontSize: "0.75rem", color: "var(--color-text-main)", backgroundColor: "var(--color-bg-page)", padding: "2px 4px", borderRadius: "3px" }}>
          {JSON.stringify(val)}
        </code>
      );
    }
    return String(val);
  };

  const inputStyle = {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "#FFFFFF",
    fontSize: "0.85rem",
    color: "var(--color-text-main)",
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-xl)",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--color-text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            20 / AUDIT LOG
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
            Order change history
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
            Every change with timestamp, user, and old and new values.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Filter by user..."
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            style={{ ...inputStyle, width: "160px" }}
          />

          <select
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setPage(1);
            }}
            style={{ ...inputStyle, width: "170px" }}
          >
            {AUDIT_TABLES.map((tbl) => (
              <option key={tbl} value={tbl}>
                {tbl === "all" ? "All Tables" : tbl}
              </option>
            ))}
          </select>

          <Button variant="secondary" onClick={handleExport} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
            Export
          </Button>
        </div>
      </div>

      {/* Verification Banner */}
      {verifyMessage && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            marginBottom: "var(--spacing-md)",
            backgroundColor: verifyMessage.valid ? "var(--pill-green-bg)" : "var(--pill-red-bg)",
            color: verifyMessage.valid ? "var(--pill-green-text)" : "var(--pill-red-text)",
            border: `1px solid ${verifyMessage.valid ? "var(--pill-green-border)" : "var(--pill-red-border)"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{verifyMessage.text}</span>
          <button
            onClick={() => setVerifyMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Audit Table Card */}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Time</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>User</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Record</th>
                <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--color-text-muted)" }}>Action</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Old Value</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>New Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                entries.map((log) => (
                  <tr key={log.log_id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                      {formatDateTime(log.changed_at)}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{log.changed_by || "System"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      <span style={{ color: "var(--color-primary)" }}>{log.table_name}</span> #{log.record_id}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{getActionPill(log.action)}</td>
                    <td style={{ padding: "10px 12px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formatJsonSnippet(log.old_value)}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formatJsonSnippet(log.new_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Verification status, Verify button, and Pagination */}
        <div
          style={{
            marginTop: "var(--spacing-lg)",
            paddingTop: "var(--spacing-md)",
            borderTop: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--spacing-md)",
          }}
        >
          {/* Hash Chain Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "var(--pill-green-text)",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)", fontWeight: 500 }}>
              Hash chain verified · {verification?.entries_checked || totalEntries} sequential entries
            </span>
            <Button
              variant="secondary"
              onClick={handleVerifyChain}
              disabled={verifying}
              style={{ padding: "4px 10px", fontSize: "0.775rem", marginLeft: "4px" }}
            >
              {verifying ? "Verifying..." : "Verify now"}
            </Button>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              Page {page} of {totalPages} ({totalEntries} total entries)
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: "4px 8px", fontSize: "0.775rem" }}
            >
              &larr; Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: "4px 8px", fontSize: "0.775rem" }}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AuditLog;
