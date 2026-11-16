/**
 * frontend/cashier/index.js
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Public entry point for Cashier module
 */

export { default as CashierApp } from "./CashierApp";
export { default as BillPayment } from "./BillPayment";
export { default as SplitBill } from "./SplitBill";
export { default as PaymentConfirmation } from "./PaymentConfirmation";
export { default as OpenBills } from "./OpenBills";

export * from "./cashierApi";
export * from "./mockData";
export { default } from "./CashierApp";
