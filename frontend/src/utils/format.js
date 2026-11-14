/**
 * src/utils/format.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Formatting utilities for currency and timestamps across all modules.
 */

/**
 * Formats a numeric price into a currency string (e.g. $14.50).
 * Handles numbers or numeric string representations safely.
 */
export function formatMoney(amount, currency = "$") {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency}0.00`;
  }
  return `${currency}${Number(amount).toFixed(2)}`;
}

/**
 * Formats an ISO 8601 date-time string into a human-readable local time (e.g. "2:45 PM").
 */
export function formatTime(isoString) {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}

/**
 * Formats an ISO 8601 date-time string into a full date and time string.
 */
export function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}
