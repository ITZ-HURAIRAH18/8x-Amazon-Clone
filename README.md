# Amazon Clone

## Overview

Amazon Clone is a high-fidelity MERN e-commerce application inspired by Amazon's browsing experience. It combines a dense, responsive storefront with real REST APIs, MongoDB persistence, JWT authentication, guest and account carts, saved addresses, coupons, wishlist, reviews, checkout, order tracking, and reorder functionality, plus a complete role-protected administration workspace for catalog, order, customer, promotion, and inventory management.

The project is intentionally a functional commerce demo rather than a claim of Amazon's real backend. Product data is seeded, payment is simulated, and recommendations are deterministic rather than machine-learned.

**Live URLs and key files**

| | |
| --- | --- |
| Frontend (Vercel) | `https://amazon-clone-client-five.vercel.app` |
| Backend API (Vercel) | `https://8x-amazon-clone-server.vercel.app/api` |
| Admin sign in | `https://amazon-clone-client-five.vercel.app/admin/login` |
| Repository | `https://github.com/ITZ-HURAIRAH18/8x-Amazon-Clone` |
| Assignment requirements | `agent.md` |
| Video presentation guide | `VIDEO_PRESENTATION_GUIDE.md` |

## Stack

- **Frontend:** React 18, Vite, React Router, Axios, Recharts, Lucide React, structured CSS
- **Backend:** Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs
- **Repository:** npm workspaces with `client/` and `server/`

## Features

### Shopping

- 190-product catalog across 13 categories with 10–15 products in every category, seeded from `server/src/data/products.js`
- Verified real product photography: every image URL is checked with `npm run verify:images` before it reaches the database
- Amazon-style homepage with hero carousel, category browsing, service strip, product carousels, Prime-style promotion, and deal sections
- Product search across title, description, category, brand, and features
- URL-backed category, brand, price, rating, stock, discount, deal, Prime-style, featured, and bestseller filters
- Featured, newest, price, rating, best-seller, and biggest-discount sorting
- Backend pagination with result ranges and numbered pages
- Product detail pages with multiple images, thumbnails, zoom interaction, specifications, stock, delivery information, wishlist, and comparison controls
- Deterministic related, similar, frequently-bought-together, and recently-viewed sections
- Dedicated `/deals` page with a functional countdown
- Product comparison table at `/compare` (up to four products)
- Wishlist page at `/wishlist` with guest localStorage and authenticated MongoDB persistence

### Cart

- Add to cart from cards and product details
- Quantity updates with stock validation
- Remove items
- Save for later and move saved items back to cart
- Move cart items to the wishlist
- Unavailable-item reporting
- Frequently-bought-together suggestions
- Subtotal, shipping, tax, coupon discount, total, and estimated savings
- Guest-to-account cart migration

### Authentication and account

- Registration, login, logout, and protected routes
- Password hashing with bcrypt
- Account dashboard with commerce-focused sections
- Profile editing and password changes
- Saved address CRUD with default-address selection
- Account wishlist, order, buy-again, review, coupon, notification, and recently-viewed sections
- Notification menu and full notification page with unread counts

### Reviews

- Authenticated purchase eligibility check
- Create, edit, and delete owned reviews
- 1–5 star ratings, titles, comments, verified-purchase indicators
- Average rating, distribution bars, and sorting
- Helpful-count field ready for future voting enhancements

### Checkout

- Saved-address selection and new-address form
- Standard, priority, and express delivery options
- Card, PayPal, and gift-card payment selection
- Realistic simulated payment step; no card is charged
- Coupon validation and server-authoritative discount calculation
- Address, delivery, payment, and review steps
- Order summary and idempotent client request ID

### Orders

- MongoDB order persistence
- Order history and order detail pages
- Order number, date, items, totals, shipping address, payment method, estimated delivery, and tracking number
- Five-stage tracking timeline: order placed, processing, shipped, out for delivery, delivered
- Buy Again from order history, order detail, and account dashboard
- Order-placed and status notifications

### UI/UX

- Responsive Amazon-inspired header with search suggestions and recent searches
- Delivery location selector, language menu, account menu, wishlist shortcut, notifications, and cart subtotal
- Side navigation drawer with keyboard focus trapping and Escape handling
- Product badges, polished product cards, hover states, and wishlist/compare actions
- Skeleton loading states for major shopping surfaces
- Empty, error, retry, and no-results states
- Visible keyboard focus, semantic landmarks, labels, alt text, and accessible controls
- Dynamic page titles, descriptions, canonical links, and Open Graph defaults
- Admin workspace: collapsible sidebar, mobile drawer with focus trapping, dense responsive tables, accessible dialogs, Recharts dashboards, and lazy-loaded admin routes

## Administration

The application includes a separate Amazon-inspired operations workspace for authorized staff. It shares the same database as the storefront, so every admin change is immediately visible to customers.

### Admin access

- Admin URL: `/admin/login`
- Admin dashboard: `/admin/dashboard`
- Admin sessions use a separate scoped JWT (`type: "admin"`), stored separately from the customer session.
- `/api/admin/*` is protected by `protect` + `requireAdmin`; customers receive `403`, missing sessions receive `401`.
- The customer UI is unchanged and remains reachable at `/`, `/deals`, `/cart`, `/account`, and the rest of the storefront.
- Signing out, suspending, demoting, or deleting an account bumps `tokenVersion`, which immediately invalidates issued tokens.
- The last active administrator cannot be demoted or deactivated, and admins cannot suspend or demote themselves.

### Admin workspace

| Area | Routes | Capabilities |
| --- | --- | --- |
| Dashboard | `/admin/dashboard` | Revenue (total/today/week/month), order status counts, customers, products, reviews, low stock, active deals, recent orders, date presets and custom ranges |
| Analytics | `/admin/analytics` | Revenue and order timelines, top products, sales by category and brand, status distribution, new customers, units sold, average order value |
| Products | `/admin/products` | Create, edit, activate/deactivate, delete, bulk activate/deactivate/delete/stock, filters, sorting, pagination |
| Categories | `/admin/categories` | Create, edit, activate/deactivate, delete with product-count protection, rename cascades to products |
| Brands | `/admin/brands` | Create, edit, activate/deactivate, delete with product-count protection |
| Orders | `/admin/orders` | Search, filter, sort, paginate, order detail, status timeline, cancel with inventory restore |
| Customers | `/admin/users` | Search, role/status filters, order count, total spend, addresses, orders, reviews, wishlist, suspend/reactivate, role changes |
| Reviews | `/admin/reviews` | Search, rating/status/product filters, approve, hide, delete, live product rating recalculation |
| Coupons | `/admin/coupons` | Percentage, fixed, and free-shipping offers with start/expiry dates, usage limits, per-user limits, minimum order, maximum discount |
| Deals | `/admin/deals` | Time-bound deals with product selection, overlap protection, and automatic customer deal pricing |
| Inventory | `/admin/inventory` | Stock and low-stock thresholds, low-stock alerts |
| Notifications | `/admin/notifications` | Low stock, expiring coupon/deal, moderation, and registration alerts with read state |
| Search | `/admin/search` | Typed results across products, orders, customers, coupons, categories, and brands |
| Settings | `/admin/settings` | Store identity, shipping/tax defaults, low-stock default, alert preferences |

Customer/admin consistency is enforced on the server:

- An admin-created product is immediately visible to customers, and deactivating it hides it from the storefront.
- Product stock is decremented at checkout and restored once when an admin cancels an order.
- Order status changes made by an admin appear on the customer order and tracking pages.
- Coupons created by an admin are redeemable at customer checkout, subject to start date, expiry, minimum order, usage limit, and per-user limit.
- Deals created by an admin appear on the customer deals page and revert pricing when the deal ends or is removed.
- Review moderation changes customer-visible reviews and recalculates the product rating.

### Revenue and analytics rules

- Revenue includes non-cancelled orders created in the selected range, excluding `Failed` and `Refunded` payment states.
- Revenue uses the persisted order total, so coupons, shipping, and tax are reflected exactly as charged.
- Date ranges (`today`, `yesterday`, `last7days`, `30d`, `thismonth`, `lastmonth`, `thisyear`, `90d`, and a validated custom range) are parsed and aggregated on the server.
- Charts are rendered with Recharts from MongoDB aggregation output; no random or client-side sample data is used.

### Admin API groups

All routes below require an authenticated admin token:

- `/api/admin/auth/login`, `/api/admin/auth/me`, `/api/admin/auth/logout`
- `/api/admin/dashboard`
- `/api/admin/analytics`, `/api/admin/analytics/revenue`, `/orders`, `/products`, `/categories`, `/brands`, `/customers`
- `/api/admin/products` (+ `/bulk`, `/:id/status`)
- `/api/admin/categories`, `/api/admin/brands`
- `/api/admin/orders` (+ `/:id/status`)
- `/api/admin/users` (+ `/:id/status`, `/:id/role`)
- `/api/admin/reviews` (+ `/:id` moderation, `/:id` delete)
- `/api/admin/coupons`, `/api/admin/deals`
- `/api/admin/inventory` (+ `/:id`)
- `/api/admin/notifications` (+ `/:id/read`, `/read-all`)
- `/api/admin/search`
- `/api/admin/settings`

List endpoints accept `page`, `limit`, `search`, and resource-specific filters and return `{ success, data, meta: { page, limit, total, pages } }`. Mutations validate every field on the server, use allowlisted inputs, and never accept raw `req.body` passthrough.

### Create an admin safely

Run this once from the repository root (or from `server/`):

```bash
npm run seed:admin
```

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are not set, the command asks for them:

```text
Amazon Clone - administrator account setup
------------------------------------------
No ADMIN_EMAIL / ADMIN_PASSWORD found, so this wizard will ask for them.
Nothing is saved until both password entries match.

Administrator name [Administrator]: Operations Administrator
Administrator email: you@example.com
Password (12+ characters): ********
Confirm password: ********

Administrator you@example.com was created.

Next steps
  1. Start the app:      npm run dev
  2. Open admin sign in: http://localhost:5173/admin/login
```

The password is read without echo, hashed with bcrypt, and stored with the `admin` role. Re-running the command resets the password and revokes every issued admin session. To run it without prompts, set the variables first:

```powershell
$env:ADMIN_NAME = "Operations Administrator"
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "a-long-random-password"
npm run seed:admin
```

The same three variables can live in `server/.env`. Admin credentials never belong in the frontend or in this README.

---

## Architecture

```text
.
├── client/
│   ├── src/
│   │   ├── components/       # Storefront components
│   │   │   └── admin/        # Admin layout, tables, modals, charts
│   │   ├── context/          # Customer auth/cart state and admin session
│   │   ├── data/             # Demo fallback catalog
│   │   ├── pages/            # Storefront pages and Admin*.jsx admin pages
│   │   ├── services/         # Axios customer and admin API clients
│   │   ├── utils/            # Formatting and SEO helpers
│   │   ├── App.jsx           # Route table, protected boundaries, admin code splitting
│   │   └── styles.css        # Amazon-style tokens, storefront and admin CSS
│   └── vercel.json           # SPA history rewrites
├── server/
│   ├── api/                # Optional Vercel Node-function entry
│   └── src/
│       ├── config/           # Environment and MongoDB connection
│       ├── controllers/      # Customer + admin* controllers
│       ├── data/             # Seed catalog and memory fallback
│       ├── middleware/       # JWT protect/requireAdmin, errors, security headers
│       ├── models/           # Mongoose schemas incl. Category, Brand, Deal, Setting
│       ├── routes/           # REST modules incl. adminRoutes.js
│       ├── services/         # Taxonomy and deal-state services
│       ├── utils/            # Pricing, tokens, async, and validation helpers
│       ├── seed.js           # Product and coupon seeding
│       ├── seedAdmin.js      # Environment-driven admin upsert
│       ├── smokeTest.js      # Customer commerce smoke test
│       └── adminSmokeTest.js # Admin + integration smoke test
├── .agent-logs/              # Automatically captured assignment exchanges
└── agent.md                  # Assignment requirements and QA checklist
```

### Request flow

1. The React client calls the Axios service layer (`api` for the storefront, `adminClient` for `/api/admin`).
2. Express middleware applies CORS, security headers, body limits, and rate limits.
3. Protected routes verify the JWT and load the user; admin routes additionally require the `admin` role and an active account.
4. Controllers use Mongoose when MongoDB is connected and a deterministic in-memory fallback otherwise.
5. The client context providers keep authentication, cart, wishlist, recently viewed, comparison, and notification state synchronized.

## API overview

All routes are prefixed with `/api`.

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `PATCH /auth/profile`
- `PATCH /auth/password`

### Products and discovery

- `GET /products`
- `GET /products/facets`
- `GET /products/:id`
- `GET /products/:id/recommendations`
- `POST /products` (legacy operations endpoint requiring `PRODUCT_ADMIN_TOKEN`; normal catalog management uses `POST /api/admin/products`)

### Cart

- `GET /cart`
- `POST /cart`
- `POST /cart/merge`
- `PATCH /cart/:itemId`
- `DELETE /cart/:itemId`
- `DELETE /cart`
- `POST /cart/:itemId/save-for-later`
- `POST /cart/:itemId/move-to-wishlist`
- `POST /cart/saved/:itemId/move-to-cart`
- `DELETE /cart/saved/:itemId`

### Wishlist

- `GET /wishlist`
- `POST /wishlist`
- `DELETE /wishlist`
- `DELETE /wishlist/:productId`
- `POST /wishlist/:productId/move-to-cart`

### Addresses and coupons

- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/:addressId`
- `DELETE /addresses/:addressId`
- `POST /addresses/:addressId/default`
- `GET /coupons`
- `POST /coupons/validate`

### Reviews and notifications

- `GET /products/:id/reviews`
- `POST /products/:id/reviews`
- `PATCH /products/:id/reviews/:reviewId`
- `DELETE /products/:id/reviews/:reviewId`
- `GET /reviews/mine`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

### Orders

- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status` (legacy operations endpoint; requires the `x-order-status-token` header. Normal status changes are made in `/admin/orders` or by customer support workflows.)

### Administration

Admin routes are prefixed with `/api/admin`, require a scoped admin JWT, and are documented in the [Administration](#administration) section.

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB 6+ locally, or MongoDB Atlas

### Clone and install

```bash
git clone https://github.com/ITZ-HURAIRAH18/8x-Amazon-Clone.git
cd 8x-Amazon-Clone
npm install
```

The root install configures both workspaces. To install each workspace explicitly:

```bash
npm install --workspace client
npm install --workspace server
```

### Environment

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Set `MONGODB_URI` in `server/.env`. The server accepts both `MONGODB_URI` and the legacy `MONGO_URI` name. Set a long random `JWT_SECRET` before deploying. Never commit `.env` files or database credentials.

Admin seed variables are optional until an administrator is needed:

```dotenv
ADMIN_NAME=Operations Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-random-password
```

Run `npm run seed:admin` explicitly; it prompts for the administrator name, email, and password when they are not already in `server/.env`. The optional `ORDER_STATUS_TOKEN` and `PRODUCT_ADMIN_TOKEN` variables are reserved for explicitly documented emergency operations paths; normal administration uses the admin role.

For Atlas SRV records in restricted networks, configure:

```dotenv
MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1,8.8.4.4
```

### Database and seed

```bash
npm run seed
npm run seed:coupons
```

`npm run seed` replaces the product catalog with the checked-in demo catalog (190 products across 13 categories, 10–15 per category) and rebuilds matching category and brand records (existing deals are removed because seeded products receive new identifiers). `npm run seed:coupons` upserts `SAVE10`, `WELCOME5`, and `FREESHIP` without deleting products. `npm run seed:admin` creates or updates the administrator account from `ADMIN_*` variables.

To confirm that no product image is broken, verify the image pool against Unsplash before seeding:

```bash
npm run verify:images
```

### Run locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

Run the root `npm run dev` command only once. It starts both the client and backend; do not also run `npm run dev --workspace server` in another terminal. If you run the backend alone, use that workspace command by itself. If you change the backend port, update both `server/.env` (`PORT`) and `client/.env` (`VITE_API_URL`).

If MongoDB is unavailable in development, the API remains usable with demo catalog data and in-memory account/commerce state. Production mode fails closed instead of silently using demo data.

### Production build

```bash
npm run build
npm start
```

## Deployment

### Live URLs for this project

| | URL |
| --- | --- |
| Frontend (Vercel) | `https://amazon-clone-client-five.vercel.app` |
| Backend API (Vercel) | `https://8x-amazon-clone-server.vercel.app/api` |
| Admin sign in | `https://amazon-clone-client-five.vercel.app/admin/login` |
| Health check | `https://8x-amazon-clone-server.vercel.app/api/health` |

The frontend and the backend are two separate Vercel projects. The frontend is a static Vite build that reads `VITE_API_URL` at build time; the backend is an Express API exposed as a Vercel Function. `error.md` in the repository root records these two deployed domains.

```bash
npm run verify:deploy -- --api=https://8x-amazon-clone-server.vercel.app --client=https://amazon-clone-client-five.vercel.app
```

This prints a pass/fail line for the backend health endpoint, the MongoDB connection, the admin API, CORS for the frontend origin, the SPA route, and the API base URL baked into the deployed bundle. See [Diagnose a deployment](#diagnose-a-deployment-with-one-command) for interpreting the output.

### Frontend

Deploy the `client/` directory as a Vite application. For Vercel, set **Root Directory** to `client`, keep the Vite framework preset, and set:

```dotenv
VITE_API_URL=https://8x-amazon-clone-server.vercel.app/api
```

`client/vercel.json` rewrites client-side routes to `index.html` while leaving API calls on the separately configured backend origin. `VITE_API_URL` is baked into the bundle at build time, so changing it requires a new deployment.

### Backend

For a Vercel backend project, use a separate project from the frontend and set:

- **Root Directory:** `server` (recommended), or leave it empty to use the repository-root `vercel.json`
- **Framework Preset:** Other
- **Install Command:** `npm install`
- **Build Command:** leave blank
- **Output Directory:** leave blank

Do not set the backend project's Root Directory to `client`. The checked-in `server/vercel.json` and root `vercel.json` expose the Express API as a Vercel Function and route `/api/*` requests to it.

Set these environment variables in the backend Vercel project:

- `MONGODB_URI` set to the Atlas connection string
- `JWT_SECRET` set to a long random secret
- `CLIENT_URL` set to the deployed frontend origin, for example `https://amazon-clone-client-five.vercel.app`
- `NODE_ENV=production`
- `MONGO_DNS_SERVERS` optionally set to `8.8.8.8,1.1.1.1,8.8.4.4`
- `ORDER_STATUS_TOKEN` and `PRODUCT_ADMIN_TOKEN` only if the legacy operations endpoints are used
- `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` only when running `npm run seed:admin`

After changing the Vercel project settings or environment variables, create a new deployment. Existing deployments are not rebuilt automatically. The backend must be reachable at a separate HTTPS `/api` origin. Do not point `VITE_API_URL` at the frontend's `/api` path; SPA rewrites will return HTML or 404 instead of JSON. Verify the deployed pair explicitly:

```text
GET https://8x-amazon-clone-server.vercel.app/api/health
→ { "data": { "status": "ok", "database": "connected" } }
```

The public frontend may be deployed independently, but authentication, carts, checkout, and orders are only fully live after the backend origin and its environment variables are configured.

### Diagnose a deployment with one command

```bash
npm run verify:deploy -- --api=https://<backend-domain> --client=https://<frontend-domain>
```

The check prints a pass/fail line for the backend health endpoint, the MongoDB connection, the admin API, CORS for the frontend origin, the SPA route, and the API base URL baked into the deployed bundle. It exits with code 1 on failure and prints the remediation steps.

A typical report looks like this:

```text
PASS Frontend API base URL
     Bundle targets https://api.example.com (normalized to https://api.example.com/api).
FAIL Backend /api/health
     HTTP 404 (text/plain). The page could not be found
```

That combination means the frontend is configured correctly but the backend domain is not serving the API. A plain-text `404` (rather than an HTML login page) means no serverless function matched the request, which happens when the deployment lacks a function at `api/index.js`.

### Admin in production

1. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` on the backend host (Render, Vercel, or a `.env` file) and run `npm run seed:admin` once with the same values.
2. Confirm the deployment protection on the backend is disabled for API traffic, otherwise `/api/admin/*` returns a Vercel login page instead of JSON.
3. Add the deployed frontend origin to `CLIENT_URL` so CORS allows the admin client.
4. Sign in at `https://amazon-clone-client-five.vercel.app/admin/login`, confirm the dashboard loads, then sign out and confirm the token is revoked.
5. Rotate the administrator password by re-running the seed command; every issued admin token is invalidated.

### Vercel backend layout

The repository keeps `api/index.js` at the root so Vercel detects a Node function, and `vercel.json` rewrites every path to it:

```json
{
  "functions": { "api/index.js": { "maxDuration": 30 } },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/api/index" }
  ]
}
```

If the backend domain answers `404` for `/api/health`, the deployment was built without that function. Two supported layouts are included:

| Vercel project root directory | Function | Configuration |
| --- | --- | --- |
| Repository root | `api/index.js` | `vercel.json` |
| `server/` | `server/api/index.js` | `server/vercel.json` |

Redeploy the backend project with the matching root directory and backend environment variables, then re-run `npm run verify:deploy`.

## Local smoke test

With the API running and MongoDB available, run the authenticated API smoke test:

```bash
npm run smoke
```

It creates a temporary user, exercises search, wishlist, saved-cart behavior, coupons, checkout order creation, reviews, and notifications, then removes the temporary MongoDB records and restores stock. Override the target with `SMOKE_API_URL` when needed.

### Admin smoke test

The admin suite verifies the real admin and customer/admin integration paths against the running API:

```bash
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="your-seeding-password"
npm run smoke:admin
```

It checks admin sign-in and logout, 401/403 enforcement, dashboard and analytics aggregations, product create/update/deactivate/bulk-delete, storefront visibility, category and brand guards, checkout with an admin coupon, inventory decrement and restore on cancellation, order status visibility for customers, deal creation and removal, review moderation visibility, customer suspension and session invalidation, notifications, admin search, and settings. Temporary records are removed and stock is restored afterwards.

## Recommended Demo Flow

1. Open the homepage and browse a category rail.
2. Search for a product and apply brand, rating, price, or availability filters.
3. Change sort order and move through pagination.
4. Open a product, zoom the gallery, and inspect specifications.
5. Save the product to the wishlist and add it to the comparison table.
6. Add it to the cart, change quantity, and save another item for later.
7. Register or log in and confirm the guest cart/wishlist merge.
8. Open Checkout, select or add a saved address, and choose delivery.
9. Apply `SAVE10`, `WELCOME5`, or `FREESHIP` when eligible.
10. Select a simulated payment method and place the order.
11. Verify the order in MongoDB and open order history.
12. Open the five-stage tracking timeline.
13. Use Buy Again.
14. Leave a verified review for the purchased product.
15. Open the wishlist, notifications, and account sections.
16. Test the layout at mobile, tablet, and desktop widths.
17. Log out and log back in to verify persistence.
18. Sign in at `/admin/login` and review the dashboard, analytics, and the order created above.
19. Create a product, coupon, and deal in the admin workspace, then confirm each one on the storefront.
20. Change the order status in admin and confirm the customer order page updates.

## Known limitations

- Payment is intentionally simulated; no real payment gateway or card vault is connected.
- Shipping labels and carrier tracking are simulated; tracking numbers are assignment data.
- Recommendations are deterministic same-category/same-brand logic, not machine learning.
- Product photography uses reliable external demo image URLs and may require replacement with a production image CDN.
- The local development fallback is not a production persistence strategy.
- JWTs are currently stored in browser localStorage for the SPA; an HttpOnly-cookie/session hardening pass is recommended before a high-security production launch.
- The optional order-status and product-admin operations tokens are legacy emergency paths; normal administration uses role-protected admin accounts.
- Admin sessions also use browser storage for the SPA token; adopt HttpOnly cookies before a high-security production launch.
- Seller marketplace tools, fulfillment operations, taxes by jurisdiction, and advanced fraud detection are outside this assignment.

## Quality and capture records

The project includes responsive states, visible focus styles, keyboard-accessible drawer behavior, loading/empty/error states, and the automatic agent capture setup required by the assignment. Raw root-session prompts and final responses are stored in `.agent-logs/`; the directory is intentionally tracked and is not ignored.

### Files in this repository

| File | Purpose |
| --- | --- |
| `README.md` | This document: setup, features, API, deployment |
| `agent.md` | The assignment requirements and QA checklist |
| `VIDEO_PRESENTATION_GUIDE.md` | Scene-by-scene script for the demo video |
| `error.md` | The deployed frontend and backend domains |
| `CAPTURE-TEST.md` | Capture test evidence required by the assignment |
| `.agent-logs/` | Recorded work sessions |
