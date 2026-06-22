# Bloo & Brew Café — POS System (with database)

A **working** café point-of-sale and kitchen management system: select
items, compute totals, check out, pay with cash, send the order to the
kitchen, and watch inventory deduct automatically — all backed by a
real database (IndexedDB) that persists across page reloads.

This is still **HTML / CSS / JavaScript only** — no framework, no
build step, no external server. The "database" is the browser's
built-in IndexedDB, so the system works fully offline and can be
opened directly in a browser or hosted with GitHub Pages.

## Files

| File         | Purpose                                                              |
|--------------|---------------------------------------------------------------------|
| `index.html` | Markup for the sidebar, all 5 pages, and the cash payment modal      |
| `style.css`  | All visual styling, organized by component/page                      |
| `db.js`      | The database layer: schema, seed data, and all read/write operations  |
| `script.js`  | UI logic: navigation, cart, checkout, and rendering each page from the database |

## What's actually working

- **Select** — click menu items to add them to the current order; quantity steppers (+/−) adjust amounts live.
- **Compute** — subtotal, 8.25% tax, and total recalculate on every change.
- **Checkout** — opens a Cash Payment modal showing the amount due.
- **Payment (Cash)** — enter a tendered amount (or tap a quick-cash suggestion); change is computed live, and payment is blocked if the tendered amount is short.
- **Send to Kitchen** — confirming payment writes a real order record to the database with status `sent_to_kitchen`, then opens its Order Details page.
- **Inventory status** — confirming payment also deducts every ingredient used by the ordered items from the inventory table, in the same transaction.
- **Manager Approval** — if any ingredient's stock drops below its threshold, a Low Stock or Out of Stock alert is created automatically; approving a restock writes new stock levels back to inventory and clears the alert.
- **Kitchen Queue** — reads live orders from the database; **Start**, **Mark Ready**, and **Serve** buttons move an order through `sent_to_kitchen → preparing → ready → completed`, and the queue updates immediately.
- **Persistence** — all of the above survives a page reload, because it's stored in IndexedDB rather than in-memory variables.

## The database (`db.js`)

Four tables (IndexedDB object stores):

| Table        | Key         | Holds                                                          |
|--------------|-------------|------------------------------------------------------------------|
| `menuItems`  | `id`        | Menu item name, price, category, and the ingredients it consumes  |
| `inventory`  | `name`      | Stock level, unit, category, and low-stock threshold per ingredient |
| `orders`     | `id`        | Items, totals, payment info, status, and timestamps for each order |
| `approvals`  | `id`        | Low-stock / out-of-stock alerts and their approval status           |

On first run, `db.js` seeds the menu and starting inventory automatically
(see `SEED_MENU` and `SEED_INVENTORY`). After that, all reads and writes
go through simple helper functions (`DB.getAll`, `DB.get`, `DB.put`,
`DB.delete`) so the rest of the code never touches IndexedDB directly.

The actual workflow rules live in a few named functions:

- `deductInventoryForOrder()` — Step 4 + decision: subtracts ingredient
  usage for an order and raises an alert for anything that drops below
  threshold.
- `createOrder()` — Steps 1–3: assigns the next order number and saves
  the order as sent to the kitchen.
- `updateOrderStatus()` — used by the Kitchen Queue's Start/Mark Ready/Serve buttons.
- `approveRestock()` — Step 5: marks an alert approved and replenishes
  that ingredient's stock.

## Resetting the data

There's no UI button for this yet — to start over with fresh seed data,
open the browser console on the page and run:

```js
resetDatabase()
```

or simply clear the site's storage from your browser's dev tools
(Application → IndexedDB → delete `bloo_brew_pos`).

## How it maps to the BPR report

This system implements the 5-step automated workflow from the Bloo and
Brew Café Business Process Reengineering report, for real:

1. The system receives the customer's order at the point of sale.
2. The system computes the order total and itemized details.
3. The order is automatically moved to the kitchen display for preparation.
4. Upon completion, the system automatically deducts the corresponding
   stock or inventory ingredients used in the order.
5. If the deduction causes any ingredient to run low, the manager is
   notified and approves the resulting replenishment request.

## Running it

Open `index.html` in a browser, or enable **GitHub Pages** on this repo
for a live shareable link. No setup, no server, no installation step —
IndexedDB is built into every modern browser.

## Known limitations

- Payment methods other than Cash are not wired up (the modal is Cash-only by design, per the request that started this build).
- There's no login/auth — "Jobelene Nery, Cashier" is a static label in the sidebar.
- Dashboard, Reports, Customers, and Settings are placeholder pages outside this system's current scope.
- Data is local to whichever browser/profile opens the page — it is not synced to a server or shared between devices.
