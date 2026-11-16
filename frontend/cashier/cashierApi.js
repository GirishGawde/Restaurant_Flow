/**
 * frontend/cashier/cashierApi.js
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Client API services for Cashier module (Screen 13, 14, 14.1, 15, 15.1)
 * Adheres to docs/api.md specifications and custom error codes:
 *   BL001 (ALREADY_PAID) - 409 Conflict
 *   BL002 (AMOUNT_MISMATCH / OVERPAY) - 409 / 422 Conflict
 *   BL003 (ORDER_NOT_READY) - 409 Conflict
 */

import { INITIAL_BILL, OPEN_BILLS, PROMOTIONS } from "./mockData";

// In-memory simulation state so transactions persist across user actions
let currentBill = JSON.parse(JSON.stringify(INITIAL_BILL));
let isClosedSimulated = false;
let closedMetadata = {
  closed_by: "R. Patel",
  closed_at: "14:52",
  timestamp: "02/11/2026",
};

/**
 * Fetch all open bills waiting for payment
 * Route: GET /bills/open
 */
export async function fetchOpenBills() {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return OPEN_BILLS;
}

/**
 * Fetch bill details by orderId (Screen 13)
 * Route: GET /bills/<order_id>
 */
export async function fetchBill(orderId = 1042) {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return { ...currentBill };
}

/**
 * Apply promotion code to bill (Screen 9 / Screen 13)
 * Route: POST /bills/<id>/promotion
 */
export async function applyPromotion(billId, promoCode) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (currentBill.status === "paid" || isClosedSimulated) {
    const error = new Error("Bill is already paid. Cannot modify promotion.");
    error.status = 409;
    error.code = "ALREADY_PAID";
    throw error;
  }

  const promo = PROMOTIONS.find(
    (p) => p.code.toUpperCase() === promoCode.trim().toUpperCase()
  );

  if (!promo) {
    const error = new Error(`Promotion code '${promoCode}' is invalid or expired.`);
    error.status = 404;
    error.code = "PROMO_NOT_FOUND";
    throw error;
  }

  let discountAmt = 0;
  if (promo.kind === "percentage") {
    discountAmt = Number(((currentBill.subtotal * promo.value) / 100).toFixed(2));
  } else {
    discountAmt = Math.min(promo.value, currentBill.subtotal);
  }

  currentBill.promotion = {
    ...promo,
    discount_amount: discountAmt,
  };
  currentBill.total_amount = Number((currentBill.subtotal - discountAmt).toFixed(2));

  return { ...currentBill };
}

/**
 * Remove promotion code from bill
 * Route: DELETE /bills/<id>/promotion
 */
export async function removePromotion(billId) {
  await new Promise((resolve) => setTimeout(resolve, 80));

  if (currentBill.status === "paid" || isClosedSimulated) {
    const error = new Error("Bill is already paid. Cannot modify promotion.");
    error.status = 409;
    error.code = "ALREADY_PAID";
    throw error;
  }

  currentBill.promotion = null;
  currentBill.total_amount = currentBill.subtotal;

  return { ...currentBill };
}

/**
 * Record a single-payer payment (Screen 13 -> Screen 15)
 * Route: POST /bills/<id>/payments
 * Throws 409 Conflict if bill is already closed (double-close check)
 */
export async function recordPayment(billId, paymentDetails) {
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Check double close concurrency condition
  if (currentBill.status === "paid" || isClosedSimulated) {
    const error = new Error(
      `This order is already closed. Paid at ${closedMetadata.closed_at} by cashier ${closedMetadata.closed_by} (double-close blocked).`
    );
    error.status = 409;
    error.code = "ALREADY_PAID";
    error.closed_by = closedMetadata.closed_by;
    error.closed_at = closedMetadata.closed_at;
    throw error;
  }

  const { method, amount, cash_tendered } = paymentDetails;

  if (Number(amount) <= 0) {
    const error = new Error("Payment amount must be greater than zero.");
    error.status = 400;
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  if (method === "cash" && cash_tendered && Number(cash_tendered) < Number(amount)) {
    const error = new Error("Cash tendered is less than the payment amount due.");
    error.status = 422;
    error.code = "INSUFFICIENT_CASH";
    throw error;
  }

  // Update bill state
  isClosedSimulated = true;
  currentBill.status = "paid";
  currentBill.payment = {
    payment_id: 501,
    method,
    amount: Number(amount),
    cash_tendered: cash_tendered ? Number(cash_tendered) : null,
    change_due: cash_tendered ? Number((cash_tendered - amount).toFixed(2)) : null,
    paid_at: "14:52",
    received_by: "R. Patel",
    is_split: false,
  };

  return {
    success: true,
    bill: { ...currentBill },
    receipt_no: currentBill.receipt_no,
  };
}

/**
 * Confirm split bill payments (Screen 14 -> Screen 15)
 * Route: POST /bills/<id>/split-payments
 * Validates sum(payers.amount) === total_amount in a single transaction
 */
export async function confirmSplitPayment(billId, payers) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Double-close concurrency check
  if (currentBill.status === "paid" || isClosedSimulated) {
    const error = new Error(
      `This order is already closed. Paid at ${closedMetadata.closed_at} by cashier ${closedMetadata.closed_by} (double-close blocked).`
    );
    error.status = 409;
    error.code = "ALREADY_PAID";
    error.closed_by = closedMetadata.closed_by;
    error.closed_at = closedMetadata.closed_at;
    throw error;
  }

  if (!payers || !Array.isArray(payers) || payers.length === 0) {
    const error = new Error("No split payment breakdown provided.");
    error.status = 422;
    error.code = "EMPTY_PAYERS";
    throw error;
  }

  // Calculate assigned total
  const assignedTotal = Number(
    payers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)
  );
  const billTotal = Number(currentBill.total_amount.toFixed(2));

  // Validation: totals must match strictly
  if (Math.abs(assignedTotal - billTotal) > 0.009) {
    const difference = (billTotal - assignedTotal).toFixed(2);
    const error = new Error(
      `Split mismatch: Assigned total $${assignedTotal.toFixed(
        2
      )} does not match bill total $${billTotal.toFixed(2)} (${
        difference > 0 ? `Short by $${difference}` : `Over by $${Math.abs(difference)}`
      }).`
    );
    error.status = 409;
    error.code = "SPLIT_MISMATCH";
    error.difference = difference;
    throw error;
  }

  // Settle bill
  isClosedSimulated = true;
  currentBill.status = "paid";
  currentBill.payment = {
    payment_id: 502,
    is_split: true,
    payers: payers.map((p, idx) => ({
      payer_id: idx + 1,
      name: p.name || `Payer ${idx + 1}`,
      amount: Number(p.amount),
      method: p.method,
      cash_tendered: p.cash_tendered ? Number(p.cash_tendered) : null,
      change_due: p.cash_tendered ? Number((p.cash_tendered - p.amount).toFixed(2)) : null,
    })),
    paid_at: "14:52",
    received_by: "R. Patel",
  };

  return {
    success: true,
    bill: { ...currentBill },
    receipt_no: currentBill.receipt_no,
  };
}

/**
 * Fetch receipt data (Screen 15 / 15.1)
 * Route: GET /bills/<id>/receipt
 */
export async function fetchReceipt(billId) {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return {
    receipt_no: currentBill.receipt_no,
    order_id: currentBill.order_id,
    table_no: currentBill.table_no,
    waiter_name: currentBill.waiter_name,
    cashier_name: closedMetadata.closed_by,
    closed_at: currentBill.payment?.paid_at || closedMetadata.closed_at,
    date_formatted: currentBill.date_formatted,
    items: currentBill.items,
    subtotal: currentBill.subtotal,
    promotion: currentBill.promotion,
    total_amount: currentBill.total_amount,
    status: currentBill.status,
    payment: currentBill.payment || {
      method: "card",
      amount: currentBill.total_amount,
      paid_at: "14:52",
    },
  };
}

/**
 * Helper to simulate or reset 409 ALREADY_PAID state for testing wireframe 15.1
 */
export function setSimulatedClosedState(isClosed) {
  isClosedSimulated = isClosed;
  if (isClosed) {
    currentBill.status = "paid";
  } else {
    currentBill.status = "unpaid";
    delete currentBill.payment;
  }
}

/**
 * Helper to reset bill state back to pristine wireframe default
 */
export function resetMockBill() {
  currentBill = JSON.parse(JSON.stringify(INITIAL_BILL));
  isClosedSimulated = false;
}
