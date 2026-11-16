/**
 * src/pages/kitchen/TicketDetail.jsx
 * Owner: Diya (Module 3 - Kitchen)
 *
 * Screen 12: Ticket Detail
 * - Items checklist breakdown with quantity, station, and individual item progress
 * - Order notes & allergy warning alerts
 * - Guest special delivery notes
 * - Time elapsed counter with target progress bar and due-by estimation
 * - Status history timeline with timestamps and staff attributions
 * - Report issue modal dialog
 * - Next status progression (Mark as ready / Mark served)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchOrderTicket,
  updateTicketStatus,
  advanceOrderTickets,
  reportTicketIssue,
} from "../../api/kitchen";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import FormField from "../../components/FormField";

export function TicketDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [itemUpdatingId, setItemUpdatingId] = useState(null);

  // Issue reporting modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [reportingIssue, setReportingIssue] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrderTicket(orderId);
      setTicketData(data);
    } catch (err) {
      showToast(err.message || "Failed to load ticket details", "error");
    } finally {
      setLoading(false);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Advance whole ticket card
  const handleAdvanceWholeOrder = async () => {
    if (!ticketData) return;
    const current = ticketData.order.ticket_status || ticketData.order.order_status;
    let nextStatus = "cooking";
    if (current === "queued") nextStatus = "cooking";
    else if (current === "cooking") nextStatus = "ready";
    else if (current === "ready") nextStatus = "served";
    else return;

    setAdvancing(true);
    try {
      const res = await advanceOrderTickets(orderId, nextStatus);
      showToast(res.message || `Order #${orderId} moved to ${nextStatus}`, "success");
      await loadTicket();
    } catch (err) {
      showToast(err.message || "Conflict: Cannot change ticket status", "error");
    } finally {
      setAdvancing(false);
    }
  };

  // Move single item status (Interactive item checkbox/toggle)
  const handleItemStatusStep = async (item) => {
    const nextMap = {
      queued: "cooking",
      cooking: "ready",
      ready: "served",
    };
    const nextStatus = nextMap[item.status];
    if (!nextStatus) return;

    setItemUpdatingId(item.ticket_id);
    try {
      await updateTicketStatus(item.ticket_id, nextStatus);
      showToast(`${item.item} moved to ${nextStatus}`, "success");
      await loadTicket();
    } catch (err) {
      showToast(err.message || "Status change error", "error");
    } finally {
      setItemUpdatingId(null);
    }
  };

  // Submit issue report
  const handleReportIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueNote.trim()) {
      showToast("Please describe the issue.", "error");
      return;
    }

    setReportingIssue(true);
    try {
      // Report on the first ticket item
      const firstTicketId = ticketData?.items[0]?.ticket_id || 1;
      await reportTicketIssue(firstTicketId, issueNote.trim());
      showToast("Issue report logged successfully", "success");
      setIssueModalOpen(false);
      setIssueNote("");
      await loadTicket();
    } catch (err) {
      showToast(err.message || "Failed to submit issue report", "error");
    } finally {
      setReportingIssue(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-muted)" }}>
        Loading ticket #{orderId}...
      </div>
    );
  }

  if (!ticketData || !ticketData.order) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <p style={{ color: "var(--color-danger)", marginBottom: "16px" }}>Ticket not found or closed.</p>
        <Button variant="secondary" onClick={() => navigate("/kitchen/board")}>
          Return to Kitchen Display
        </Button>
      </div>
    );
  }

  const { order, items = [], history = [] } = ticketData;
  const currentStatus = order.ticket_status || order.order_status || "cooking";
  const doneItemsCount = items.filter((it) => ["ready", "served"].includes(it.status)).length;
  const totalItemsCount = items.length;

  const nextActionLabel =
    currentStatus === "queued"
      ? "Start preparing"
      : currentStatus === "cooking"
      ? "Mark as ready"
      : currentStatus === "ready"
      ? "Mark as served"
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* Back Link */}
      <div>
        <Link
          to="/kitchen/board"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--color-text-muted)",
            fontSize: "0.875rem",
            textDecoration: "none",
            fontWeight: "500",
          }}
        >
          ← Back to kitchen display
        </Link>
      </div>

      {/* Ticket Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              marginBottom: "4px",
            }}
          >
            12. TICKET DETAIL
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              Ticket #{order.order_id}
            </h1>
            <StatusPill status={currentStatus}>
              {currentStatus === "cooking" ? "Preparing" : currentStatus === "ready" ? "Ready to serve" : currentStatus}
            </StatusPill>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "6px" }}>
            Table {order.table_label || `T-${String(order.table_id).padStart(2, "0")}`} · {order.section || "Main Hall"} ·{" "}
            {order.guests} guests · Waiter: {order.waiter_name || "A. Smith"} · Station: {order.station_names || "Grill"}
          </div>
        </div>

        {/* Top Right Timer summary */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-main)",
              lineHeight: 1,
            }}
          >
            {order.elapsed_str || "11:48"}
          </div>
          <div style={{ fontSize: "0.775rem", color: "var(--color-text-light)", marginTop: "4px" }}>
            elapsed
          </div>
        </div>
      </div>

      {/* Two Column Content Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1.2fr",
          gap: "var(--spacing-xl)",
          alignItems: "flex-start",
        }}
      >
        {/* Left Column: Items Checklist, Order Notes, Guest Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
          {/* Items Table Card */}
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
                Items ({totalItemsCount})
              </h2>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: "500" }}>
                {doneItemsCount} of {totalItemsCount} done
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px 8px 4px", width: "36px" }}></th>
                    <th style={{ padding: "8px 12px", color: "var(--color-text-muted)", fontWeight: "600" }}>
                      ITEM
                    </th>
                    <th style={{ padding: "8px 12px", color: "var(--color-text-muted)", fontWeight: "600" }}>
                      QTY
                    </th>
                    <th style={{ padding: "8px 12px", color: "var(--color-text-muted)", fontWeight: "600" }}>
                      STATION
                    </th>
                    <th style={{ padding: "8px 12px", color: "var(--color-text-muted)", fontWeight: "600", textAlign: "right" }}>
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isDone = ["ready", "served"].includes(item.status);
                    const isUpdating = itemUpdatingId === item.ticket_id;

                    return (
                      <tr
                        key={item.ticket_id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          backgroundColor: isDone ? "#FAF9F5" : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* Checkbox circle */}
                        <td style={{ padding: "12px 12px 12px 4px", verticalAlign: "middle" }}>
                          <button
                            onClick={() => handleItemStatusStep(item)}
                            disabled={isDone || isUpdating}
                            title={isDone ? "Item is done" : "Click to advance this item"}
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              border: isDone ? "2px solid #2D7A4F" : "2px solid #DDDAD3",
                              backgroundColor: isDone ? "#E8F5E9" : "transparent",
                              color: "#2D7A4F",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isDone ? "default" : "pointer",
                              padding: 0,
                              fontWeight: "bold",
                              fontSize: "12px",
                            }}
                          >
                            {isDone ? "✓" : ""}
                          </button>
                        </td>

                        {/* Item Name + Note */}
                        <td style={{ padding: "12px", verticalAlign: "middle" }}>
                          <div
                            style={{
                              fontWeight: "600",
                              color: isDone ? "var(--color-text-muted)" : "var(--color-text-main)",
                              textDecoration: item.status === "served" ? "line-through" : "none",
                            }}
                          >
                            {item.item}
                          </div>
                          {item.note && (
                            <div style={{ fontSize: "0.775rem", color: "#B47818", marginTop: "2px" }}>
                              {item.note}
                            </div>
                          )}
                          {item.issue_note && (
                            <div style={{ fontSize: "0.775rem", color: "var(--color-danger)", marginTop: "2px" }}>
                              Issue: {item.issue_note}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: "12px", verticalAlign: "middle", fontWeight: "600" }}>
                          {item.quantity}×
                        </td>

                        {/* Station */}
                        <td style={{ padding: "12px", verticalAlign: "middle", color: "var(--color-text-muted)" }}>
                          {item.station}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "12px", verticalAlign: "middle", textAlign: "right" }}>
                          <StatusPill status={item.status}>
                            {item.status === "ready" ? "Done" : item.status === "cooking" ? "Cooking" : item.status}
                          </StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Notes (Allergies) Box */}
          {order.order_notes && (
            <div
              style={{
                backgroundColor: "#FEF7E6",
                border: "1px solid #FDE3A7",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#B47818", fontWeight: "700", fontSize: "0.95rem" }}>
                <span>⚠️ Order notes</span>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#875A10", lineHeight: "1.5" }}>
                {order.order_notes}
              </div>
            </div>
          )}

          {/* Guest Note Box */}
          {order.guest_notes && (
            <div
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                Guest note
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--color-text-main)", fontStyle: "italic" }}>
                "{order.guest_notes}"
              </div>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingTop: "8px",
            }}
          >
            <Button variant="secondary" onClick={() => navigate("/kitchen/board")}>
              Back
            </Button>

            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textAlign: "center", flex: 1 }}>
              Marking as ready notifies {order.waiter_name || "the waiter"} to serve table {order.table_label || "T-02"}.
            </span>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setIssueModalOpen(true)}>
                Report issue
              </Button>

              {nextActionLabel && (
                <Button variant="primary" disabled={advancing} onClick={handleAdvanceWholeOrder}>
                  {advancing ? "Saving..." : nextActionLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Time Elapsed & Status History Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
          {/* Time Elapsed Card */}
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--color-text-muted)" }}>
                Time elapsed
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "#FEF7E6",
                  color: "#B47818",
                  border: "1px solid #FDE3A7",
                }}
              >
                {order.minutes_left !== undefined ? `${order.minutes_left}m left` : "3m left"}
              </span>
            </div>

            {/* Big Timer */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "2.75rem",
                  fontWeight: "700",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-main)",
                  lineHeight: 1,
                }}
              >
                {order.elapsed_str || "11:48"}
              </span>
              <span style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>min</span>
            </div>

            {/* Progress Bar against Target */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                <span>Target {order.target_minutes || 15}:00</span>
                <span>{Math.round(((11.8) / (order.target_minutes || 15)) * 100)}%</span>
              </div>
              <div
                style={{
                  height: "8px",
                  width: "100%",
                  backgroundColor: "#ECEAE4",
                  borderRadius: "var(--radius-pill)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round(((11.8) / (order.target_minutes || 15)) * 100))}%`,
                    backgroundColor: "#B47818",
                    borderRadius: "var(--radius-pill)",
                  }}
                />
              </div>
            </div>

            {/* Sub-Timestamps */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                paddingTop: "12px",
                borderTop: "1px solid var(--color-border-subtle)",
                textAlign: "center",
                fontSize: "0.775rem",
              }}
            >
              <div>
                <div style={{ color: "var(--color-text-muted)" }}>Placed</div>
                <div style={{ fontWeight: "700", color: "var(--color-text-main)", marginTop: "2px" }}>
                  {order.placed_time || "12:14"}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--color-text-muted)" }}>Started</div>
                <div style={{ fontWeight: "700", color: "var(--color-text-main)", marginTop: "2px" }}>
                  {order.started_time || "12:16"}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--color-text-muted)" }}>Due by</div>
                <div style={{ fontWeight: "700", color: "var(--color-text-main)", marginTop: "2px" }}>
                  {order.due_by_time || "12:31"}
                </div>
              </div>
            </div>
          </div>

          {/* Status History Timeline Card */}
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--color-text-main)", margin: 0 }}>
              Status History
            </h2>

            {/* Vertical timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", paddingLeft: "8px" }}>
              {history.map((step, idx) => {
                const isCompleted = step.is_done;
                const isCurrent = step.happened_at && (idx === history.length - 1 || !history[idx + 1]?.is_done);

                return (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px", position: "relative" }}>
                    {/* Circle Node */}
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: isCompleted ? "var(--color-primary)" : "#DDDAD3",
                        border: isCurrent ? "3px solid #C8E6C9" : "none",
                        marginTop: "2px",
                        flexShrink: 0,
                        zIndex: 2,
                      }}
                    />

                    {/* Stage info and timestamp */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div
                          style={{
                            fontWeight: isCompleted ? "600" : "500",
                            color: isCompleted ? "var(--color-text-main)" : "var(--color-text-muted)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {step.stage}
                        </div>
                        <div style={{ fontSize: "0.775rem", color: "var(--color-text-light)", marginTop: "1px" }}>
                          {step.by_name}
                        </div>
                      </div>

                      {step.happened_at && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-muted)",
                            fontWeight: "500",
                          }}
                        >
                          {step.happened_at}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Duration intervals footer */}
            <div
              style={{
                borderTop: "1px solid var(--color-border-subtle)",
                paddingTop: "12px",
                fontSize: "0.75rem",
                color: "var(--color-text-light)",
                fontStyle: "italic",
              }}
            >
              1 min placed to accepted · 1 min accepted to preparing
            </div>
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title={`Report Issue: Ticket #${order.order_id}`}
      >
        <form onSubmit={handleReportIssueSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
            Specify the kitchen delay or ingredient issue. This attaches an issue note to the ticket and alerts the manager dashboard.
          </p>

          <FormField label="Issue Description" required>
            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              placeholder="e.g. Grill element overheating, 5-minute prep delay..."
              rows={4}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "0.875rem",
                fontFamily: "inherit",
              }}
              required
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={reportingIssue}>
              {reportingIssue ? "Submitting..." : "Report Issue"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TicketDetail;
