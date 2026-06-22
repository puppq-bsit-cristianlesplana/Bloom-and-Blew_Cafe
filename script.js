/* ===========================================================================
   BLOO & BREW CAFÉ — POS SCRIPT (DATABASE-BACKED)
   ===========================================================================
   This version reads and writes real data via db.js (IndexedDB) instead of
   in-memory arrays. The full working flow:

     1. New Order   -> click menu items to build a cart (in-memory until
                        checkout; this matches how a real POS holds the
                        current ticket before it's committed)
     2. Checkout    -> opens the Cash Payment modal, computes change live
     3. Confirm     -> validates payment, creates the order in IndexedDB
                        with status "sent_to_kitchen", deducts ingredient
                        stock for every item ordered, and creates Manager
                        Approval alerts for anything that drops low
     4. Kitchen     -> reads orders from IndexedDB; Start/Serve buttons
                        update each order's status in the database
     5. Inventory   -> reads live stock levels from IndexedDB
     6. Manager Approval -> reads live alerts from IndexedDB; Approve
                        Restock writes the restock back into inventory

   Every page re-reads from the database each time it's shown, so all
   five views always reflect the same underlying data.
   =========================================================================== */

let MENU = [];
let menuById = {};
let activeCat = "All";
let searchTerm = "";
const cart = [];
const ITEMS_PER_PAGE = 12;
let menuPage = 1;
let dashPage = 1;

// --- 0. Boot: open DB, seed if empty, load menu, render first page -------
(async function boot() {
  await seedIfEmpty();
  MENU = await DB.getAll("menuItems");
  menuById = Object.fromEntries(MENU.map((m) => [m.id, m]));
  renderMenu();
  renderCart();
  await refreshApprovalBadge();
})();

// --- 1. Sidebar navigation ------------------------------------------------
const navButtons = document.querySelectorAll(".nav-item, .back-link");
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("visible"));
  const target = document.getElementById("page-" + pageId);
  if (target) target.classList.add("visible");

  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === pageId);
  });

  if (pageId === "dashboard") renderDashboard();
  if (pageId === "kitchen") { renderKitchen(); clearBadge("kitchen-badge"); }
  if (pageId === "inventory") { renderInventory(); clearBadge("inventory-badge"); }
  if (pageId === "approval") renderApprovals();
}
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

// --- 2. New Order: menu + cart --------------------------------------------
function getFilteredMenu() {
  return MENU
    .filter((m) => activeCat === "All" || m.cat === activeCat)
    .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
}

function renderMenu() {
  const filtered = getFilteredMenu();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (menuPage > totalPages) menuPage = totalPages;
  const start = (menuPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";
  pageItems.forEach((item) => {
    const card = document.createElement("button");
    card.className = "menu-item";
    card.innerHTML = `
      <div class="menu-item-emoji">${item.emoji}</div>
      <div class="menu-item-name">${item.name}</div>
      <div class="menu-item-row">
        <span class="menu-item-price">₱${item.price.toFixed(2)}</span>
        <span class="menu-item-add">+</span>
      </div>
    `;
    card.addEventListener("click", () => addToCart(item));
    grid.appendChild(card);
  });

  renderPagination("menu-pagination", menuPage, totalPages, (p) => { menuPage = p; renderMenu(); });
}

function addToCart(item) {
  const existing = cart.find((c) => c.id === item.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
  renderCart();
}

function changeQty(id, delta) {
  const line = cart.find((c) => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart.splice(cart.indexOf(line), 1);
  renderCart();
}

function cartTotals() {
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function renderCart() {
  const container = document.getElementById("order-items");
  container.innerHTML = "";
  cart.forEach((line) => {
    const row = document.createElement("div");
    row.className = "order-line";
    row.innerHTML = `
      <span class="order-line-name">${line.name}</span>
      <span class="qty-stepper">
        <button data-delta="-1">−</button>
        <span>${line.qty}</span>
        <button data-delta="1">+</button>
      </span>
      <span class="order-line-price">₱${(line.price * line.qty).toFixed(2)}</span>
    `;
    row.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => changeQty(line.id, parseInt(btn.dataset.delta, 10)));
    });
    container.appendChild(row);
  });

  const { subtotal, tax, total } = cartTotals();
  document.getElementById("subtotal").textContent = "₱" + subtotal.toFixed(2);
  document.getElementById("tax").textContent = "₱" + tax.toFixed(2);
  document.getElementById("grand-total").textContent = "₱" + total.toFixed(2);
  document.getElementById("checkout-total").textContent = "₱" + total.toFixed(2);

  const hint = document.getElementById("cart-hint");
  hint.textContent = cart.length === 0 ? "Add items from the menu to start an order." : `${cart.reduce((n, c) => n + c.qty, 0)} item(s) in this order.`;
}

document.querySelectorAll(".category-pills .pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".category-pills .pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCat = pill.dataset.cat;
    menuPage = 1;
    renderMenu();
  });
});

document.getElementById("menu-search").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  menuPage = 1;
  renderMenu();
});

document.getElementById("clear-order").addEventListener("click", () => {
  cart.length = 0;
  renderCart();
});

// --- 3. Checkout + Cash Payment modal -------------------------------------
const modal = document.getElementById("payment-modal");
const tenderedInput = document.getElementById("cash-tendered");
const modalError = document.getElementById("modal-error");

document.getElementById("checkout-btn").addEventListener("click", () => {
  if (cart.length === 0) return;
  const { total } = cartTotals();
  document.getElementById("modal-total").textContent = "₱" + total.toFixed(2);
  document.getElementById("modal-change").textContent = "₱0.00";
  tenderedInput.value = "";
  modalError.textContent = "";
  renderQuickCash(total);
  modal.classList.add("visible");
  tenderedInput.focus();
});

document.getElementById("modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
function closeModal() { modal.classList.remove("visible"); }

function renderQuickCash(total) {
  const row = document.getElementById("quick-cash-row");
  row.innerHTML = "";
  const roundedUp = Math.ceil(total / 50) * 50;
  const amounts = [...new Set([total, roundedUp, roundedUp + 100, roundedUp + 200])];
  amounts.forEach((amt) => {
    const btn = document.createElement("button");
    btn.className = "quick-cash-btn";
    btn.textContent = "₱" + amt.toFixed(0);
    btn.addEventListener("click", () => { tenderedInput.value = amt.toFixed(2); updateChange(); });
    row.appendChild(btn);
  });
}

function updateChange() {
  const { total } = cartTotals();
  const tendered = parseFloat(tenderedInput.value) || 0;
  const change = tendered - total;
  document.getElementById("modal-change").textContent = "₱" + Math.max(0, change).toFixed(2);
  modalError.textContent = tendered > 0 && change < 0 ? "Amount tendered is less than the total due." : "";
}
tenderedInput.addEventListener("input", updateChange);

document.getElementById("confirm-payment-btn").addEventListener("click", async () => {
  const { subtotal, tax, total } = cartTotals();
  const tendered = parseFloat(tenderedInput.value) || 0;

  if (tendered < total) {
    modalError.textContent = "Amount tendered is less than the total due.";
    return;
  }

  const change = +(tendered - total).toFixed(2);

  // Step 1-2: order is received and computed (cart + totals already exist).
  // Step 3: persist the order as sent to the kitchen.
  const order = await createOrder({
    items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    subtotal, tax, total,
    payment: { method: "Cash", tendered, change },
    tableLabel: "Table 5",
  });

  // Step 4 + decision: deduct ingredient stock, raise alerts if needed.
  await deductInventoryForOrder(order.items, menuById);

  cart.length = 0;
  renderCart();
  closeModal();
  await refreshApprovalBadge();
  await refreshKitchenBadge();
  await refreshInventoryBadge();

  showOrderDetail(order.id);
});

// --- 4. Order Details (real data from the database) ----------------------
async function showOrderDetail(orderId) {
  const order = await DB.get("orders", orderId);
  if (!order) return;

  document.getElementById("detail-order-id").textContent = order.id;
  document.getElementById("detail-table").textContent = order.table;
  document.getElementById("detail-datetime").textContent = new Date(order.createdAt).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const statusLabel = { sent_to_kitchen: "Sent to Kitchen", preparing: "In Preparation", ready: "Ready to Serve", completed: "Completed" };
  const pill = document.getElementById("detail-status-pill");
  pill.textContent = statusLabel[order.status] || order.status;
  pill.className = "status-pill status-progress";

  const body = document.getElementById("detail-items-body");
  body.innerHTML = "";
  order.items.forEach((line) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line.name}</td>
      <td>${line.qty}</td>
      <td>₱${line.price.toFixed(2)}</td>
      <td>₱${(line.price * line.qty).toFixed(2)}</td>
    `;
    body.appendChild(tr);
  });

  document.getElementById("detail-subtotal").textContent = "₱" + order.subtotal.toFixed(2);
  document.getElementById("detail-tax").textContent = "₱" + order.tax.toFixed(2);
  document.getElementById("detail-total").textContent = "₱" + order.total.toFixed(2);

  const paymentPill = document.getElementById("detail-payment-pill");
  paymentPill.textContent = "Paid (Cash)";
  paymentPill.className = "status-pill status-paid";
  document.getElementById("detail-payment-info").textContent =
    `Cash tendered ₱${order.payment.tendered.toFixed(2)} · Change ₱${order.payment.change.toFixed(2)}`;

  const orderOfStatus = ["sent_to_kitchen", "preparing", "ready", "completed"];
  const currentIdx = orderOfStatus.indexOf(order.status);
  const steps = [
    { label: "Order Received" },
    { label: "Sent to Kitchen" },
    { label: "In Preparation" },
    { label: "Ready to Serve" },
    { label: "Completed" },
  ];

  const timeline = document.getElementById("detail-status-timeline");
  timeline.innerHTML = "";
  steps.forEach((step, i) => {
    // "Order Received" (0) and "Sent to Kitchen" (1) both complete as soon
    // as status reaches sent_to_kitchen (index 0); the remaining steps map
    // 1:1 to orderOfStatus indices 1, 2, 3.
    const mappedIdx = i <= 1 ? 0 : i - 1;
    const done = mappedIdx < currentIdx || (i <= 1 && currentIdx >= 0);
    const active = mappedIdx === currentIdx && i > 1;
    const li = document.createElement("li");
    li.className = done ? "done" : active ? "active" : "";
    li.innerHTML = `<span class="dot">${i + 1}</span> ${step.label} <span class="time">${done || active ? order.timeLabel : "Pending"}</span> ${done ? '<span class="check">✓</span>' : ""}`;
    timeline.appendChild(li);
  });

  showPage("detail");
}

// --- 5. Kitchen Queue (real orders from the database) ---------------------
let kitchenFilter = "All";

async function renderKitchen() {
  const orders = await DB.getAll("orders");
  orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  document.getElementById("count-all").textContent = orders.filter((o) => o.status !== "completed").length;
  document.getElementById("count-new").textContent = orders.filter((o) => o.status === "sent_to_kitchen").length;
  document.getElementById("count-prep").textContent = orders.filter((o) => o.status === "preparing").length;
  document.getElementById("count-ready").textContent = orders.filter((o) => o.status === "ready").length;
  document.getElementById("kitchen-updated").textContent = new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

  const grid = document.getElementById("kitchen-grid");
  grid.innerHTML = "";

  orders
    .filter((o) => o.status !== "completed")
    .filter((o) => kitchenFilter === "All" || o.status === kitchenFilter)
    .forEach((o) => {
      const card = document.createElement("div");
      card.className = "kitchen-card" + (o.status === "sent_to_kitchen" ? " new" : o.status === "ready" ? " ready" : "");
      const itemsHtml = o.items.map((i) => `<li>${i.name} x${i.qty}</li>`).join("");

      let actionHtml = "";
      if (o.status === "sent_to_kitchen") {
        actionHtml = `<button class="btn btn-start" data-order="${o.id}" data-next="preparing">Start</button>`;
      } else if (o.status === "preparing") {
        const mins = Math.max(0, Math.round((Date.now() - new Date(o.createdAt)) / 60000));
        actionHtml = `<span class="kitchen-elapsed">⏱ ${mins} min elapsed</span><button class="btn btn-start" data-order="${o.id}" data-next="ready">Mark Ready</button>`;
      } else if (o.status === "ready") {
        actionHtml = `<div class="ready-tag">Ready</div><button class="btn btn-serve" data-order="${o.id}" data-next="completed">Serve</button>`;
      }

      card.innerHTML = `
        <div class="kitchen-card-head"><span>#${o.id}</span><span class="time">${o.timeLabel}</span></div>
        <div class="kitchen-card-meta">${o.table}</div>
        <ul class="kitchen-card-items">${itemsHtml}</ul>
        <div class="kitchen-card-customer">Cashier: Nicole M.</div>
        ${actionHtml}
      `;
      card.querySelectorAll("button[data-order]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await updateOrderStatus(btn.dataset.order, btn.dataset.next);
          renderKitchen();
        });
      });
      card.addEventListener("click", () => showOrderDetail(o.id));
      grid.appendChild(card);
    });
}

document.querySelectorAll(".queue-filter-pills .pill[data-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".queue-filter-pills .pill[data-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    kitchenFilter = pill.dataset.filter;
    renderKitchen();
  });
});

// --- 6. Inventory (real stock from the database) --------------------------
let invFilter = "All";
const statusClass = { "In Stock": "status-instock", "Low Stock": "status-lowstock", "Out of Stock": "status-outofstock" };

function statusOf(row) {
  if (row.stock <= 0) return "Out of Stock";
  if (row.stock < row.lowThreshold) return "Low Stock";
  return "In Stock";
}

async function renderInventory() {
  const rows = await DB.getAll("inventory");
  document.getElementById("count-low").textContent = rows.filter((r) => statusOf(r) === "Low Stock").length;
  document.getElementById("count-out").textContent = rows.filter((r) => statusOf(r) === "Out of Stock").length;

  const body = document.getElementById("inventory-body");
  body.innerHTML = "";
  rows
    .filter((r) => invFilter === "All" || statusOf(r) === invFilter)
    .forEach((r) => {
      const status = statusOf(r);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.category}</td>
        <td>${r.stock.toFixed(2)}</td>
        <td>${r.unit}</td>
        <td><span class="status-pill ${statusClass[status]}">${status}</span></td>
      `;
      body.appendChild(tr);
    });
}

document.querySelectorAll("#page-inventory .pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#page-inventory .pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    invFilter = pill.dataset.invfilter;
    renderInventory();
  });
});

// --- 7. Manager Approval (real alerts from the database) ------------------
let appFilter = "needed";

async function refreshApprovalBadge() {
  const alerts = await DB.getAll("approvals");
  const needed = alerts.filter((a) => a.status === "needed").length;
  const badge = document.getElementById("approval-badge");
  badge.textContent = needed;
  badge.style.display = needed > 0 ? "inline-flex" : "none";
}

async function renderApprovals() {
  const alerts = await DB.getAll("approvals");
  document.getElementById("count-needed").textContent = alerts.filter((a) => a.status === "needed").length;
  document.getElementById("count-approved").textContent = alerts.filter((a) => a.status === "approved").length;
  document.getElementById("approval-page-badge").textContent = alerts.filter((a) => a.status === "needed").length;

  const list = document.getElementById("approval-list");
  list.innerHTML = "";

  alerts
    .filter((a) => a.status === appFilter)
    .forEach((a) => {
      const card = document.createElement("div");
      card.className = "approval-card " + a.type;
      const title = a.type === "out" ? "⛔ Out of Stock Alert" : "⚠ Low Stock Alert";
      const text = a.type === "out"
        ? `<p class="approval-text">${a.ingredient} is out of stock.</p>`
        : `<p class="approval-text">${a.ingredient} is running low (${a.stock.toFixed(2)} ${a.unit} available).</p>`;

      const actionsHtml = a.status === "needed"
        ? `<div class="approval-actions">
             <button class="btn btn-outline">View Details</button>
             <button class="btn btn-approve" data-approve="${a.id}">Approve Restock</button>
           </div>`
        : `<p class="approval-text" style="color:#15803D;">✓ Approved ${a.approvedAt || ""}</p>`;

      card.innerHTML = `
        <div class="approval-head">
          <span class="approval-title">${title}</span>
          <span class="approval-time">${a.time}</span>
        </div>
        ${text}
        ${actionsHtml}
      `;
      const approveBtn = card.querySelector("[data-approve]");
      if (approveBtn) {
        approveBtn.addEventListener("click", async () => {
          await approveRestock(a.id);
          renderApprovals();
          renderInventory();
          refreshApprovalBadge();
        });
      }
      list.appendChild(card);
    });
}

document.querySelectorAll("#page-approval .pill[data-appfilter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#page-approval .pill[data-appfilter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    appFilter = pill.dataset.appfilter;
    renderApprovals();
  });
});

document.getElementById("approval-refresh").addEventListener("click", renderApprovals);

// --- 8. Notification badges for sidebar ------------------------------------
function setBadge(id, count) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle("hidden", count <= 0);
}

function clearBadge(id) {
  setBadge(id, 0);
}

async function refreshKitchenBadge() {
  const orders = await DB.getAll("orders");
  const newCount = orders.filter((o) => o.status === "sent_to_kitchen").length;
  setBadge("kitchen-badge", newCount);
}

async function refreshInventoryBadge() {
  const rows = await DB.getAll("inventory");
  const alertCount = rows.filter((r) => r.stock < r.lowThreshold).length;
  setBadge("inventory-badge", alertCount);
}

// --- 9. Pagination helper ---------------------------------------------------
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "←";
  prev.disabled = currentPage <= 1;
  prev.addEventListener("click", () => onPageChange(currentPage - 1));
  container.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => onPageChange(i));
    container.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "→";
  next.disabled = currentPage >= totalPages;
  next.addEventListener("click", () => onPageChange(currentPage + 1));
  container.appendChild(next);
}

// --- 10. Dashboard ----------------------------------------------------------
async function renderDashboard() {
  const orders = await DB.getAll("orders");
  const inventory = await DB.getAll("inventory");

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingKitchen = orders.filter((o) => o.status === "sent_to_kitchen").length;
  const lowStockCount = inventory.filter((r) => r.stock < r.lowThreshold).length;

  const statsContainer = document.getElementById("dashboard-stats");
  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Orders</div>
      <div class="stat-value">${totalOrders}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₱${totalRevenue.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending in Kitchen</div>
      <div class="stat-value">${pendingKitchen}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Low Stock Items</div>
      <div class="stat-value">${lowStockCount}</div>
    </div>
  `;

  const totalDashPages = Math.max(1, Math.ceil(MENU.length / ITEMS_PER_PAGE));
  if (dashPage > totalDashPages) dashPage = totalDashPages;
  const start = (dashPage - 1) * ITEMS_PER_PAGE;
  const pageItems = MENU.slice(start, start + ITEMS_PER_PAGE);

  const grid = document.getElementById("dashboard-menu-grid");
  grid.innerHTML = "";
  pageItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "dashboard-item-card";
    card.innerHTML = `
      <div class="dashboard-item-emoji">${item.emoji}</div>
      <div class="dashboard-item-info">
        <div class="dashboard-item-name">${item.name}</div>
        <div class="dashboard-item-cat">${item.cat}</div>
        <div class="dashboard-item-price">₱${item.price.toFixed(2)}</div>
      </div>
      <button class="btn btn-primary dashboard-order-btn">Order</button>
    `;
    card.querySelector(".dashboard-order-btn").addEventListener("click", () => {
      addToCart(item);
      showPage("orders");
    });
    grid.appendChild(card);
  });

  renderPagination("dashboard-pagination", dashPage, totalDashPages, (p) => { dashPage = p; renderDashboard(); });
}
