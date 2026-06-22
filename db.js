/* ===========================================================================
   BLOOM & BREW CAFÉ — DATABASE LAYER (IndexedDB)
   =========================================================================== */

const DB_NAME = "bloo_brew_pos";
const DB_VERSION = 4;
const DB_VERSION_KEY = "bloo_brew_db_version";
let dbInstance = null;

// Auto-clear stale database when version changes
(function autoReset() {
  const stored = localStorage.getItem(DB_VERSION_KEY);
  if (stored && parseInt(stored, 10) !== DB_VERSION) {
    indexedDB.deleteDatabase(DB_NAME);
  }
  localStorage.setItem(DB_VERSION_KEY, DB_VERSION);
})();

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const name of db.objectStoreNames) {
        db.deleteObjectStore(name);
      }
      db.createObjectStore("menuItems", { keyPath: "id" });
      db.createObjectStore("inventory", { keyPath: "name" });
      const orderStore = db.createObjectStore("orders", { keyPath: "id" });
      orderStore.createIndex("status", "status", { unique: false });
      db.createObjectStore("approvals", { keyPath: "id" });
      db.createObjectStore("meta", { keyPath: "key" });
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
// Seed data
// ---------------------------------------------------------------------------
const SEED_MENU = [
  { id: "m1", name: "Americano", price: 45, cat: "Coffee", image: "images/americano.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }] },
  { id: "m2", name: "Cafe Latte", price: 55, cat: "Coffee", image: "images/cafe-latte.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }] },
  { id: "m3", name: "Vanilla Latte", price: 59, cat: "Coffee", image: "images/vanilla-latte.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Vanilla Syrup", use: 0.03 }] },
  { id: "m4", name: "Hazelnut Latte", price: 59, cat: "Coffee", image: "images/hazelnut-latte.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Hazelnut Syrup", use: 0.03 }] },
  { id: "m5", name: "Spanish Latte", price: 59, cat: "Coffee", image: "images/spanish-latte.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.12 }, { name: "Condensed Milk", use: 0.03 }] },
  { id: "m6", name: "Caramel Macchiato", price: 59, cat: "Coffee", image: "images/caramel-macchiato.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Caramel Sauce", use: 0.03 }] },
  { id: "m7", name: "Salted Caramel", price: 59, cat: "Coffee", image: "images/salted-caramel.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Caramel Sauce", use: 0.03 }] },
  { id: "m8", name: "White Mocha", price: 59, cat: "Coffee", image: "images/white-mocha.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "White Choco Sauce", use: 0.03 }] },
  { id: "m9", name: "Cafe Mocha", price: 59, cat: "Coffee", image: "images/cafe-mocha.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Choco Sauce", use: 0.03 }] },
  { id: "m10", name: "Coffee Matcha", price: 59, cat: "Coffee", image: "images/coffee-matcha.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Matcha Powder", use: 0.05 }, { name: "Whole Milk", use: 0.12 }] },
  { id: "m11", name: "Hazelnut Mocha", price: 59, cat: "Coffee", image: "images/hazelnut-mocha.jpg", ingredients: [{ name: "Espresso Beans", use: 0.04 }, { name: "Whole Milk", use: 0.15 }, { name: "Hazelnut Syrup", use: 0.02 }, { name: "Choco Sauce", use: 0.02 }] },
  { id: "m12", name: "Berry Lemonade", price: 55, cat: "Ice Shaken", image: "images/berry-lemonade.jpg", ingredients: [{ name: "Berry Mix", use: 0.05 }, { name: "Lemon Juice", use: 0.03 }] },
  { id: "m13", name: "Honey Calamansi", price: 55, cat: "Ice Shaken", image: "images/honey-calamansi.jpg", ingredients: [{ name: "Honey", use: 0.03 }, { name: "Calamansi Juice", use: 0.05 }] },
  { id: "m14", name: "Mango Hibiscus", price: 55, cat: "Ice Shaken", image: "images/mango-hibiscus.jpg", ingredients: [{ name: "Mango Puree", use: 0.05 }, { name: "Hibiscus Tea", use: 0.1 }] },
  { id: "m15", name: "Strawberry Hibiscus", price: 55, cat: "Ice Shaken", image: "images/strawberry-hibiscus.jpg", ingredients: [{ name: "Strawberry Puree", use: 0.05 }, { name: "Hibiscus Tea", use: 0.1 }] },
  { id: "m16", name: "Ube Latte", price: 59, cat: "Non-Coffee", image: "images/ube-latte.jpg", ingredients: [{ name: "Ube Powder", use: 0.04 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m17", name: "Matcha Latte", price: 59, cat: "Non-Coffee", image: "images/matcha-latte.jpg", ingredients: [{ name: "Matcha Powder", use: 0.05 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m18", name: "Dark Choco", price: 59, cat: "Non-Coffee", image: "images/dark-choco.jpg", ingredients: [{ name: "Choco Sauce", use: 0.05 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m19", name: "Oreo Milk", price: 59, cat: "Non-Coffee", image: "images/oreo-milk.jpg", ingredients: [{ name: "Oreo Crumbs", use: 0.04 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m20", name: "Strawberry Milk", price: 59, cat: "Non-Coffee", image: "images/strawberry-milk.jpg", ingredients: [{ name: "Strawberry Puree", use: 0.04 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m21", name: "Blueberry Milk", price: 59, cat: "Non-Coffee", image: "images/blueberry-milk.jpg", ingredients: [{ name: "Berry Mix", use: 0.04 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m22", name: "Mango Milk", price: 59, cat: "Non-Coffee", image: "images/mango-milk.jpg", ingredients: [{ name: "Mango Puree", use: 0.04 }, { name: "Whole Milk", use: 0.2 }] },
  { id: "m23", name: "2 pcs. Hashbrown", price: 55, cat: "Snacks", image: "images/hashbrown.jpg", ingredients: [{ name: "Hashbrown Patties", use: 2 }] },
  { id: "m24", name: "6 pcs. Chicken Nuggets", price: 59, cat: "Snacks", image: "images/chicken-nuggets.jpg", ingredients: [{ name: "Chicken Nuggets", use: 6 }] },
  { id: "m25", name: "Cheesy Beef Nachos", price: 65, cat: "Snacks", image: "images/cheesy-beef-nachos.jpg", ingredients: [{ name: "Nacho Chips", use: 1 }, { name: "Beef Topping", use: 0.08 }] },
  { id: "m26", name: "Crinkled Cut Fries", price: 65, cat: "Snacks", image: "images/crinkled-cut-fries.jpg", ingredients: [{ name: "Fries", use: 0.15 }] },
  { id: "m27", name: "Churro Bites", price: 65, cat: "Snacks", image: "images/churro-bites.jpg", ingredients: [{ name: "Churro Dough", use: 0.12 }] },
];

const SEED_INVENTORY = [
  { name: "Espresso Beans", category: "Coffee", stock: 3.0, unit: "kg", lowThreshold: 1.0 },
  { name: "Whole Milk", category: "Dairy", stock: 8.0, unit: "L", lowThreshold: 3.0 },
  { name: "Vanilla Syrup", category: "Syrup", stock: 1.5, unit: "L", lowThreshold: 0.5 },
  { name: "Hazelnut Syrup", category: "Syrup", stock: 1.2, unit: "L", lowThreshold: 0.5 },
  { name: "Caramel Sauce", category: "Sauce", stock: 1.0, unit: "L", lowThreshold: 0.4 },
  { name: "Choco Sauce", category: "Sauce", stock: 1.0, unit: "L", lowThreshold: 0.4 },
  { name: "White Choco Sauce", category: "Sauce", stock: 0.8, unit: "L", lowThreshold: 0.4 },
  { name: "Condensed Milk", category: "Dairy", stock: 2.0, unit: "L", lowThreshold: 0.8 },
  { name: "Matcha Powder", category: "Powder", stock: 0.5, unit: "kg", lowThreshold: 0.2 },
  { name: "Ube Powder", category: "Powder", stock: 0.4, unit: "kg", lowThreshold: 0.15 },
  { name: "Oreo Crumbs", category: "Topping", stock: 0.6, unit: "kg", lowThreshold: 0.2 },
  { name: "Berry Mix", category: "Fruit", stock: 1.0, unit: "kg", lowThreshold: 0.3 },
  { name: "Strawberry Puree", category: "Fruit", stock: 0.8, unit: "kg", lowThreshold: 0.3 },
  { name: "Mango Puree", category: "Fruit", stock: 0.8, unit: "kg", lowThreshold: 0.3 },
  { name: "Lemon Juice", category: "Fruit", stock: 1.0, unit: "L", lowThreshold: 0.3 },
  { name: "Calamansi Juice", category: "Fruit", stock: 0.8, unit: "L", lowThreshold: 0.3 },
  { name: "Honey", category: "Sweetener", stock: 0.6, unit: "L", lowThreshold: 0.2 },
  { name: "Hibiscus Tea", category: "Tea", stock: 2.0, unit: "L", lowThreshold: 0.5 },
  { name: "Hashbrown Patties", category: "Frozen", stock: 30, unit: "pcs", lowThreshold: 10 },
  { name: "Chicken Nuggets", category: "Frozen", stock: 50, unit: "pcs", lowThreshold: 18 },
  { name: "Nacho Chips", category: "Snack", stock: 15, unit: "packs", lowThreshold: 5 },
  { name: "Beef Topping", category: "Meat", stock: 1.5, unit: "kg", lowThreshold: 0.5 },
  { name: "Fries", category: "Frozen", stock: 3.0, unit: "kg", lowThreshold: 1.0 },
  { name: "Churro Dough", category: "Frozen", stock: 2.0, unit: "kg", lowThreshold: 0.8 },
];

const DEFAULT_TAX_RATE = 0.0825;

async function seedIfEmpty() {
  const metaRow = await DB.get("meta", "seeded");
  if (metaRow && metaRow.value) return;

  await DB.putAll("menuItems", SEED_MENU);
  await DB.putAll("inventory", SEED_INVENTORY);
  await DB.put("meta", { key: "seeded", value: true });
  await DB.put("meta", { key: "orderCounter", value: 10023 });
  await DB.put("meta", { key: "taxRate", value: DEFAULT_TAX_RATE });
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

async function resetStockOnly() {
  await DB.clear("inventory");
  await DB.clear("approvals");
  await DB.putAll("inventory", SEED_INVENTORY);
}

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

async function createOrder({ items, subtotal, tax, total, payment, tableLabel }) {
  const id = await nextOrderId();
  const order = {
    id,
    items,
    subtotal, tax, total,
    payment,
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

  const row = await DB.get("inventory", alert.ingredient);
  if (row) {
    row.stock = +(row.lowThreshold * 2.5).toFixed(2);
    await DB.put("inventory", row);
  }
}
