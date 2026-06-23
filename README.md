# Bloom and Brew Cafe — POS System

A fully functional cafe point-of-sale and restaurant management system built with **HTML, CSS, and JavaScript only** — no framework, no build step, no external server. Uses the browser's built-in IndexedDB for persistent data storage that survives page reloads.

Live demo via GitHub Pages or open `index.html` directly in any modern browser.

---

## Files

| File         | Purpose |
|--------------|---------|
| `index.html` | Complete UI markup — landing page, sidebar, all 6 modules, and all modals |
| `style.css`  | All styling — responsive design, sidebar, cards, modals, gradients |
| `db.js`      | Database layer — schema, seed data, CRUD helpers, and business logic |
| `script.js`  | Application logic — navigation, cart, checkout, rendering, and all feature handlers |
| `images/`    | Product photos, logo, and favicon |

---

## System Workflow

The POS implements a complete order-to-kitchen-to-inventory workflow:

1. **Order Entry** — Cashier selects menu items, chooses Iced/Hot for coffee, builds the cart
2. **Checkout** — System computes subtotal, configurable tax, and total; cashier enters cash tendered
3. **Send to Kitchen** — Confirmed order is saved to the database and appears in Kitchen Queue
4. **Inventory Deduction** — Ingredients used in the order are automatically deducted from stock
5. **Low Stock Alerts** — If any ingredient drops below threshold, a Manager Approval alert is created
6. **Restock Approval** — Manager approves the restock, which replenishes inventory levels

---

## Modules

### 1. Landing Page
- Branded starter screen with cafe logo and tagline
- "Enter POS System" button transitions to the main interface
- Warm gradient background (yellow glow + orange glow)
- Session persistence — refreshing stays in the POS if already entered
- Exit via cashier name modal returns to the landing page

### 2. Orders (New Order)
- **Menu Grid** — 4-column grid with product photos, names, and prices
- **Category Filters** — All, Coffee, Ice Shaken, Non-Coffee, Snacks
- **Search** — Real-time text search across all menu items
- **Pagination** — 12 items per page (4×3 grid) with page navigation
- **Iced/Hot Picker** — Coffee items show a modal to choose Iced (+₱5) or Hot
- **Cart** — Live updating cart with quantity steppers (+/−), subtotal, tax, and total
- **Hold Order** — Save current cart for later; badge shows count of held orders
- **Order History** — Modal with two tabs:
  - *Completed Orders* — All past orders with details; click to view
  - *Held Orders* — Resume or discard saved carts
- **Checkout** — Cash payment modal with quick-cash suggestions and live change calculation
- **Clear Cart** — Remove all items from the current order

### 3. Order Details
- Full order summary — order ID, table, cashier, date/time, customer
- Itemized list with quantities, unit prices, and amounts
- Payment status — cash tendered, change given
- Order status timeline — tracks progress through all stages
- **Print Receipt** — Opens a formatted receipt in a new window and triggers print
- **Move Status** — Advance order to the next workflow step (Sent → Preparing → Ready → Completed)
- **Cancel Order** — Remove incomplete orders permanently

### 4. Kitchen Queue
- Displays all active (non-completed) orders as cards
- Color-coded: yellow border for new orders, green for ready
- **Filter Pills** — All, New, Preparing, Ready with live counts
- **Sort** — Newest First or Oldest First dropdown
- **Refresh** — Manual refresh button
- **Action Buttons** — Start, Mark Ready, Serve to advance each order
- **Notification Badge** — Sidebar shows count of new kitchen orders; clears on visit
- Click any order card to view its full details

### 5. Inventory
- Table view of all ingredients with name, category, stock, unit, and status
- **Status Indicators** — In Stock (green), Low Stock (yellow), Out of Stock (red)
- **Filter Pills** — All Items, Low Stock, Out of Stock
- **Add Item** — Modal form to add new inventory items with name, category, stock, unit, and threshold
- **Notification Badge** — Sidebar shows count of low/out-of-stock items; clears on visit
- Stock levels update automatically when orders are placed

### 6. Manager Approval
- Lists all low-stock and out-of-stock alerts
- **Filter Tabs** — Approval Needed, Approved
- **Approve Restock** — One-click approval that replenishes inventory to 2.5× the threshold level
- **Refresh** — Reloads alerts and updates all sidebar badges
- **Badge Count** — Shows number of pending approvals in sidebar and page header

### 7. Dashboard
- **Stats Cards** — Total Orders, Total Revenue, Pending in Kitchen, Low Stock Items
- **Menu Items Grid** — All products with photos, names, categories, and prices
- **Order Button** — Quick-add item to cart and navigate to Orders page
- **Pagination** — 12 items per page with navigation

### 8. Settings
- **Tax Rate** — Configurable tax percentage; updates all calculations and labels instantly
- **Menu Prices** — Edit prices for all menu items; saves to database
- **Reset Stock** — Restore all inventory to default levels; keeps orders and prices
- **Reset All Data** — Factory reset; clears everything and reseeds from defaults

---

## Database Schema

Four IndexedDB object stores:

| Store        | Key    | Contents |
|--------------|--------|----------|
| `menuItems`  | `id`   | Name, price, category, image path, and ingredient usage per item |
| `inventory`  | `name` | Stock level, unit, category, and low-stock threshold per ingredient |
| `orders`     | `id`   | Items, totals, payment info, status, timestamps for each order |
| `approvals`  | `id`   | Low-stock/out-of-stock alerts and their approval status |
| `meta`       | `key`  | System settings — order counter, tax rate, seeded flag, DB version |

### Key Database Functions
- `seedIfEmpty()` — Seeds menu, inventory, tax rate, and order counter on first run
- `createOrder()` — Assigns order ID, saves order with `sent_to_kitchen` status
- `updateOrderStatus()` — Moves order through the workflow stages
- `deductInventoryForOrder()` — Subtracts ingredient usage; creates alerts if below threshold
- `approveRestock()` — Marks alert approved; replenishes ingredient stock
- `resetStockOnly()` — Resets inventory without affecting orders or settings
- `resetDatabase()` — Full factory reset

### Auto-Reset
The database auto-clears stale data when the `DB_VERSION` is bumped. No manual console commands needed — the `localStorage`-based version check handles it automatically on page load.

---

## Sidebar Navigation

- **Logo** — Cafe branding at the top
- **Nav Items** — Dashboard, Orders, Kitchen, Inventory, Manager Approval, Settings
- **SVG Icons** — Custom icons for each module (grid, list, food, cup, edit, gear)
- **Active State** — Dark navy background with white text and icon
- **Inactive State** — Blue text with blue border on hover
- **Notification Badges** — Red badges on Kitchen, Inventory, and Manager Approval
- **Cashier Profile** — Click to open exit modal with "Exit to Home" button
- **Sticky Position** — Sidebar stays fixed while content scrolls
- **Responsive** — Collapses to icon-only slide-out menu on mobile

---

## Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Full sidebar with text labels, 4-column grids |
| Tablet (≤1024px) | Narrower sidebar, 3-column grids |
| Mobile (≤768px) | Top bar with hamburger + centered logo; sidebar as 60px icon-only slide-out overlay |
| Phone (≤480px) | 2-column grids, stacked layouts, compact headers |

---

## Menu Categories

| Category | Items | Price Range |
|----------|-------|-------------|
| Coffee | 11 drinks (Americano, Cafe Latte, Vanilla Latte, etc.) | ₱45–₱59 |
| Ice Shaken | 4 drinks (Chocolate, Toffee Nut, Black Tea, Hibiscus Tea) | ₱55–₱59 |
| Non-Coffee | 7 drinks (Matcha Latte, Tangerine Tea, Iced Chocolate, etc.) | ₱25–₱35 |
| Snacks | 11 items (Ube Crinkles, Avocado Toast, Pasta Carbonara, etc.) | ₱39–₱129 |

**Total: 33 menu items**

---

## Held Orders

Held orders are stored in `localStorage` (not IndexedDB) so they persist across page refreshes but are specific to the device/browser. Access via the "Order History" button on the Orders page.

---

## Session Persistence

The app remembers your current module using `localStorage`:
- `posActive` — Whether the POS is entered (skips landing page on refresh)
- `currentPage` — Which module was last active (restores on refresh)
- Clicking "Exit to Home" clears both, returning to the landing page

---

## Running the System

1. Open `index.html` in any modern browser, OR
2. Enable **GitHub Pages** on the repo (Settings → Pages → Branch: `main` / Folder: `/ (root)`)

No setup, no server, no installation — IndexedDB and localStorage are built into every modern browser.

---

## Resetting Data

**From Settings page:**
- "Reset Stock" — Restores inventory to defaults; keeps orders and prices
- "Reset All" — Full factory reset to original state

**Automatic:**
- Database auto-resets when `DB_VERSION` is bumped in `db.js`

---

## Known Limitations

- Cash is the only payment method (by design for this POS scope)
- No login/authentication — cashier name is configurable but static
- Data is local to the browser — not synced between devices
- Held orders use localStorage, not IndexedDB
