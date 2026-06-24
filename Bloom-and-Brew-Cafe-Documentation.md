================================================================================
       BLOOM AND BREW CAFE - POINT OF SALE (POS) SYSTEM DOCUMENTATION
                         Electives Finals Project
================================================================================


1. PROJECT OVERVIEW
--------------------------------------------------------------------------------

The Bloom and Brew Cafe POS System is a fully functional cafe point-of-sale
and restaurant management system. It is a web-based application built using
pure HTML, CSS, and JavaScript with no external frameworks or build tools
required.

The system uses the browser's built-in IndexedDB for persistent data storage,
meaning all data survives page reloads and works fully offline. It can be
hosted on GitHub Pages or opened directly in any modern browser.

Technology Stack:
  - HTML5 (structure and markup)
  - CSS3 (styling, responsive design, animations)
  - Vanilla JavaScript (application logic, database operations)
  - IndexedDB (browser-based persistent database)
  - sessionStorage (page state persistence across refreshes)
  - localStorage (held orders persistence)


2. SYSTEM ARCHITECTURE
--------------------------------------------------------------------------------

The application consists of four core files:

  index.html  - Complete UI markup including the landing page, sidebar
                navigation, all 6 functional modules, and all modal dialogs
                (cash payment, order history, iced/hot picker, add inventory,
                stock details, exit confirmation).

  style.css   - All visual styling organized by component. Includes responsive
                breakpoints for desktop, tablet, and mobile devices.

  db.js       - The database layer containing the schema definition, seed data
                for menu items and inventory, CRUD helper functions, and all
                business logic operations.

  script.js   - Application logic including page navigation, cart management,
                table management, stock validation, checkout flow, rendering
                functions for each module, timers, and all interactive feature
                handlers.

  images/     - Directory containing product photos for all 33 menu items,
                the cafe logo, favicon, and SVG icons (refresh button).


3. SYSTEM WORKFLOW
--------------------------------------------------------------------------------

The POS implements a complete automated order-to-kitchen-to-inventory workflow
with table management and stock validation:

  Step 1: ORDER TYPE SELECTION
    The cashier selects "Dine In" or "Take Out" using the toggle buttons
    in the order panel. For dine-in orders, a table selector appears with
    stepper buttons (1-10) and real-time Available/Occupied status.

  Step 2: MENU ITEM SELECTION
    The cashier selects menu items from the categorized menu grid. Items
    with out-of-stock ingredients are grayed out and marked "Unavailable".
    Items with low stock show a "X left" tag indicating remaining servings.
    For coffee items, a temperature picker modal appears allowing the
    choice of Iced (with an additional 5 peso charge) or Hot.

  Step 3: STOCK VALIDATION
    As items are added to the cart, the menu updates in real-time. When
    the cart quantity reaches the stock limit for an item, that item
    becomes disabled on the menu grid. This prevents ordering beyond
    available inventory.

  Step 4: CHECKOUT AND PAYMENT
    When the cashier clicks Checkout, a Cash Payment modal opens showing
    the amount due. Quick-cash suggestions are provided for common
    denominations. The system calculates change in real-time and prevents
    payment if the tendered amount is insufficient.

  Step 5: TABLE ASSIGNMENT
    For dine-in orders, the system checks table availability:
      - If the selected table is available, it is assigned to the order
      - If the selected table is occupied, the system auto-selects the
        next available table
      - If all 10 tables are occupied, the order is tagged "Waiting"
    After checkout, the table selector auto-advances to the next
    available table for the next order.

  Step 6: SEND TO KITCHEN
    Upon confirming payment, the order is saved to the database with a
    status of "sent_to_kitchen", the order type (Dine In/Take Out), and
    the assigned table. A notification badge appears on the Kitchen
    sidebar item. A countdown timer begins for dine-in orders.

  Step 7: INVENTORY DEDUCTION
    In the same operation, every ingredient used by the ordered items is
    automatically deducted from the inventory. Each menu item has a
    defined list of ingredients and usage amounts per serving. The menu
    grid immediately updates to reflect new stock levels.

  Step 8: LOW STOCK ALERTS
    If any ingredient's stock level drops below its defined threshold
    after deduction, the system automatically creates a Low Stock or
    Out of Stock alert. A notification badge appears on the Manager
    Approval sidebar item. Affected menu items show updated stock tags
    or become unavailable.

  Step 9: RESTOCK APPROVAL
    The manager can view detailed stock information (current level,
    threshold, affected menu items, remaining servings) and approves
    the restock with a single click. Upon approval, the ingredient's
    stock is replenished to 2.5 times its threshold level, the alert
    is marked as approved, and affected menu items become available
    again immediately.

  Step 10: AUTO-COMPLETE (DEMO MODE)
    Dine-in orders automatically complete after 3 minutes, simulating
    customer turnover. When an order auto-completes, the table is freed
    and the oldest waiting order (if any) is automatically assigned to
    the freed table.


4. MODULE DESCRIPTIONS
--------------------------------------------------------------------------------

4.1 LANDING PAGE (STARTER PAGE)

    The landing page serves as the entry point to the POS system. It
    displays the Bloom and Brew Cafe branding with the logo, a tagline
    reading "Modern Comfort, Grassy Nature. Where friends and family
    bond & chill.", and three informational cards (Our Menu, Our Story,
    Book a Table).

    An "Enter POS System" button transitions the user into the main
    interface. The system uses sessionStorage to track the active state:
      - Refreshing the page stays in the current POS module
      - Closing the browser tab returns to the landing page on next visit

    The cashier can return to the landing page at any time by clicking
    their name in the sidebar and selecting "Exit to Home."


4.2 ORDERS MODULE (NEW ORDER)

    This is the primary ordering interface used by the cashier.

    Order Type Selection:
      - Toggle buttons for "Dine In" and "Take Out"
      - Dine In shows the table selector; Take Out hides it
      - The page header updates to reflect the selected type
      - Order type is stored with each order and shown in receipts,
        order details, and kitchen queue

    Table Management:
      - Stepper buttons (+/-) to select table number (1-10)
      - Real-time status indicator: "Available" (green) or "Occupied"
        (orange) based on active orders
      - After placing a dine-in order, auto-selects the next available
        table
      - If all 10 tables are occupied when a dine-in order is placed,
        the order is saved with table = "Waiting"
      - When any table frees up, the oldest waiting order is auto-assigned

    Menu Display:
      - Products are displayed in a 4-column grid with product photos
      - Items are organized by category: Coffee, Ice Shaken, Non-Coffee,
        and Snacks
      - Category filter pills allow quick filtering
      - A search bar enables real-time text search across all items
      - Pagination shows 12 items per page with navigation controls

    Stock Availability:
      - Items with out-of-stock ingredients are grayed out with a red
        "Unavailable" tag and cannot be clicked
      - Items with limited stock (5 or fewer servings) show an orange
        "X left" tag
      - As items are added to the cart, the remaining count decreases
      - When the cart reaches the stock limit, the item becomes disabled
      - Stock limits are calculated based on the ingredient with the
        lowest available servings

    Iced/Hot Coffee Selection:
      - When a Coffee category item is selected, a modal appears with
        two options: Iced (+5 pesos) or Hot (base price)
      - Each variant is tracked separately in the cart
      - Both variants share the same stock limit from the base item

    Cart Management:
      - Items appear in the cart panel on the right side
      - Quantity steppers (+/-) adjust amounts per item
      - Subtotal, tax (configurable percentage), and total update live
      - Menu grid updates in real-time as cart quantities change
      - "Clear" button removes all items from the cart

    Hold Order:
      - Saves the current cart to localStorage for later retrieval
      - Includes the current table number and order type
      - A badge displays the count of held orders
      - Held orders can be resumed or discarded from Order History

    Order History:
      - Opens a modal dialog with two tabs
      - "Completed Orders" tab shows all past orders from the database,
        sorted newest first. Click any order to view its details.
      - "Held Orders" tab shows saved carts with Resume and Discard
        buttons

    Checkout:
      - Opens the Cash Payment modal showing the amount due
      - Quick-cash buttons suggest common rounded amounts
      - Cash tendered input with real-time change calculation
      - Validation prevents payment if amount is insufficient
      - "Confirm Payment & Send to Kitchen" saves the order and
        triggers inventory deduction and menu refresh


4.3 ORDER DETAILS MODULE

    Displays the complete information for a single order.

    Order Information:
      - Order ID, order type (Dine In or Take Out with icons),
        table assignment, cashier name, date and time
      - Customer type (Walk-in Customer)
      - Status pill showing current order state

    Order Items Table:
      - Itemized list with name, quantity, unit price, and line total

    Payment Information:
      - Payment method (Cash), amount tendered, change given
      - Payment status indicator (Paid)

    Order Status Timeline:
      - Visual timeline showing progress through all stages:
        Order Received > Sent to Kitchen > In Preparation >
        Ready to Serve > Completed
      - Completed steps show checkmarks; current step is highlighted

    Action Buttons:
      - Print Receipt: Opens a formatted receipt in a new browser window
        and triggers the print dialog. Receipt includes cafe name, order
        type, table number, order details, itemized list, totals,
        payment info, and a thank-you message.
      - Move Status: Advances the order to the next workflow step with
        confirmation. Completing an order frees the table and assigns
        waiting orders.
      - Cancel Order: Permanently deletes incomplete orders after
        confirmation. Frees the table for waiting orders.


4.4 KITCHEN QUEUE MODULE

    The Kitchen Queue displays all active (non-completed) orders as cards
    for kitchen staff to manage preparation.

    Order Cards:
      - Each card shows order ID, time, table (or "Waiting" tag), item
        list, and cashier
      - Order type indicator: Take Out orders show a takeout icon
      - Color coding: yellow border for new orders, green for ready
      - Click any card to view full order details

    Countdown Timer:
      - Dine-in orders display a live countdown showing remaining time
      - Timer format: "X:XX left" with updates every 5 seconds
      - When under 30 seconds remaining, the timer turns red
      - Take Out orders do not display a timer

    Filter Pills:
      - All, New, Preparing, Ready — each with live count badges

    Sort Options:
      - Dropdown to sort by Newest First or Oldest First

    Action Buttons per Order:
      - "Start" — moves from sent_to_kitchen to preparing
      - "Mark Ready" — moves from preparing to ready
      - "Serve" — moves from ready to completed (frees table, assigns
        waiting orders)

    Auto-Complete:
      - Dine-in orders automatically complete after 3 minutes (demo)
      - System checks every 10 seconds for expired orders
      - On auto-complete, the table is freed and waiting orders are
        assigned to available tables

    Notifications:
      - Sidebar badge shows count of new (sent_to_kitchen) orders
      - Badge clears when the Kitchen module is visited
      - SVG refresh icon button to manually reload the queue
      - Kitchen auto-refreshes every 5 seconds when active


4.5 INVENTORY MODULE

    Manages all ingredient and product stock levels.

    Inventory Table:
      - Displays item name, category, current stock, unit, and status
      - Status indicators: In Stock (green), Low Stock (yellow),
        Out of Stock (red)

    Filter Pills:
      - All Items, Low Stock, Out of Stock — with live count badges

    Add Item:
      - Modal form to add new inventory items
      - Fields: Item Name, Category, Stock Amount, Unit, Low Stock
        Threshold
      - Validates all required fields before saving

    Automatic Updates:
      - Stock levels deduct automatically when orders are placed
      - Low stock alerts are created in Manager Approval when thresholds
        are crossed
      - Menu items become unavailable when ingredients run out
      - Menu items become available again after restock approval

    Notifications:
      - Sidebar badge shows count of items below threshold
      - Badge clears when the Inventory module is visited


4.6 MANAGER APPROVAL MODULE

    Handles stock alerts and restock approvals.

    Alert Cards:
      - Each alert shows the ingredient name, current stock level,
        and type
      - Out of Stock alerts (red) and Low Stock alerts (yellow)
      - Timestamp shows when the alert was generated

    Filter Tabs:
      - Approval Needed — pending alerts requiring action
      - Approved — previously approved restocks with approval timestamp

    View Details:
      - Opens a scrollable modal with fixed height showing:
        - Ingredient name and status (Low Stock / Out of Stock)
        - Current stock level with a visual progress bar
        - Low threshold value and category
        - Explanation of why the alert was triggered
        - List of all affected menu items with:
          - Item name and category
          - Usage per order (e.g., "0.04 kg/order")
          - Remaining servings possible with current stock

    Approve Restock:
      - One-click approval that replenishes the ingredient's stock to
        2.5 times its low-stock threshold
      - Updates inventory immediately
      - Re-renders the menu grid — previously unavailable items become
        available again
      - Moves the alert to the Approved tab

    Refresh:
      - SVG icon button; reloads the alert list, updates sidebar badges
        for both Approval and Inventory

    Badge Count:
      - Sidebar and page header show the number of pending approvals


4.7 DASHBOARD MODULE

    Provides an overview of the cafe's current status.

    Statistics Cards (4):
      - Total Orders — count of all orders in the database
      - Total Revenue — sum of all order totals
      - Pending in Kitchen — count of orders with sent_to_kitchen status
      - Low Stock Items — count of inventory items below threshold

    Menu Items Grid:
      - All 33 products displayed with photos, names, categories, prices
      - Unavailable items shown grayed out with "Unavailable" tag
      - "Order" button on available items adds to cart and navigates
        to the Orders module
      - Unavailable items show a disabled "Unavailable" button
      - Pagination with 12 items per page


4.8 SETTINGS MODULE

    System configuration and data management.

    Tax Rate:
      - Configurable tax percentage (default: 8.25%)
      - Changes update all calculations and display labels immediately

    Menu Item Prices:
      - Table listing all menu items with editable price fields
      - "Save All Prices" updates the database and refreshes the menu

    Data Management:
      - Reset Stock to Default: Restores all inventory to starting levels
        and clears all approval alerts. Orders and menu prices are
        preserved. Menu items become available again.
      - Reset All Data: Complete factory reset that clears all orders,
        inventory, prices, tax rate, and reseeds everything from defaults.


5. DATABASE SCHEMA
--------------------------------------------------------------------------------

The system uses five IndexedDB object stores:

  menuItems (key: id)
    Fields: id, name, price, cat (category), image (file path),
            ingredients (array of {name, use} objects)

  inventory (key: name)
    Fields: name, category, stock, unit, lowThreshold

  orders (key: id, index: status)
    Fields: id, items (array), subtotal, tax, total, payment (object),
            table, orderType (Dine In/Take Out), status, createdAt
            (ISO timestamp), timeLabel

  approvals (key: id)
    Fields: id, type (low/out), ingredient, stock, unit, time, status,
            approvedAt

  meta (key: key)
    Fields: key, value
    Records: seeded (boolean), orderCounter (number), taxRate (number)

Order Status Flow:
    sent_to_kitchen --> preparing --> ready --> completed

Table States:
    Available --> Occupied (active order) --> Available (completed/cancelled)
    If all occupied: new orders tagged "Waiting" --> auto-assigned on free

Auto-Reset Mechanism:
    When DB_VERSION is incremented in db.js, the system automatically
    detects the version mismatch via localStorage and deletes the old
    database before reseeding. This eliminates the need for manual
    console commands when the menu or schema changes.


6. MENU ITEMS
--------------------------------------------------------------------------------

COFFEE (11 items):
  Americano (P45), Cafe Latte (P55), Vanilla Latte (P59),
  Hazelnut Latte (P59), Spanish Latte (P59), Caramel Macchiato (P59),
  Salted Caramel (P59), White Mocha (P59), Cafe Mocha (P59),
  Coffee Matcha (P59), Hazelnut Mocha (P59)

  Note: All coffee items can be ordered as Iced (+P5) or Hot.

ICE SHAKEN (4 items):
  Chocolate (P55), Toffee Nut (P55), Black Tea (P55),
  Hibiscus Tea (P59)

NON-COFFEE (7 items):
  Matcha Latte (P25), Tangerine Tea (P25), Iced Chocolate (P35),
  Creamy Pandan (P35), Lychee (P35), Red Velvet (P35),
  Cranberry (P35)

SNACKS (11 items):
  Ube Crinkles (P59), Oatmeal Cookies (P39), Mixed Nuts (P69),
  Cheesecake Bar (P79), Avocado Toast (P99), Empanada (P79),
  Ensaimada (P79), Tuna Melt (P89), Hotdog (P69),
  Pasta Carbonara (P129), Fries (P99)

Total: 33 menu items across 4 categories


7. TABLE MANAGEMENT
--------------------------------------------------------------------------------

The system supports 10 tables (Table 1 through Table 10) with automatic
tracking and assignment:

  Table Selector:
    - Located in the order panel below the Dine In/Take Out toggle
    - Stepper buttons (+/-) to change table number
    - Real-time status badge: "Available" (green) or "Occupied" (orange)

  Automatic Assignment:
    - After placing a dine-in order, the system auto-selects the next
      available table for the next order
    - If the cashier manually selects an occupied table, the system
      auto-redirects to the next available one at checkout

  Waiting System:
    - If all 10 tables are occupied when a dine-in order is placed,
      the order is saved with table = "Waiting"
    - Waiting orders appear in the kitchen queue with a red "Waiting"
      badge instead of a table number
    - When any table frees up (order completed, auto-completed, or
      cancelled), the system automatically assigns the oldest waiting
      order to the freed table (FIFO order)

  Take Out:
    - Take Out orders bypass table management entirely
    - They are saved with table = "Take Out" and no table is occupied


8. DINE-IN TIMER (DEMO MODE)
--------------------------------------------------------------------------------

To simulate real cafe operations where customers occupy tables for a
limited time, the system includes an automatic completion timer:

  Timer Duration: 3 minutes (180 seconds)
    - Configurable via the DINE_IN_DURATION_MS variable in script.js

  How It Works:
    - When a dine-in order is created, its createdAt timestamp is recorded
    - Every 10 seconds, the system checks all active dine-in orders
    - If an order has been active for 3+ minutes, it is automatically
      marked as "completed"
    - The freed table is assigned to the oldest waiting order (if any)

  Kitchen Display:
    - Each dine-in order card shows a countdown timer (e.g., "2:45 left")
    - The timer updates every 5 seconds via kitchen auto-refresh
    - When under 30 seconds remaining, the timer turns red
    - Take Out orders do not display a timer

  Note: In a production environment, the timer duration would be set to
  a realistic value (e.g., 30-60 minutes). The 3-minute duration is for
  demonstration purposes.


9. STOCK VALIDATION AND AVAILABILITY
--------------------------------------------------------------------------------

The system enforces stock-based ordering limits:

  Unavailable Items:
    - If any ingredient required by a menu item has zero stock, the item
      is marked "Unavailable" with a red tag
    - The item is grayed out (50% opacity) and cannot be clicked
    - The "+" add button is hidden
    - This applies to both the Orders menu grid and the Dashboard

  Stock Limit Tags:
    - Items with 5 or fewer possible servings show an orange "X left" tag
    - The count is based on the ingredient with the lowest available
      servings (bottleneck ingredient)
    - Example: If Cafe Mocha needs 0.03L Choco Sauce and only 0.09L
      remains, it shows "3 left"

  Cart-Aware Limits:
    - As items are added to the cart, the remaining count decreases
    - When the cart reaches the maximum orderable quantity, the item
      becomes disabled (grayed out, unclickable)
    - Removing items from the cart re-enables the menu item

  Restock Recovery:
    - When the manager approves a restock, the ingredient is replenished
    - The menu grid immediately re-renders
    - Previously unavailable items become available again
    - Stock limit tags update to reflect new stock levels


10. RESPONSIVE DESIGN
--------------------------------------------------------------------------------

The system is fully responsive across all device sizes:

  Desktop (above 1024px):
    - Full sidebar with logo, text labels, and SVG icons
    - 4-column menu grid, 4-column dashboard grid
    - Side-by-side order layout (menu + cart)

  Tablet (768px to 1024px):
    - Narrower sidebar (200px)
    - 3-column grids
    - Slightly reduced spacing

  Mobile (up to 768px):
    - Top bar with hamburger menu icon and logo side by side
    - Sidebar becomes a 200px-wide slide-out overlay with full nav
      labels, icons, and cashier name/role
    - Cashier avatar sticks to the bottom of the sidebar
    - Dark backdrop behind sidebar when open; tap to close
    - Sidebar auto-closes when a nav item is selected
    - Single-column layouts, 2-column grids
    - Order cart moves above the menu grid

  Phone (up to 480px):
    - 2-column grids with smaller images
    - Stacked page headers
    - Compact buttons and fonts
    - Kitchen queue becomes single column


11. SIDEBAR NAVIGATION
--------------------------------------------------------------------------------

The sidebar provides access to all modules with the following features:

  Navigation Items:
    - Dashboard (grid icon)
    - Orders (list icon)
    - Kitchen (food icon)
    - Inventory (cup icon)
    - Manager Approval (edit icon)
    - Settings (gear icon)

  Visual States:
    - Active: Dark navy (#1A2238) background with white text/icon
    - Inactive: Blue (#2563EB) text/icon with transparent background
    - Hover: Light blue background with blue border

  Notification Badges:
    - Kitchen: Shows count of new orders (red badge)
    - Inventory: Shows count of low/out-of-stock items (red badge)
    - Manager Approval: Shows count of pending approvals (red badge)
    - Badges clear when the respective module is visited

  Cashier Profile:
    - Displays cashier avatar, name, and role at the bottom
    - Sticky position — stays at the bottom of the sidebar
    - Clicking opens exit modal with "Exit to Home" button

  Sticky Position:
    - Sidebar remains fixed while main content scrolls


12. SESSION PERSISTENCE
--------------------------------------------------------------------------------

The application maintains session state using sessionStorage and
localStorage:

  sessionStorage (clears when tab/browser closes):
    posActive:
      - Set to "true" when entering the POS system
      - On page load, if "true", skips the landing page automatically
      - Cleared when exiting to the landing page
    currentPage:
      - Stores the current module name on every navigation
      - On page load, restores the last active module
      - Cleared when exiting to the landing page

  localStorage (persists across sessions):
    heldOrders:
      - Stores held/saved cart items as JSON
      - Persists across page refreshes and browser restarts
      - Specific to the device/browser

  IndexedDB (bloo_brew_pos):
    - All orders, inventory, menu items, approvals, and settings
    - Persists until manually reset or DB_VERSION changes

  This design means:
    - Refreshing the page keeps you in the current POS module
    - Closing the tab/browser and reopening shows the landing page
    - Held orders survive both refreshes and browser restarts


13. RUNNING THE SYSTEM
--------------------------------------------------------------------------------

  Option 1 - Local:
    Open index.html directly in any modern browser (Chrome, Firefox,
    Edge, Safari). No server required.

  Option 2 - GitHub Pages:
    1. Go to the repository Settings
    2. Navigate to Pages
    3. Set Source to "Deploy from a branch"
    4. Set Branch to "main" and Folder to "/ (root)"
    5. Click Save
    6. Wait 1-2 minutes for deployment
    7. Access at: https://[username].github.io/[repo-name]/


14. KNOWN LIMITATIONS
--------------------------------------------------------------------------------

  - Cash is the only payment method (by design for this POS scope)
  - No login or authentication system; cashier name is static
  - Data is local to the browser and not synced between devices
  - Held orders use localStorage (cleared if browser data is cleared)
  - Dine-in timer is 3 minutes for demo (configurable in script.js)
  - No receipt printing to physical thermal printers (browser print only)


================================================================================
                          END OF DOCUMENTATION
================================================================================
