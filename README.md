# Amazon Clone

## Overview

Amazon Clone is a high-fidelity MERN e-commerce application inspired by Amazon's browsing experience. It combines a dense, responsive storefront with real REST APIs, MongoDB persistence, JWT authentication, guest and account carts, saved addresses, coupons, wishlist, reviews, checkout, order tracking, and reorder functionality.

The project is intentionally a functional commerce demo rather than a claim of Amazon's real backend. Product data is seeded, payment is simulated, and recommendations are deterministic rather than machine-learned.

## Stack

- **Frontend:** React 18, Vite, React Router, Axios, Lucide React, structured CSS
- **Backend:** Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs
- **Repository:** npm workspaces with `client/` and `server/`

## Features

### Shopping

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

## Administration

The application includes a separate Amazon-inspired operations workspace for authorized staff.

### Admin access

- Admin URL: `/admin/login`
- Admin dashboard: `/admin/dashboard`
- Admin sessions use a separate scoped JWT and require the `admin` role.
- Customer accounts are redirected to a proper 403 page when they attempt to open admin routes.
- Admin API routes are protected by authentication and role middleware.

### Admin workspace

- Live revenue, order, customer, product, review, and inventory metrics
- Date presets and custom analytics ranges
- Revenue, order, category, brand, and customer charts backed by MongoDB aggregations
- Product CRUD, archival, status changes, bulk actions, and inventory thresholds
- Category and brand CRUD with product-count deletion protection
- Order search, filtering, sorting, detail view, and status timeline updates
- Customer search, account status, order history, reviews, wishlist summary, and spending
- Review moderation with customer-visible status integration
- Coupon CRUD with percentage, fixed, and shipping discounts
- Deal CRUD with product selection and active dates
- Inventory and low-stock management
- Admin notifications, global search, settings, responsive tables, accessible modals, and mobile navigation

### Admin API groups

All routes below require an authenticated admin token:

- `/api/admin/dashboard`
- `/api/admin/analytics/*`
- `/api/admin/products/*`
- `/api/admin/categories/*`
- `/api/admin/brands/*`
- `/api/admin/orders/*`
- `/api/admin/users/*`
- `/api/admin/reviews/*`
- `/api/admin/coupons/*`
- `/api/admin/deals/*`
- `/api/admin/inventory/*`
- `/api/admin/notifications/*`
- `/api/admin/search`
- `/api/admin/settings`

### Create an admin safely

Admin credentials are never stored in the frontend or README. Set these server environment variables and run the explicit seed command:

```env
ADMIN_NAME=Operations Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-random-password
```

```bash
npm run seed:admin
```

The seed command hashes the password and upserts the admin role. Use a unique development credential and rotate it through the account/security flow after signing in.

---

## Architecture

```text
.
├── client/
│   ├── src/
│   │   ├── components/       # Header, cards, carousels, footer, drawer
│   │   ├── context/          # Auth, cart, wishlist, memory, notifications
│   │   ├── data/             # Demo fallback catalog
│   │   ├── pages/            # Storefront, account, checkout, orders
│   │   ├── services/         # Axios API client
│   │   ├── utils/            # Formatting and SEO helpers
│   │   ├── App.jsx           # Route table and protected boundaries
│   │   └── styles.css        # Amazon-style tokens and responsive CSS
│   └── vercel.json           # SPA history rewrites
├── server/
│   ├── api/                # Optional Vercel Node-function entry
│   └── src/
│       ├── config/           # Environment and MongoDB connection
│       ├── controllers/      # Auth, products, cart, orders, reviews, etc.
│       ├── data/             # Seed catalog and memory fallback
│       ├── middleware/       # JWT protection, errors, security headers
│       ├── models/           # Mongoose schemas
│       ├── routes/           # REST route modules
│       ├── seed.js           # Product and coupon seeding
│       └── utils/            # Pricing and async helpers
├── .agent-logs/              # Automatically captured assignment exchanges
└── agent.md                  # Assignment requirements and QA checklist
```

### Request flow

1. The React client calls the Axios service layer.
2. Express middleware applies CORS, security headers, body limits, and rate limits.
3. Protected routes verify the JWT and load the user.
4. Controllers use Mongoose when MongoDB is connected and a deterministic in-memory fallback otherwise.
5. The client context providers keep authentication, cart, wishlist, recently viewed, comparison, and notification state synchronized.

## API overview

All routes are prefixed with `/api`.

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PATCH /auth/profile`
- `PATCH /auth/password`

### Products and discovery

- `GET /products`
- `GET /products/facets`
- `GET /products/:id`
- `GET /products/:id/recommendations`
- `POST /products` (authenticated operations endpoint; requires `PRODUCT_ADMIN_TOKEN`)

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
- `PATCH /orders/:id/status` (requires `ORDER_STATUS_TOKEN`)

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

For Atlas SRV records in restricted networks, configure:

```dotenv
MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1,8.8.4.4
```

### Database and seed

```bash
npm run seed
npm run seed:coupons
```

`npm run seed` replaces the product catalog with the checked-in demo catalog. `npm run seed:coupons` upserts `SAVE10`, `WELCOME5`, and `FREESHIP` without deleting products.

### Run locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

If MongoDB is unavailable in development, the API remains usable with demo catalog data and in-memory account/commerce state. Production mode fails closed instead of silently using demo data.

### Production build

```bash
npm run build
npm start
```

## Deployment

### Frontend

Deploy the `client/` directory as a Vite application. Set:

```dotenv
VITE_API_URL=https://<backend-domain>/api
```

`client/vercel.json` rewrites client-side routes to `index.html` while leaving API calls on the separately configured backend origin. A root `vercel.json` is also included for deploying the Express API as a Vercel Node function through `server/api/index.js`.

### Backend

Deploy `server/` as a Node service with:

- `PORT` set by the host or left at the provider default
- `MONGODB_URI` set to the Atlas connection string
- `JWT_SECRET` set to a long random secret
- `CLIENT_URL` set to the deployed frontend origin
- `NODE_ENV=production`
- `ORDER_STATUS_TOKEN` set if status updates will be operated manually

The backend must be reachable at a separate HTTPS `/api` origin. Do not point `VITE_API_URL` at the frontend's `/api` path; SPA rewrites will return HTML or 404 instead of JSON. Verify the deployed pair explicitly:

```text
GET https://<backend-domain>/api/health
→ { "data": { "status": "ok", "database": "connected" } }
```

The public frontend may be deployed independently, but authentication, carts, checkout, and orders are only fully live after the backend origin and its environment variables are configured.

## Local smoke test

With the API running and MongoDB available, run the authenticated API smoke test:

```bash
npm run smoke
```

It creates a temporary user, exercises search, wishlist, saved-cart behavior, coupons, checkout order creation, reviews, and notifications, then removes the temporary MongoDB records and restores stock. Override the target with `SMOKE_API_URL` when needed.

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

## Known limitations

- Payment is intentionally simulated; no real payment gateway or card vault is connected.
- Shipping labels and carrier tracking are simulated; tracking numbers are assignment data.
- Recommendations are deterministic same-category/same-brand logic, not machine learning.
- Product photography uses reliable external demo image URLs and may require replacement with a production image CDN.
- The local development fallback is not a production persistence strategy.
- JWTs are currently stored in browser localStorage for the SPA; an HttpOnly-cookie/session hardening pass is recommended before a high-security production launch.
- The optional order-status mutation endpoint requires an operations token and is not exposed in the customer UI.
- Seller marketplace tools, fulfillment operations, taxes by jurisdiction, and advanced fraud detection are outside this assignment.

## Quality and capture records

The project includes responsive states, visible focus styles, keyboard-accessible drawer behavior, loading/empty/error states, and the automatic agent capture setup required by the assignment. Raw root-session prompts and final responses are stored in `.agent-logs/`; the directory is intentionally tracked and is not ignored.
