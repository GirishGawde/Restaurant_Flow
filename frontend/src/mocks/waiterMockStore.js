/**
 * src/mocks/waiterMockStore.js
 * Owner: Ayush (Module 2 - Waiter and Orders)
 *
 * Centralized reactive mock store for Module 2 (Waiter Dashboard).
 * Manages tables (T01 - T18), active orders, menu items, promotions, and order history.
 * Persists in localStorage for persistent state between page navigation and refreshes.
 */

const STORAGE_KEY = "resto_waiter_mock_state_v1";

const INITIAL_TABLES = [
  {
    table_id: 1,
    t_no: "T-01",
    section: "Main Hall",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: "10 min ago",
  },
  {
    table_id: 2,
    t_no: "T-02",
    section: "Main Hall",
    capacity: 4,
    status: "occupied",
    guest_count: 3,
    waiter: "A. Smith",
    order_id: "ORD-101",
    last_activity: "2 min ago",
  },
  {
    table_id: 3,
    t_no: "T-03",
    section: "Main Hall",
    capacity: 2,
    status: "occupied",
    guest_count: 2,
    waiter: "A. Smith",
    order_id: "ORD-102",
    last_activity: "15 min ago",
  },
  {
    table_id: 4,
    t_no: "T-04",
    section: "Main Hall",
    capacity: 6,
    status: "reserved",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: "Reserved for 8:00 PM",
  },
  {
    table_id: 5,
    t_no: "T-05",
    section: "Main Hall",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
  {
    table_id: 6,
    t_no: "T-06",
    section: "Main Hall",
    capacity: 8,
    status: "needs_cleaning",
    guest_count: null,
    waiter: "M. Chen",
    order_id: null,
    last_activity: "Finished 5 min ago",
  },
  {
    table_id: 7,
    t_no: "T-07",
    section: "Terrace",
    capacity: 4,
    status: "occupied",
    guest_count: 4,
    waiter: "M. Chen",
    order_id: "ORD-103",
    last_activity: "8 min ago",
  },
  {
    table_id: 8,
    t_no: "T-08",
    section: "Terrace",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
  {
    table_id: 9,
    t_no: "T-09",
    section: "Terrace",
    capacity: 2,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: "20 min ago",
  },
  {
    table_id: 10,
    t_no: "T-10",
    section: "Terrace",
    capacity: 6,
    status: "occupied",
    guest_count: 5,
    waiter: "A. Smith",
    order_id: "ORD-104",
    last_activity: "3 min ago",
  },
  {
    table_id: 11,
    t_no: "T-11",
    section: "Terrace",
    capacity: 4,
    status: "reserved",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: "Reserved for 8:30 PM",
  },
  {
    table_id: 12,
    t_no: "T-12",
    section: "Terrace",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
  {
    table_id: 13,
    t_no: "T-13",
    section: "Private Room",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
  {
    table_id: 14,
    t_no: "T-14",
    section: "Private Room",
    capacity: 4,
    status: "occupied",
    guest_count: 4,
    waiter: "A. Smith",
    order_id: "ORD-105",
    last_activity: "32 min ago",
  },
  {
    table_id: 15,
    t_no: "T-15",
    section: "Private Room",
    capacity: 2,
    status: "needs_cleaning",
    guest_count: null,
    waiter: "A. Smith",
    order_id: null,
    last_activity: "Finished 12 min ago",
  },
  {
    table_id: 16,
    t_no: "T-16",
    section: "Private Room",
    capacity: 6,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
  {
    table_id: 17,
    t_no: "T-17",
    section: "Bar",
    capacity: 4,
    status: "occupied",
    guest_count: 2,
    waiter: "M. Chen",
    order_id: "ORD-106",
    last_activity: "5 min ago",
  },
  {
    table_id: 18,
    t_no: "T-18",
    section: "Bar",
    capacity: 4,
    status: "free",
    guest_count: null,
    waiter: null,
    order_id: null,
    last_activity: null,
  },
];

const INITIAL_MENU = [
  {
    item_id: 1,
    name: "Bruschetta",
    category: "Starters",
    description: "Toasted artisanal bread topped with diced vine tomatoes, fresh basil, garlic, and extra virgin olive oil.",
    ingredients: "Toasted bread, tomato, basil, garlic, olive oil",
    price: 240,
    status: "active",
    image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=400&q=80",
    station_name: "Cold Station",
  },
  {
    item_id: 2,
    name: "Caesar Salad",
    category: "Starters",
    description: "Crisp romaine lettuce, house-made croutons, shaved parmesan, tossed in our signature creamy dressing.",
    ingredients: "Romaine, parmesan, croutons, caesar dressing",
    price: 290,
    status: "active",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=400&q=80",
    station_name: "Cold Station",
  },
  {
    item_id: 3,
    name: "Crispy Chicken Wings",
    category: "Starters",
    description: "Spiced wings glazed with house buffalo hot sauce served with crunchy celery and blue cheese dip.",
    ingredients: "Chicken wings, buffalo hot sauce, celery, dip",
    price: 360,
    status: "active",
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80",
    station_name: "Grill Station",
  },
  {
    item_id: 4,
    name: "Roasted Tomato Soup",
    category: "Starters",
    description: "Slow-roasted plum tomatoes blended with fresh cream and aromatic sweet basil.",
    ingredients: "Tomato, cream, basil, herb croutons",
    price: 210,
    status: "sold_out",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80",
    station_name: "Oven Station",
  },
  {
    item_id: 5,
    name: "Grilled Salmon Steak",
    category: "Main Course",
    description: "Pan-seared Atlantic salmon fillet with lemon herb butter sauce and roasted seasonal vegetables.",
    ingredients: "Atlantic salmon, herbs, lemon butter, asparagus",
    price: 780,
    status: "active",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=400&q=80",
    station_name: "Grill Station",
  },
  {
    item_id: 6,
    name: "Gourmet Cheeseburger",
    category: "Main Course",
    description: "Juicy beef patty grilled to perfection with aged cheddar, crisp lettuce, ripe tomato, and brioche bun.",
    ingredients: "Beef patty, cheddar, lettuce, tomato, brioche",
    price: 490,
    status: "active",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
    station_name: "Grill Station",
  },
  {
    item_id: 7,
    name: "Spaghetti Carbonara",
    category: "Main Course",
    description: "Classic Italian spaghetti tossed with cured guanciale, farm-fresh egg yolk, Pecorino Romano, and black pepper.",
    ingredients: "Spaghetti, egg yolk, pancetta, pecorino, pepper",
    price: 520,
    status: "active",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=400&q=80",
    station_name: "Oven Station",
  },
  {
    item_id: 8,
    name: "Wood-Fired Margherita Pizza",
    category: "Main Course",
    description: "Authentic sourdough crust with San Marzano tomato sauce, fresh buffalo mozzarella, and basil leaves.",
    ingredients: "San Marzano tomatoes, mozzarella, fresh basil",
    price: 480,
    status: "active",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=80",
    station_name: "Oven Station",
  },
  {
    item_id: 9,
    name: "Garlic Herb Bread",
    category: "Starters",
    description: "Toasted baguette slices infused with crushed garlic, salted French butter, and garden parsley.",
    ingredients: "Baguette, garlic butter, parsley",
    price: 180,
    status: "active",
    image: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=400&q=80",
    station_name: "Oven Station",
  },
  {
    item_id: 10,
    name: "Truffle Fries",
    category: "Starters",
    description: "Crispy golden shoestring fries tossed in white truffle oil, grated parmesan, and rosemary.",
    ingredients: "Potatoes, truffle oil, parmesan, sea salt",
    price: 220,
    status: "active",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
    station_name: "Grill Station",
  },
  {
    item_id: 11,
    name: "Fresh Mint Lemonade",
    category: "Beverages",
    description: "Refreshing freshly squeezed lemon juice infused with garden mint and raw organic sugar cane syrup.",
    ingredients: "Lemon, fresh mint, sparkling water, cane sugar",
    price: 150,
    status: "active",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80",
    station_name: "Bar Station",
  },
  {
    item_id: 12,
    name: "Iced Berry Cooler",
    category: "Beverages",
    description: "Chilled blend of crushed raspberries, blackberries, and soda over ice with a lime wedge.",
    ingredients: "Wild berries, lime, crushed ice, tonic",
    price: 190,
    status: "active",
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=400&q=80",
    station_name: "Bar Station",
  },
  {
    item_id: 13,
    name: "Warm Chocolate Lava Cake",
    category: "Desserts",
    description: "Decadent dark chocolate molten cake with a gooey warm center, served with Madagascan vanilla gelato.",
    ingredients: "Belgian chocolate, vanilla gelato, berries",
    price: 320,
    status: "active",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80",
    station_name: "Oven Station",
  },
  {
    item_id: 14,
    name: "New York Berry Cheesecake",
    category: "Desserts",
    description: "Rich and creamy baked cheesecake on a buttery graham cracker crust with sweet raspberry coulis.",
    ingredients: "Cream cheese, graham crust, berry coulis",
    price: 310,
    status: "sold_out",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80",
    station_name: "Cold Station",
  },
];

const INITIAL_ORDERS = [
  {
    order_id: "ORD-101",
    table_id: 2,
    table_no: "T-02",
    section: "Main Hall",
    guest_count: 3,
    waiter: "A. Smith",
    status: "in_kitchen",
    version: 3,
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    items: [
      {
        item_id: 5,
        name: "Grilled Salmon Steak",
        unit_price: 780,
        quantity: 2,
        total_price: 1560,
        status: "preparing",
      },
      {
        item_id: 2,
        name: "Caesar Salad",
        unit_price: 290,
        quantity: 1,
        total_price: 290,
        status: "served",
      },
      {
        item_id: 11,
        name: "Fresh Mint Lemonade",
        unit_price: 150,
        quantity: 3,
        total_price: 450,
        status: "served",
      },
    ],
    subtotal: 2300,
    discount_code: null,
    discount_amount: 0,
    final_total: 2300,
    notes: "Guest allergic to peanuts. Dressing on the side for salad.",
    history: [
      {
        action: "Order opened",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
      },
      {
        action: "Items sent to kitchen (Salmon x2, Salad x1, Lemonade x3)",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      },
      {
        action: "Caesar Salad marked served",
        staff: "K. Rao (Kitchen)",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        action: "Fresh Mint Lemonade marked served",
        staff: "M. Chen (Bar)",
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-102",
    table_id: 3,
    table_no: "T-03",
    section: "Main Hall",
    guest_count: 2,
    waiter: "A. Smith",
    status: "open",
    version: 1,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    items: [
      {
        item_id: 1,
        name: "Bruschetta",
        unit_price: 240,
        quantity: 1,
        total_price: 240,
        status: "draft",
      },
      {
        item_id: 8,
        name: "Wood-Fired Margherita Pizza",
        unit_price: 480,
        quantity: 1,
        total_price: 480,
        status: "draft",
      },
    ],
    subtotal: 720,
    discount_code: null,
    discount_amount: 0,
    final_total: 720,
    notes: "Extra crispy crust requested.",
    history: [
      {
        action: "Order opened",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        action: "Draft items added",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-103",
    table_id: 7,
    table_no: "T-07",
    section: "Terrace",
    guest_count: 4,
    waiter: "M. Chen",
    status: "in_kitchen",
    version: 2,
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    items: [
      {
        item_id: 6,
        name: "Gourmet Cheeseburger",
        unit_price: 490,
        quantity: 2,
        total_price: 980,
        status: "preparing",
      },
      {
        item_id: 10,
        name: "Truffle Fries",
        unit_price: 220,
        quantity: 2,
        total_price: 440,
        status: "served",
      },
    ],
    subtotal: 1420,
    discount_code: null,
    discount_amount: 0,
    final_total: 1420,
    notes: "Medium well burger.",
    history: [
      {
        action: "Order opened",
        staff: "M. Chen",
        timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-104",
    table_id: 10,
    table_no: "T-10",
    section: "Terrace",
    guest_count: 5,
    waiter: "A. Smith",
    status: "served",
    version: 4,
    created_at: new Date(Date.now() - 55 * 60000).toISOString(),
    items: [
      {
        item_id: 8,
        name: "Wood-Fired Margherita Pizza",
        unit_price: 480,
        quantity: 2,
        total_price: 960,
        status: "served",
      },
      {
        item_id: 7,
        name: "Spaghetti Carbonara",
        unit_price: 520,
        quantity: 2,
        total_price: 1040,
        status: "served",
      },
      {
        item_id: 13,
        name: "Warm Chocolate Lava Cake",
        unit_price: 320,
        quantity: 2,
        total_price: 640,
        status: "served",
      },
    ],
    subtotal: 2640,
    discount_code: "STAFF10",
    discount_amount: 264,
    final_total: 2376,
    notes: "Birthday celebration.",
    history: [
      {
        action: "Order opened",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
      },
      {
        action: "All items served",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      },
      {
        action: "Discount STAFF10 applied (-₹264.00)",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-105",
    table_id: 14,
    table_no: "T-14",
    section: "Private Room",
    guest_count: 4,
    waiter: "A. Smith",
    status: "bill_requested",
    version: 5,
    created_at: new Date(Date.now() - 70 * 60000).toISOString(),
    items: [
      {
        item_id: 5,
        name: "Grilled Salmon Steak",
        unit_price: 780,
        quantity: 4,
        total_price: 3120,
        status: "served",
      },
    ],
    subtotal: 3120,
    discount_code: null,
    discount_amount: 0,
    final_total: 3120,
    notes: "VIP guest.",
    history: [
      {
        action: "Order opened",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 70 * 60000).toISOString(),
      },
      {
        action: "Bill Requested sent to Cashier",
        staff: "A. Smith",
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-106",
    table_id: 17,
    table_no: "T-17",
    section: "Bar",
    guest_count: 2,
    waiter: "M. Chen",
    status: "in_kitchen",
    version: 1,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    items: [
      {
        item_id: 11,
        name: "Fresh Mint Lemonade",
        unit_price: 150,
        quantity: 2,
        total_price: 300,
        status: "preparing",
      },
    ],
    subtotal: 300,
    discount_code: null,
    discount_amount: 0,
    final_total: 300,
    notes: "Less ice.",
    history: [
      {
        action: "Order opened",
        staff: "M. Chen",
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      },
    ],
  },
  {
    order_id: "ORD-098",
    table_id: 1,
    table_no: "T-01",
    section: "Main Hall",
    guest_count: 2,
    waiter: "A. Smith",
    status: "completed",
    version: 4,
    created_at: new Date(Date.now() - 150 * 60000).toISOString(),
    closed_at: new Date(Date.now() - 60 * 60000).toISOString(),
    items: [
      {
        item_id: 6,
        name: "Gourmet Cheeseburger",
        unit_price: 490,
        quantity: 2,
        total_price: 980,
        status: "served",
      },
      {
        item_id: 10,
        name: "Truffle Fries",
        unit_price: 220,
        quantity: 1,
        total_price: 220,
        status: "served",
      },
    ],
    subtotal: 1200,
    discount_code: "WELCOME5",
    discount_amount: 5,
    final_total: 1195,
    notes: "Paid in full via Card.",
    history: [
      {
        action: "Order closed and settled",
        staff: "M. Rossi (Cashier)",
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      },
    ],
  },
];

class WaiterStore {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadState();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
    }
    return {
      tables: INITIAL_TABLES,
      orders: INITIAL_ORDERS,
      menu: INITIAL_MENU,
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error("Store listener error:", err);
      }
    });
  }

  // --- Table Operations ---
  getTables() {
    return this.state.tables;
  }

  getTableById(tableId) {
    return this.state.tables.find(
      (t) => t.table_id === Number(tableId) || t.t_no === String(tableId)
    );
  }

  markTableClean(tableId) {
    const table = this.state.tables.find((t) => t.table_id === Number(tableId));
    if (table) {
      table.status = "free";
      table.guest_count = null;
      table.waiter = null;
      table.order_id = null;
      table.last_activity = "Just cleaned";
      this.saveState();
    }
    return table;
  }

  // --- Order Operations ---
  getOrders() {
    return this.state.orders;
  }

  getOrderById(orderId) {
    return this.state.orders.find((o) => o.order_id === orderId);
  }

  createOrder({ tableId, guestCount, notes, waiterName = "A. Smith" }) {
    const table = this.state.tables.find((t) => t.table_id === Number(tableId));
    if (!table) throw new Error("Table not found");
    if (table.status !== "free") throw new Error("Table is not free");

    const orderNum = Math.floor(100 + Math.random() * 900);
    const orderId = `ORD-${orderNum}`;

    const newOrder = {
      order_id: orderId,
      table_id: table.table_id,
      table_no: table.t_no,
      section: table.section,
      guest_count: Number(guestCount),
      waiter: waiterName,
      status: "open",
      version: 1,
      created_at: new Date().toISOString(),
      items: [],
      subtotal: 0,
      discount_code: null,
      discount_amount: 0,
      final_total: 0,
      notes: notes || "",
      history: [
        {
          action: "Order opened",
          staff: waiterName,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Update table status to occupied
    table.status = "occupied";
    table.guest_count = Number(guestCount);
    table.waiter = waiterName;
    table.order_id = orderId;
    table.last_activity = "Just now";

    this.state.orders.unshift(newOrder);
    this.saveState();

    return newOrder;
  }

  addDraftItem(orderId, menuItem) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const existingItem = order.items.find(
      (i) => i.item_id === menuItem.item_id && i.status === "draft"
    );

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.total_price = existingItem.quantity * existingItem.unit_price;
    } else {
      order.items.push({
        item_id: menuItem.item_id,
        name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
        total_price: menuItem.price,
        status: "draft",
      });
    }

    this.recalculateOrder(order);
    order.history.unshift({
      action: `Added draft item: ${menuItem.name}`,
      staff: order.waiter || "Waiter",
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return order;
  }

  updateItemQuantity(orderId, itemId, delta) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.find((i) => i.item_id === itemId && i.status === "draft");
    if (!item) return order;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      order.items = order.items.filter((i) => i !== item);
      order.history.unshift({
        action: `Removed item: ${item.name}`,
        staff: order.waiter || "Waiter",
        timestamp: new Date().toISOString(),
      });
    } else {
      item.quantity = newQty;
      item.total_price = item.quantity * item.unit_price;
      order.history.unshift({
        action: `Updated ${item.name} quantity to ${newQty}`,
        staff: order.waiter || "Waiter",
        timestamp: new Date().toISOString(),
      });
    }

    this.recalculateOrder(order);
    this.saveState();
    return order;
  }

  removeOrderItem(orderId, itemId) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.find((i) => i.item_id === itemId && i.status === "draft");
    if (item) {
      order.items = order.items.filter((i) => i !== item);
      order.history.unshift({
        action: `Removed draft item: ${item.name}`,
        staff: order.waiter || "Waiter",
        timestamp: new Date().toISOString(),
      });
      this.recalculateOrder(order);
      this.saveState();
    }
    return order;
  }

  sendToKitchen(orderId) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const draftItems = order.items.filter((i) => i.status === "draft");
    if (draftItems.length === 0) {
      throw new Error("No draft items to send.");
    }

    draftItems.forEach((item) => {
      item.status = "sent";
    });

    order.status = "in_kitchen";
    order.version += 1;
    order.history.unshift({
      action: `Sent ${draftItems.length} item(s) to Kitchen (v${order.version})`,
      staff: order.waiter || "Waiter",
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return order;
  }

  requestBill(orderId) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const unservedItems = order.items.filter(
      (i) => i.status !== "served" && i.status !== "cancelled"
    );
    if (unservedItems.length > 0) {
      throw new Error("Cannot request bill until all items are served.");
    }

    order.status = "bill_requested";
    order.history.unshift({
      action: "Bill Requested - Order sent to Cashier for settlement",
      staff: order.waiter || "Waiter",
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return order;
  }

  applyDiscount(orderId, code) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const cleanCode = (code || "").trim().toUpperCase();
    if (cleanCode === "STAFF10") {
      order.discount_code = "STAFF10";
      order.discount_amount = Math.round(order.subtotal * 0.1);
    } else if (cleanCode === "WELCOME5") {
      order.discount_code = "WELCOME5";
      order.discount_amount = 5;
    } else {
      throw new Error("Invalid promotion code. Valid codes are STAFF10 or WELCOME5.");
    }

    this.recalculateOrder(order);
    order.history.unshift({
      action: `Applied promo code ${order.discount_code} (-₹${order.discount_amount})`,
      staff: order.waiter || "Waiter",
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return order;
  }

  removeDiscount(orderId) {
    const order = this.state.orders.find((o) => o.order_id === orderId);
    if (!order) throw new Error("Order not found");

    const prevCode = order.discount_code;
    order.discount_code = null;
    order.discount_amount = 0;
    this.recalculateOrder(order);

    order.history.unshift({
      action: `Removed discount ${prevCode}`,
      staff: order.waiter || "Waiter",
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return order;
  }

  recalculateOrder(order) {
    order.subtotal = order.items.reduce((sum, item) => sum + item.total_price, 0);

    if (order.discount_code === "STAFF10") {
      order.discount_amount = Math.round(order.subtotal * 0.1);
    } else if (order.discount_code === "WELCOME5") {
      order.discount_amount = 5;
    } else {
      order.discount_amount = 0;
    }

    order.final_total = Math.max(0, order.subtotal - order.discount_amount);
  }

  getMenuItems() {
    return this.state.menu;
  }

  resetStore() {
    this.state = {
      tables: INITIAL_TABLES,
      orders: INITIAL_ORDERS,
      menu: INITIAL_MENU,
    };
    this.saveState();
  }
}

export const waiterStore = new WaiterStore();
export default waiterStore;
