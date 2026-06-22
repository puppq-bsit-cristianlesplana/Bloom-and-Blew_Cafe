/* ===========================================================================
   BLOO & BREW CAFÉ — SIMPLE DATABASE LAYER (IndexedDB)
   ===========================================================================
   This file is the entire persistence layer for the POS system. It uses
   the browser's built-in IndexedDB so the system works with no server,
   no build step, and no external dependencies — while still being a real
   database that survives page reloads (unlike plain in-memory state).

   Object stores (tables):
     menuItems   { id, name, price, cat, emoji, ingredients: [{ name, use }] }
     inventory   { name (key), category, stock, unit, lowThreshold }
     orders      { id (key), items, status, subtotal, tax, total,
                   payment, createdAt, table, tags }
     approvals   { id (key), type, ingredient, time, status }

   Status values for `orders.status`:
     "sent_to_kitchen" -> "preparing" -> "ready" -> "completed"
   (Cash payment is captured at checkout, before the order is sent.)

   All functions return Promises so calling code can use async/await.
   =========================================================================== */

const DB_NAME = "bloo_brew_pos";
const DB_VERSION = 1;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("menuItems")) {
        db.createObjectStore("menuItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("inventory")) {
        db.createObjectStore("inventory", { keyPath: "name" });
      }
      if (!db.objectStoreNames.contains("orders")) {
        const orderStore = db.createObjectStore("orders", { keyPath: "id" });
        orderStore.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("approvals")) {
        db.createObjectStore("approvals", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    req.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = "readonly") {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Generic CRUD helpers -------------------------------------------------
const DB = {
  async getAll(store) {
    const s = await tx(store);
    return promisify(s.getAll());
  },
  async get(store, key) {
    const s = await tx(store);
    return promisify(s.get(key));
  },
  async put(store, value) {
    const s = await tx(store, "readwrite");
    return promisify(s.put(value));
  },
  async putAll(store, values) {
    const s = await tx(store, "readwrite");
    values.forEach((v) => s.put(v));
    return new Promise((resolve) => {
      s.transaction.oncomplete = () => resolve();
    });
  },
  async delete(store, key) {
    const s = await tx(store, "readwrite");
    return promisify(s.delete(key));
  },
  async clear(store) {
    const s = await tx(store, "readwrite");
    return promisify(s.clear());
  },
};

// ---------------------------------------------------------------------------
// Seed data — menu items (with the ingredients each one consumes) and
// starting inventory levels. Seeded once, on first run only.
// ---------------------------------------------------------------------------
const SEED_MENU = [
  { id: "m1", name: "Iced Latte", price: 120, cat: "Coffee", emoji: "🧊", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }] },
  { id: "m2", name: "Cappuccino", price: 115, cat: "Coffee", emoji: "☕", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.1 }] },
  { id: "m3", name: "Americano", price: 95, cat: "Coffee", emoji: "☕", ingredients: [{ name: "Espresso Beans", use: 0.04 }] },
  { id: "m4", name: "Caramel Macchiato", price: 135, cat: "Coffee", emoji: "☕", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }] },
  { id: "m5", name: "Croissant", price: 85, cat: "Pastries", emoji: "🥐", ingredients: [{ name: "Croissant Dough", use: 0.12 }] },
  { id: "m6", name: "Blueberry Muffin", price: 80, cat: "Pastries", emoji: "🧁", ingredients: [{ name: "Flour", use: 0.1 }] },
  { id: "m7", name: "Cinnamon Roll", price: 90, cat: "Pastries", emoji: "🥨", ingredients: [{ name: "Flour", use: 0.12 }] },
  { id: "m8", name: "Chicken Sandwich", price: 150, cat: "Sandwiches", emoji: "🥪", ingredients: [{ name: "Chicken Breast", use: 0.18 }, { name: "Lettuce", use: 1 }] },
  { id: "m9", name: "Ham & Cheese Panini", price: 145, cat: "Sandwiches", emoji: "🥪", ingredients: [{ name: "Flour", use: 0.08 }] },
  { id: "m10", name: "Iced Tea", price: 70, cat: "Cold Drinks", emoji: "🧊", ingredients: [] },
  { id: "m11", name: "Lemonade", price: 75, cat: "Cold Drinks", emoji: "🍋", ingredients: [] },
  { id: "m12", name: "Chocolate Cake", price: 135, cat: "Desserts", emoji: "🍫", ingredients: [{ name: "Cream Cheese", use: 0.1 }] },
  { id: "m13", name: "Cheesecake", price: 140, cat: "Desserts", emoji: "🍰", ingredients: [{ name: "Cream Cheese", use: 0.15 }] },
];

const SEED_INVENTORY = [
  { name: "Espresso Beans", category: "Pantry", stock: 2.2, unit: "kg", lowThreshold: 1.0 },
  { name: "Whole Milk", category: "Dairy", stock: 1.5, unit: "L", lowThreshold: 1.0 },
  { name: "Croissant Dough", category: "Pastry", stock: 0.8, unit: "kg", lowThreshold: 1.0 },
  { name: "Flour", category: "Pantry", stock: 10.0, unit: "kg", lowThreshold: 2.0 },
  { name: "Chicken Breast", category: "Meat", stock: 5.2, unit: "kg", lowThreshold: 1.5 },
  { name: "Lettuce", category: "Produce", stock: 3.0, unit: "pcs", lowThreshold: 2.0 },
  { name: "Cream Cheese", category: "Dairy", stock: 0.0, unit: "kg", lowThreshold: 0.5 },
];

async function seedIfEmpty() {
  const metaRow = await DB.get("meta", "seeded");
  if (metaRow && metaRow.value) return;

  await DB.putAll("menuItems", SEED_MENU);
  await DB.putAll("inventory", SEED_INVENTORY);
  await DB.put("meta", { key: "seeded", value: true });
  await DB.put("meta", { key: "orderCounter", value: 10023 });
}

async function nextOrderId() {
  const row = await DB.get("meta", "orderCounter");
  const next = (row ? row.value : 10023) + 1;
  await DB.put("meta", { key: "orderCounter", value: next });
  return "ORD-" + next;
}

async function resetDatabase() {
  await DB.clear("menuItems");
  await DB.clear("inventory");
  await DB.clear("orders");
  await DB.clear("approvals");
  await DB.clear("meta");
  await seedIfEmpty();
}

// ---------------------------------------------------------------------------
// Domain operations — these encode the actual workflow rules (the same
// 5-step automated workflow described in the BPR report) on top of the
// generic CRUD helpers above.
// ---------------------------------------------------------------------------

/** Step 4 + decision: deduct ingredients for a list of order lines, and
 *  create approval records for any ingredient that drops below threshold.
 *  Returns the list of ingredient names that triggered a low-stock alert. */
async function deductInventoryForOrder(orderLines, menuById) {
  const inventory = await DB.getAll("inventory");
  const invByName = Object.fromEntries(inventory.map((i) => [i.name, i]));
  const lowNow = [];

  for (const line of orderLines) {
    const menuItem = menuById[line.id];
    if (!menuItem) continue;
    for (const ing of menuItem.ingredients) {
      const row = invByName[ing.name];
      if (!row) continue;
      row.stock = Math.max(0, +(row.stock - ing.use * line.qty).toFixed(3));
      if (row.stock < row.lowThreshold && !lowNow.includes(ing.name)) {
        lowNow.push(ing.name);
      }
    }
  }

  await DB.putAll("inventory", Object.values(invByName));

  for (const ingName of lowNow) {
    const row = invByName[ingName];
    const id = "alert-" + ingName.replace(/\s+/g, "_").toLowerCase();
    await DB.put("approvals", {
      id,
      type: row.stock <= 0 ? "out" : "low",
      ingredient: ingName,
      stock: row.stock,
      unit: row.unit,
      time: new Date().toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
      status: "needed",
    });
  }

  return lowNow;
}

/** Steps 1-3: create a new order record and persist it as sent to the
 *  kitchen. Called right after a successful cash payment at checkout. */
async function createOrder({ items, subtotal, tax, total, payment, tableLabel }) {
  const id = await nextOrderId();
  const order = {
    id,
    items, // [{ id, name, price, qty }]
    subtotal, tax, total,
    payment, // { method, tendered, change }
    table: tableLabel || "Walk-in",
    status: "sent_to_kitchen",
    createdAt: new Date().toISOString(),
    timeLabel: new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }),
  };
  await DB.put("orders", order);
  return order;
}

async function updateOrderStatus(orderId, status) {
  const order = await DB.get("orders", orderId);
  if (!order) return null;
  order.status = status;
  await DB.put("orders", order);
  return order;
}

async function approveRestock(alertId) {
  const alert = await DB.get("approvals", alertId);
  if (!alert) return;
  alert.status = "approved";
  alert.approvedAt = new Date().toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  await DB.put("approvals", alert);

  // Restocking actually replenishes inventory back above threshold,
  // closing the loop described in the BPR report's Step 5.
  const row = await DB.get("inventory", alert.ingredient);
  if (row) {
    row.stock = +(row.lowThreshold * 2.5).toFixed(2);
    await DB.put("inventory", row);
  }
}
