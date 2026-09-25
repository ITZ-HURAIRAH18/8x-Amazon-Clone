# Video Presentation Guide — Amazon Clone

A complete, shot-by-shot script for recording the assignment demo video. Follow the scenes in
order. Each scene lists the exact URL to open, what to click, and one sentence you can say out
loud.

---

## Before you record

### 1. What you need

| Item | Value |
| --- | --- |
| Frontend (live) | `https://amazon-clone-client-five.vercel.app` |
| Backend API (live) | `https://8x-amazon-clone-server.vercel.app/api` |
| Admin sign in | `https://amazon-clone-client-five.vercel.app/admin/login` |
| Repository | `https://github.com/ITZ-HURAIRAH18/8x-Amazon-Clone` |
| Stack | MongoDB, Express, React, Node.js, Vite, Mongoose, React Router, Axios, Recharts, JWT |

### 2. Create the accounts you will use in the video

Do this **before** recording so the video stays smooth.

```bash
git clone https://github.com/ITZ-HURAIRAH18/8x-Amazon-Clone.git
cd 8x-Amazon-Clone
npm install
npm run seed:admin
```

`npm run seed:admin` asks for the administrator name, email, and a 12+ character password.
Create two accounts and keep their details ready:

| Role | Purpose in the video |
| --- | --- |
| Administrator | Shows the admin dashboard |
| Customer | Shows sign-up, cart, checkout, orders |

The database is shared, so anything you change as an admin appears immediately for the customer.

### 3. Confirm the live system is healthy

```bash
npm run verify:deploy -- --api=https://8x-amazon-clone-server.vercel.app --client=https://amazon-clone-client-five.vercel.app
```

All six lines must read `PASS`:

```text
PASS Backend /api/health
PASS MongoDB connection
PASS Admin API reachable
PASS CORS allows the frontend
PASS Frontend /login
PASS Frontend API base URL
6/6 checks passed.
```

If the backend line fails, redeploy the backend Vercel project first (see `README.md` → Deployment).

### 4. Recording setup

- Resolution: 1920×1080, 30 fps is fine.
- Zoom the browser to 100% and hide bookmarks.
- Close every other tab and notification.
- Open DevTools but keep it collapsed; you will use it once in Scene 8.
- Suggested length: **12–18 minutes**. The scenes below total about that.
- Speak in short sentences. Show, then explain.

### 5. Clean slate

Before recording, put the site back to a tidy state so nothing looks broken:

- Delete any test products, coupons, or deals you created while testing.
- Use a fresh customer account, or log out and back in.

### 6. Open tabs to prepare in advance

Having these ready saves time and avoids typing on camera:

| Tab | URL |
| --- | --- |
| 1 | `https://amazon-clone-client-five.vercel.app` (storefront) |
| 2 | `https://amazon-clone-client-five.vercel.app/admin/login` (admin) |
| 3 | A second browser window or private window signed in as the customer |

Use the customer window for checkout and order tracking, and the admin window for the dashboard.
Switching between the two during Scene 14 makes the shared-database integration obvious.

---

## Scene-by-scene script

### Scene 1 — Title and introduction (0:00 – 0:40)

**Show:** the GitHub repository README top.

**Say:**
> This is my Amazon Clone, a full-stack MERN e-commerce application inspired by Amazon's
> shopping experience. It has a complete customer storefront and a full administration
> dashboard, both sharing one MongoDB database. The live frontend is on Vercel and the
> Express API is deployed as a Vercel Function.

**Show:** briefly scroll the README features list.

---

### Scene 2 — Homepage (0:40 – 1:30)

**Open:** `https://amazon-clone-client-five.vercel.app`

**Click through:**
1. Hero carousel — click the next arrow twice.
2. Category rail — click a category tile.
3. Deals section — click **View all deals**.
4. A product carousel — click **View all**.

**Say:**
> The homepage follows Amazon's visual language: a dark navigation bar with search suggestions,
> a hero carousel, category browsing, deals, best sellers, featured products, and recently
> viewed items. Everything is responsive, so it works on a phone as well as a desktop.

**Camera tip:** resize the browser window narrow to show the mobile header and slide-out menu,
then widen it again.

---

### Scene 3 — Search, filters, and sorting (1:30 – 2:30)

**Open:** `https://amazon-clone-client-five.vercel.app/products`

**Do:**
1. Type `headphones` in the search bar and press Enter.
2. Apply a **brand** filter, then a **price** range, then a **rating** filter.
3. Change **Sort by** to "Price: low to high".
4. Go to page 2 with the pagination controls.

**Say:**
> Search, filtering, sorting, and pagination all run on the server, not in the browser. The
> URL updates with every filter, so a filtered view can be bookmarked or shared.

---

### Scene 4 — Product details (2:30 – 3:30)

**Open:** any product page.

**Do:**
1. Click the thumbnails to change the main image.
2. Hover the image to zoom.
3. Scroll to the specifications table.
4. Point out stock, delivery information, and the wishlist and compare buttons.
5. Scroll to "Frequently bought together" and "Customers also viewed".

**Say:**
> The product page has a gallery with zoom, structured specifications, delivery and stock
> information, and related-product rails that are computed from the catalog.

---

### Scene 5 — Wishlist, comparison, recently viewed (3:30 – 4:10)

**Do:**
1. Click **Add to wishlist** on two or three products.
2. Open the wishlist from the header (`/wishlist`).
3. Click **Compare** on a product, then open `/compare` to show the comparison table.
4. Visit three or four products, then scroll to **Recently viewed** on any product page.

**Say:**
> The wishlist works for guests through browser storage and is persisted in MongoDB after
> sign-in. Comparison holds up to four products, and recently viewed is tracked per customer.

---

### Scene 6 — Cart, coupons, and saved for later (4:10 – 5:10)

**Do:**
1. Add a product to the cart, change the quantity, and remove it.
2. Use **Save for later**, then move it back to the cart.
3. Move a different item **to wishlist** from the cart.

**Say:**
> The cart supports quantity changes, save-for-later, and moving items between the cart and
> the wishlist. Guest state merges into the account when the customer signs in.

---

### Scene 7 — Authentication, checkout, and orders (5:10 – 7:10)

**Do:**
1. Click **Sign in** and register a new customer account.
2. Add a product to the cart and go to checkout.
3. Select **standard delivery**.
4. Apply the coupon code `SAVE10` (also available: `WELCOME5`, `FREESHIP`) and show the discount
   updating the totals.
5. Choose a payment method and place the order.
6. Open **Your orders**, open the new order, and walk through the tracking timeline.
7. Click **Buy again** to show reorder.

**Say:**
> Checkout validates pricing, stock, and coupons on the server. Applying a coupon recalculates
> the order total, stock is decremented when the order is created, and the customer gets a
> five-stage tracking timeline plus one-click reorder.

---

### Scene 8 — Customer account, reviews, notifications (7:10 – 8:10)

**Do:**
1. Open `/account`.
2. Add a saved address and set it as default.
3. Write a review on the product you just purchased (verified purchase).
4. Open **Notifications** and mark one as read.

**Say:**
> The account area has an order dashboard, saved addresses, coupons, reviews, wishlist, and
> notifications. Reviews are limited to products the customer actually purchased.

**Camera tip:** this is a good moment to open DevTools briefly and show the Network tab
returning JSON from the API, then close it.

---

### Scene 9 — Admin sign in and dashboard (8:10 – 9:20)

**Open:** `https://amazon-clone-client-five.vercel.app/admin/login`

**Do:**
1. Sign in with the administrator account.
2. Show the dashboard: revenue, orders, customers, products, reviews.
3. Change the **date filter** to "Last 7 days", then to a custom range.

**Say:**
> The admin workspace has its own sign-in page and its own scoped session. The dashboard is
> built from real MongoDB aggregation pipelines — no fake or random numbers — and the date
> filter changes the queries on the server.

**Camera tip:** collapse and re-expand the sidebar, and open the mobile drawer by narrowing the
window.

---

### Scene 10 — Admin analytics (9:20 – 9:50)

**Open:** `/admin/analytics`

**Do:**
1. Show the revenue-over-time and orders-over-time charts.
2. Show sales by category and by brand.
3. Change the period filter and point out the charts redraw.

**Say:**
> Revenue counts non-cancelled orders and excludes failed and refunded payments. All charts are
> rendered with Recharts from aggregation output, never from sample data.

---

### Scene 11 — Product management (9:50 – 11:00)

**Open:** `/admin/products`

**Do:**
1. Search and filter the product table.
2. Click a column header to sort.
3. Click **Add product** and fill the form: title, description, price, original price, SKU,
   category, brand, image URLs, stock, low-stock threshold, featured flag.
4. Save, then edit the product's price.
5. Open the product on the storefront in a new tab to show the change is live.
6. Use the checkbox column and try a bulk action, then delete the product.

**Say:**
> Product management covers create, edit, activate, deactivate, delete, and bulk actions.
> Every field is validated on the server as well as in the form — duplicate SKUs, invalid
> image URLs, and negative stock are all rejected with a clear message.

---

### Scene 12 — Categories, brands, inventory, and low stock (11:00 – 11:50)

**Do:**
1. `/admin/categories` — create a category, edit it, then try to delete a category that is in
   use to show the guard message.
2. `/admin/brands` — same flow.
3. `/admin/inventory` — set a product's stock to 5 with a threshold of 10.
4. Return to `/admin/dashboard` and show the product in the **Low stock** panel.
5. `/admin/notifications` — show the generated low-stock alert and mark all read.

**Say:**
> Categories and brands cannot be deleted while products still reference them. Inventory
> thresholds are configurable, and crossing one raises a low-stock notification for the admin
> team.

---

### Scene 13 — Coupons and deals (11:50 – 12:40)

**Do:**
1. `/admin/coupons` — create a percentage coupon with a minimum order, expiry date, and a
   per-user limit.
2. `/admin/deals` — create a deal, select products, and set a discount and end date.
3. Open `/deals` in a new tab to show the deal live for customers.

**Say:**
> A coupon created in the admin is immediately redeemable at customer checkout, subject to its
> start date, expiry, minimum order, and usage limits. A deal created here immediately appears
> on the customer deals page with discounted pricing, and the original pricing is restored when
> the deal ends or is removed.

---

### Scene 14 — Order management and customer/admin consistency (12:40 – 13:40)

**This is the strongest scene in the video.** Use two windows: the admin window and a customer
window signed in as the customer from Scene 7.

**Do:**
1. `/admin/orders` — search for the order placed in Scene 7.
2. Open it and show the customer, shipping address, items, payment, and totals.
3. Change the status to **Processing**, then **Shipped**.
4. Alt-tab to the customer window, refresh **Your orders**, and show the new status.
5. Cancel a different order to show stock being restored in `/admin/inventory`.

**Say:**
> This is the key integration point. The admin and the customer read the same database: an
> order placed by the customer appears here instantly, a status change here appears on the
> customer's tracking page, and cancelling restores inventory exactly once.

---

### Scene 15 — Customer and review management (13:40 – 14:20)

**Do:**
1. `/admin/users` — search a customer, open the profile, and show orders, spend, reviews, and
   wishlist summary.
2. Suspend the account, then try to sign in as that customer to show the block, then reactivate.
3. `/admin/reviews` — hide the review written in Scene 8, refresh the product page to show it
   gone, then approve it again.

**Say:**
> Customer records expose order history, lifetime spend, reviews, and wishlist, but never
> password hashes. Suspending an account immediately invalidates its sessions. Review
> moderation changes what customers see and recalculates the product rating.

---

### Scene 16 — Admin search, settings, and logout (14:20 – 15:00)

**Do:**
1. Use the search box in the admin header — search `keyboard`.
2. Show grouped results with counts for products, orders, customers, coupons, categories, brands.
3. `/admin/settings` — change the store name and low-stock threshold, save.
4. Use the profile menu → **Sign out**, then try to reopen `/admin/dashboard`.

**Say:**
> Admin search is typed and grouped. Settings control store identity, shipping and tax
> defaults, and alert preferences. Signing out revokes the session token on the server, so the
> dashboard cannot be reopened with the old session.

---

### Scene 17 — Responsive and accessibility (15:00 – 15:45)

**Do:**
1. Open DevTools device mode and step through: 390×844, 430×932, 768×1024, 1024×768, 1280×720,
   1440×900.
2. On the admin dashboard, narrow to mobile to show the drawer navigation and stacked cards.
3. Tab through a page without the mouse to show visible focus outlines.
4. Open a dialog with a button and press Escape to close it.

**Say:**
> The storefront and the admin workspace are both verified at six viewport widths. Tables
> scroll horizontally on small screens, cards stack, forms become one column, and the admin
> drawer traps focus. Dialogs close on Escape and restore focus.

---

### Scene 18 — Engineering quality and testing (15:45 – 16:45)

**Show:** a terminal, split if you like.

```bash
npm run build          # production build of the client
npm run smoke          # customer commerce smoke test
npm run smoke:admin    # admin + integration smoke test
```

**Say:**
> The build passes. Two smoke suites run against the real API and database. The customer suite
> covers search, wishlist, cart, coupons, checkout, reviews, and notifications. The admin suite
> covers admin authentication, 401 and 403 enforcement, dashboard aggregation, product and
> taxonomy management, checkout with an admin coupon, inventory decrement and restore, order
> status visibility, deal creation, review moderation, customer suspension, notifications,
> search, settings, and token revocation. Both clean up their own test data.

**Optional extra:** open `.github/workflows/ci.yml` to show that every push runs the build, a
server syntax check, and a secret scan.

---

### Scene 19 — Deployment and security (16:45 – 17:30)

**Run:**

```bash
npm run verify:deploy -- --api=https://8x-amazon-clone-server.vercel.app --client=https://amazon-clone-client-five.vercel.app
```

**Say:**
> The live deployment is a Vercel frontend and a Vercel Function backend, with environment
> variables for the MongoDB URI, the JWT secret, and the allowed client origin. This command
> verifies the whole chain: backend health, database connection, admin API reachability, CORS,
> the SPA route, and the API base URL compiled into the bundle. Secrets are never committed,
> and CI scans for them.

---

### Scene 20 — Limitations and closing (17:30 – 18:00)

**Say:**
> To be clear about scope: payment is simulated rather than connected to a real gateway,
> shipping labels and carrier tracking are simulated, and product recommendations are
> deterministic rules rather than machine learning. Real payments, real carrier integration,
> and ML recommendations are the natural next steps.

**Close on:** the storefront homepage, then the admin dashboard.

---

## Quick reference — every route used in the video

### Customer

| Feature | URL |
| --- | --- |
| Home | `/` |
| Search and filters | `/products` |
| Product detail | `/product/:id` |
| Deals | `/deals` |
| Compare | `/compare` |
| Wishlist | `/wishlist` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Sign in / register | `/login`, `/register` |
| Account dashboard | `/account` |
| Orders | `/account/orders` |
| Order detail and tracking | `/order/:id` |
| Notifications | `/account/notifications` |

### Admin

| Feature | URL |
| --- | --- |
| Sign in | `/admin/login` |
| Dashboard | `/admin/dashboard` |
| Analytics | `/admin/analytics` |
| Products | `/admin/products` |
| New product | `/admin/products/new` |
| Categories | `/admin/categories` |
| Brands | `/admin/brands` |
| Orders | `/admin/orders` |
| Order detail | `/admin/orders/:id` |
| Customers | `/admin/users` |
| Customer detail | `/admin/users/:id` |
| Reviews | `/admin/reviews` |
| Coupons | `/admin/coupons` |
| Deals | `/admin/deals` |
| Inventory | `/admin/inventory` |
| Notifications | `/admin/notifications` |
| Settings | `/admin/settings` |
| Global search | `/admin/search?q=keyboard` |

### Test data you will need

| Item | Value |
| --- | --- |
| Seeded coupon codes | `SAVE10`, `WELCOME5`, `FREESHIP` |
| Seeded catalog | 24 products across 10 categories |
| Admin account | Created by you with `npm run seed:admin` |
| Customer account | Registered in Scene 7 |

---

## Troubleshooting during recording

| Problem | Fix |
| --- | --- |
| Login shows 404 or a CORS message | The backend is not serving `/api`. Run `npm run verify:deploy` and redeploy the backend Vercel project. |
| Admin login says "does not have administrator access" | You signed in with a customer account. Use the account created by `npm run seed:admin`. |
| Coupon code is rejected | The cart subtotal must meet the coupon minimum, and the coupon must not be expired or fully used. |
| "Only customers who purchased this product can review it" | Review the product from the order you actually placed. |
| Deal does not appear on the deals page | The deal start date must be in the past and the end date in the future, and the products must be active. |
| Page looks empty | The API is unreachable. Check `https://8x-amazon-clone-server.vercel.app/api/health`. |
| Need to restart from scratch | Log out, clear the site data for the domain, and reload. |

---

## Presenting tips

1. **Show, then explain.** Perform the action first, then say what happened and why.
2. **Name the integration.** The strongest moment in this project is Scene 14, where an admin
   change is immediately visible to the customer. Slow down there.
3. **Keep the console visible once.** Scene 18 running the smoke tests with real output is strong
   evidence that the system actually works.
4. **Do not read the README aloud.** Use it as a checklist, not a script.
5. **State the limits honestly.** Examiners reward a clear scope statement more than an
   overstated claim.
6. **Stay inside the time limit.** If you are running long, cut Scenes 12 and 15 to a quick
   mention and keep 9, 11, 13, 14, and 18.

---

## Files worth showing on camera

| File | What it proves |
| --- | --- |
| `README.md` | Complete, accurate documentation |
| `client/src/App.jsx` | Route table and admin route protection |
| `client/src/pages/AdminDashboardPage.jsx` | The admin dashboard screen |
| `client/src/components/admin/AdminUI.jsx` | Reusable table, modal, and status components |
| `client/src/context/AdminAuthContext.jsx` | Separate scoped admin session |
| `server/src/routes/adminRoutes.js` | The admin API surface |
| `server/src/controllers/adminAnalyticsController.js` | Real MongoDB aggregation pipelines |
| `server/src/middleware/auth.js` | Authentication and role enforcement |
| `server/src/seedAdmin.js` | Environment-driven admin creation |
| `server/src/smokeTest.js` | Customer smoke test |
| `server/src/adminSmokeTest.js` | Admin and integration smoke test |
| `scripts/verify-deployment.mjs` | Deployment verification |
| `.github/workflows/ci.yml` | Automated build, syntax check, and secret scan |
| `agent.md` | The assignment requirements that were implemented |
| `.agent-logs/` | The captured work sessions required by the assignment |
