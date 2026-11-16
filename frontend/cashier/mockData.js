/**
 * frontend/cashier/mockData.js
 * Owner: Sakshi (Module 4 - Cashier and Billing)
 *
 * Mock dataset strictly matching Figma Wireframes (Screens 13, 14, 14.1, 15, 15.1):
 * - Order #1042 at Table T-02 (3 guests, Waiter: A. Smith, Cashier: R. Patel)
 * - Items with kitchen served timestamps (Diya's tickets handoff)
 * - Applied promotion STAFF10 (10% staff discount)
 * - Prices include tax; no tax line; total = subtotal - discount
 */

export const INITIAL_BILL = {
  bill_id: 1042,
  order_id: 1042,
  receipt_no: "R-1042",
  table_id: 2,
  table_no: "T-02",
  section: "Main Hall",
  guests: 3,
  waiter_name: "A. Smith",
  cashier_name: "R. Patel",
  opened_at: "14:23",
  bill_requested_at: "14:50",
  closed_at: "14:52",
  date_formatted: "02/11/2026",
  status: "unpaid", // "unpaid" | "partially_paid" | "paid"
  is_frozen: true, // Frozen after bill request

  // Itemised bill lines with served times from kitchen tickets
  items: [
    {
      order_item_id: 201,
      name: "Grilled Salmon",
      quantity: 2,
      unit_price: 19.0,
      total_price: 38.0,
      station: "Grill",
      served_at: "14:38",
    },
    {
      order_item_id: 202,
      name: "Caesar Salad",
      quantity: 1,
      unit_price: 12.0,
      total_price: 12.0,
      station: "Salad",
      served_at: "14:35",
    },
    {
      order_item_id: 203,
      name: "Lemonade",
      quantity: 3,
      unit_price: 4.5,
      total_price: 13.5,
      station: "Bar",
      served_at: "14:28",
    },
  ],

  subtotal: 63.5,

  // Promotion details (STAFF10 = 10%)
  promotion: {
    code: "STAFF10",
    kind: "percentage",
    value: 10.0,
    label: "10% staff discount",
    discount_amount: 6.35,
  },

  // Total = subtotal - discount (tax included)
  total_amount: 57.15,

  order_notes: "No onions on Caesar Salad • Birthday table",

  // Audit history log matching Screen 13 & 7
  history: [
    { time: "14:23", text: "Order opened by waiter A. Smith", type: "order" },
    { time: "14:25", text: "Items sent to kitchen (Grill, Salad, Bar)", type: "kitchen" },
    { time: "14:28", text: "Lemonade × 3 served (Bar)", type: "kitchen" },
    { time: "14:35", text: "Caesar Salad × 1 served (Salad)", type: "kitchen" },
    { time: "14:38", text: "Grilled Salmon × 2 served (Grill) – all items served", type: "kitchen" },
    { time: "14:46", text: "STAFF10 discount applied (-$6.35)", type: "promo" },
    { time: "14:50", text: "Bill requested by waiter A. Smith (order frozen)", type: "bill" },
  ],
};

// Available promotions seed
export const PROMOTIONS = [
  { code: "STAFF10", kind: "percentage", value: 10.0, label: "10% staff discount" },
  { code: "WELCOME5", kind: "fixed", value: 5.0, label: "$5.00 welcome voucher" },
];

// Open bills waiting for payment (for Cashier home / bills list)
export const OPEN_BILLS = [
  {
    bill_id: 1042,
    order_id: 1042,
    table_no: "T-02",
    section: "Main Hall",
    guests: 3,
    waiter: "A. Smith",
    items_count: 6,
    subtotal: 63.5,
    discount: 6.35,
    total: 57.15,
    status: "unpaid",
    requested_at: "14:50",
  },
  {
    bill_id: 1043,
    order_id: 1043,
    table_no: "T-05",
    section: "Terrace",
    guests: 2,
    waiter: "M. Chen",
    items_count: 4,
    subtotal: 44.0,
    discount: 0.0,
    total: 44.0,
    status: "unpaid",
    requested_at: "14:55",
  },
  {
    bill_id: 1041,
    order_id: 1041,
    table_no: "T-09",
    section: "Bar",
    guests: 4,
    waiter: "A. Smith",
    items_count: 8,
    subtotal: 92.0,
    discount: 9.2,
    total: 82.8,
    status: "unpaid",
    requested_at: "14:42",
  },
];
