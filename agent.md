# AMAZON CLONE — COMPLETE ADMIN DASHBOARD + PRODUCTION ENHANCEMENT

You are working on my existing MERN Amazon clone.

## CRITICAL INSTRUCTION

DO NOT rebuild the project from scratch.

DO NOT remove, replace, or break existing working customer functionality.

First inspect the entire existing repository and understand:

* frontend architecture
* backend architecture
* MongoDB/Mongoose models
* authentication
* current API routes
* customer account system
* products
* categories
* brands
* cart
* wishlist
* reviews
* coupons
* deals
* notifications
* orders
* addresses
* checkout
* recently viewed
* recommendations
* existing deployment configuration
* `.agent-logs/`
* `CAPTURE-TEST.md`
* `README.md`

Preserve all existing functionality.

The goal is to **enhance the existing application into a complete, professional Amazon-style e-commerce platform with a real admin dashboard and complete documentation.**

---

# 1. PRIMARY OBJECTIVE

The current application has a customer account dashboard but does NOT have a proper administration system.

Build a complete:

# ADMIN DASHBOARD

The admin dashboard must follow the same Amazon visual language as the customer application.

It must NOT look like a generic Bootstrap/admin-template dashboard.

Use:

* Amazon-inspired dark navigation
* `#131921`
* `#232F3E`
* `#FF9900`
* `#FEBD69`
* `#FFD814`
* `#FFFFFF`
* `#E3E6E6`
* `#0F1111`
* Amazon-style typography
* dense professional layouts
* compact cards
* subtle borders
* minimal rounded corners
* professional tables
* responsive layouts

Do NOT use emojis.

Do NOT create an AI-looking dashboard.

Do NOT use excessive gradients.

Do NOT use giant rounded cards.

Do NOT use excessive glassmorphism.

Do NOT use random colors.

The result should feel like a serious production e-commerce administration system.

---

# 2. ADMIN AUTHENTICATION

Implement proper admin authentication.

Create:

* Admin login
* Admin logout
* Admin session/token handling
* Admin role
* Protected admin routes
* Admin middleware
* Unauthorized handling
* Forbidden handling

Roles should support at minimum:

```text
customer
admin
```

If the current user model already supports roles, extend it instead of creating a conflicting authentication system.

Admin APIs must NEVER be accessible simply by knowing the API URL.

Every sensitive admin endpoint must verify:

1. authenticated user
2. valid token/session
3. admin role

Example:

```text
/customer
/admin
```

Customer users must not be able to access:

```text
/admin
/api/admin/*
```

---

# 3. ADMIN ROUTING

Create a professional admin route structure.

Example:

```text
/admin
/admin/login
/admin/dashboard
/admin/products
/admin/products/new
/admin/products/:id/edit
/admin/categories
/admin/brands
/admin/orders
/admin/orders/:id
/admin/users
/admin/users/:id
/admin/reviews
/admin/coupons
/admin/deals
/admin/inventory
/admin/analytics
/admin/notifications
/admin/settings
```

Use protected React routes.

Unauthenticated users should be redirected to:

```text
/admin/login
```

Authenticated non-admin users should receive a proper:

```text
403 Forbidden
```

page.

---

# 4. ADMIN LAYOUT

Create a dedicated reusable AdminLayout.

Desktop:

```text
----------------------------------------------------
| AMAZON ADMIN HEADER                              |
----------------------------------------------------
| SIDEBAR          | MAIN CONTENT                  |
|                  |                               |
| Dashboard        |                               |
| Products         |                               |
| Categories       |                               |
| Brands           |                               |
| Orders           |                               |
| Customers        |                               |
| Reviews          |                               |
| Coupons          |                               |
| Deals            |                               |
| Inventory        |                               |
| Analytics        |                               |
| Notifications    |                               |
| Settings         |                               |
----------------------------------------------------
```

Header should include:

* Amazon-style branding
* Admin indicator
* search/admin search if useful
* notifications
* profile menu
* logout
* responsive mobile menu

Sidebar should support:

* active route highlighting
* collapsible behavior
* mobile drawer
* icons
* labels
* badges for pending orders/reviews if applicable

Do NOT duplicate sidebar code across pages.

Create reusable components.

---

# 5. ADMIN DASHBOARD OVERVIEW

Create `/admin/dashboard`.

This must be a real business dashboard, not placeholder cards.

Display:

### Revenue

* Total revenue
* Today's revenue
* This week's revenue
* This month's revenue

### Orders

* Total orders
* Pending orders
* Processing orders
* Shipped orders
* Delivered orders
* Cancelled orders

### Customers

* Total customers
* New customers
* Active customers

### Products

* Total products
* Active products
* Out-of-stock products
* Low-stock products

### Reviews

* Total reviews
* Pending/moderation reviews
* Average rating

### Sales

Show charts for:

* revenue over time
* orders over time
* sales by category
* sales by brand
* order status distribution

Use Recharts or the existing chart library.

Charts must use real MongoDB data.

DO NOT generate fake random analytics.

---

# 6. DASHBOARD DATE FILTER

Allow:

```text
Today
Yesterday
Last 7 days
Last 30 days
This month
Last month
This year
Custom range
```

Changing the range must update the analytics.

Backend should perform the aggregation.

Do not download all orders into React and calculate everything inefficiently on the frontend.

Use MongoDB aggregation pipelines.

---

# 7. REVENUE ANALYTICS

Create backend analytics endpoints.

Example:

```text
GET /api/admin/analytics/overview
GET /api/admin/analytics/revenue
GET /api/admin/analytics/orders
GET /api/admin/analytics/products
GET /api/admin/analytics/categories
GET /api/admin/analytics/customers
```

Return actual database information.

Revenue calculations must be based on valid orders.

Clearly handle:

* cancelled orders
* refunded orders if supported
* pending orders
* completed orders

Document the exact revenue calculation logic.

---

# 8. PRODUCT MANAGEMENT

Create a complete admin product management system.

Page:

```text
/admin/products
```

Features:

* product list
* search
* filtering
* sorting
* pagination
* create product
* edit product
* delete product
* activate/deactivate product
* stock management
* price management
* discount management
* brand
* category
* product images
* ratings
* bestseller flag
* featured flag
* deal flag

Product table should show:

```text
Image
Product
SKU/ID
Category
Brand
Price
Discount
Stock
Rating
Status
Actions
```

Actions:

```text
View
Edit
Delete
Change status
```

Use confirmation dialogs for destructive actions.

---

# 9. PRODUCT CREATION FORM

Create a professional product form.

Fields:

```text
Title
Description
Price
Original Price
Discount
Category
Brand
Images
Stock
SKU
Rating
Featured
Bestseller
Deal
Specifications
Features
```

Validate both:

### Frontend

and

### Backend

Never trust frontend validation alone.

Handle:

* missing fields
* invalid prices
* negative stock
* invalid image URLs
* duplicate SKU if SKU exists
* invalid category
* invalid brand

Show clear validation messages.

---

# 10. CATEGORY MANAGEMENT

Create:

```text
/admin/categories
```

Features:

* list categories
* create category
* edit category
* delete category
* activate/deactivate category
* product count per category

Display:

```text
Category
Products
Status
Created
Actions
```

Prevent deletion if the category is still required by products, or provide a safe reassignment flow.

---

# 11. BRAND MANAGEMENT

Create:

```text
/admin/brands
```

Features:

* create
* edit
* delete
* activate/deactivate
* search
* product count

Make brand filtering work consistently with the customer product search.

---

# 12. ORDER MANAGEMENT

Create:

```text
/admin/orders
```

This is one of the most important admin pages.

Display:

```text
Order ID
Customer
Date
Items
Total
Payment
Status
Actions
```

Filters:

```text
All
Pending
Processing
Shipped
Delivered
Cancelled
```

Search by:

* order ID
* customer name
* customer email

Sorting:

* newest
* oldest
* highest total
* lowest total

Pagination required.

---

# 13. ADMIN ORDER DETAILS

Create:

```text
/admin/orders/:id
```

Show:

### Customer

* name
* email
* phone if available

### Shipping address

### Products

* image
* title
* quantity
* price
* subtotal

### Payment

* method
* status
* transaction information if available

### Order totals

```text
Subtotal
Discount
Shipping
Tax
Grand Total
```

### Order timeline

```text
Order Placed
Processing
Shipped
Out for Delivery
Delivered
```

Admin should be able to update the order status.

Prevent invalid status transitions where appropriate.

---

# 14. CUSTOMER MANAGEMENT

Create:

```text
/admin/users
```

Display:

```text
Name
Email
Role
Orders
Total Spent
Joined
Status
Actions
```

Features:

* search
* filtering
* pagination
* view customer
* activate/deactivate customer
* view customer orders
* view customer reviews
* view customer wishlist if available

Do NOT expose passwords or sensitive authentication information.

---

# 15. CUSTOMER DETAILS

Create:

```text
/admin/users/:id
```

Show:

* profile
* account creation date
* order count
* total spending
* recent orders
* reviews
* wishlist summary
* addresses only where appropriate
* account status

Keep sensitive information protected.

---

# 16. REVIEW MANAGEMENT

Create:

```text
/admin/reviews
```

Features:

* review list
* search
* filter by rating
* filter by product
* filter by status
* moderation
* approve
* hide
* delete

Display:

```text
Customer
Product
Rating
Review
Date
Status
Actions
```

If the existing review system has no moderation status, extend it safely.

Do not break existing customer reviews.

---

# 17. COUPON MANAGEMENT

Create:

```text
/admin/coupons
```

Features:

* create coupon
* edit coupon
* activate/deactivate
* delete
* expiration
* usage limits
* minimum order amount
* discount percentage
* fixed discount

Fields:

```text
Code
Discount Type
Discount Value
Minimum Order
Maximum Discount
Start Date
Expiry Date
Usage Limit
Per User Limit
Active
```

Customer checkout must continue using the coupon system correctly.

---

# 18. DEAL MANAGEMENT

Create:

```text
/admin/deals
```

Features:

* create deal
* edit deal
* activate/deactivate
* start date
* end date
* discount
* product selection
* stock limit

Dashboard should show active deals.

Customer side should display active deals.

---

# 19. INVENTORY MANAGEMENT

Create:

```text
/admin/inventory
```

Show:

```text
Product
SKU
Current Stock
Low Stock Threshold
Status
Actions
```

Statuses:

```text
In Stock
Low Stock
Out of Stock
```

Allow admins to update stock.

Highlight low-stock products.

Dashboard should use the same inventory data.

---

# 20. LOW-STOCK ALERTS

Create a low-stock section.

Example:

```text
Low Stock Products

Amazon Echo        4 left
Wireless Mouse     7 left
Keyboard            2 left
```

Allow configurable low-stock threshold.

Default:

```text
10
```

---

# 21. ADMIN NOTIFICATIONS

Create:

```text
/admin/notifications
```

Generate useful notifications such as:

* new order
* low stock
* new review
* coupon expiring
* deal expiring
* customer registration if useful

Provide:

* unread/read state
* mark as read
* mark all as read
* clear notifications

---

# 22. ADMIN SEARCH

Add an admin search experience.

Allow searching across:

```text
Products
Orders
Customers
Coupons
Categories
Brands
```

Search should be fast and clearly show result type.

Example:

```text
Search "keyboard"

Products (12)
Orders (3)
Customers (0)
```

---

# 23. BULK PRODUCT ACTIONS

Where practical, implement:

* bulk activate
* bulk deactivate
* bulk delete
* bulk stock update

Require confirmation before destructive bulk operations.

Do not implement complicated functionality if it risks breaking the existing system.

---

# 24. DASHBOARD QUICK ACTIONS

Add useful quick actions:

```text
Add Product
View Orders
Manage Inventory
Create Coupon
Create Deal
Manage Reviews
View Customers
```

Make them actually navigate to working pages.

---

# 25. ADMIN TABLE SYSTEM

Create reusable table components.

Requirements:

* responsive
* pagination
* sorting
* search
* filters
* loading state
* empty state
* error state
* row actions
* confirmation modal
* mobile-friendly behavior

Do not create a completely different table implementation for every page.

---

# 26. ADMIN MODALS

Create reusable modal components for:

* delete confirmation
* status change
* stock update
* coupon creation
* deal creation
* review moderation

Use accessible dialogs.

Support:

* Escape key
* keyboard navigation
* focus management
* clear buttons

---

# 27. ADMIN UI DESIGN

The admin UI must visually belong to the same product.

Use:

### Header

Dark Amazon-style header.

### Sidebar

Dark navy/charcoal.

### Main background

Light gray.

### Cards

White.

### Primary action

Amazon orange/yellow where appropriate.

### Tables

Dense and professional.

### Buttons

Compact.

### Forms

Clear labels and strong focus states.

Avoid:

* excessive rounded corners
* excessive shadows
* neon colors
* gradients
* huge typography
* emojis
* AI-generated visual patterns

---

# 28. RESPONSIVE ADMIN DASHBOARD

The admin panel must work on:

```text
390px
430px
768px
1024px
1280px
1440px
```

Mobile:

* sidebar becomes drawer
* tables become horizontally scrollable or responsive cards
* dashboard cards stack
* charts resize
* forms become one column
* header remains usable

Do not simply hide important information on mobile.

---

# 29. CUSTOMER SIDE MUST REMAIN INTACT

After implementing admin functionality, verify that these customer features still work:

```text
Homepage
Search
Categories
Brands
Filters
Sorting
Product Details
Authentication
Cart
Wishlist
Recently Viewed
Checkout
Addresses
Coupons
Orders
Order Tracking
Reviews
Notifications
Account Dashboard
Recommendations
Deals
Logout
```

Do not introduce regressions.

---

# 30. CUSTOMER + ADMIN DATA CONSISTENCY

The admin panel and customer panel must use the same database.

For example:

If admin creates:

```text
Product: Wireless Headphones
Price: $99
Stock: 50
```

the customer immediately sees that product.

If customer purchases:

```text
Quantity: 2
```

inventory should update.

Admin inventory must reflect:

```text
48
```

If an order status changes in admin:

```text
Processing → Shipped
```

the customer order page must reflect the new status.

If admin creates a coupon, the customer checkout must be able to use it.

If admin creates a deal, the customer deals page must display it.

This must be a real integrated system.

---

# 31. API ARCHITECTURE

Keep admin APIs organized.

Example:

```text
/api/admin/dashboard
/api/admin/analytics
/api/admin/products
/api/admin/categories
/api/admin/brands
/api/admin/orders
/api/admin/users
/api/admin/reviews
/api/admin/coupons
/api/admin/deals
/api/admin/inventory
/api/admin/notifications
```

Use controllers/services instead of putting all logic inside route files.

Use middleware:

```text
authenticate
requireAdmin
validateRequest
```

Where appropriate.

Return consistent responses:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "message": "..."
}
```

Do not expose stack traces in production responses.

---

# 32. DATABASE DESIGN

Inspect the existing Mongoose schemas first.

Reuse existing models where possible.

Extend only when necessary.

Potential entities:

```text
User
Product
Category
Brand
Order
OrderItem
Review
Coupon
Deal
Notification
Address
Wishlist
```

Do not create duplicate models for functionality that already exists.

Add indexes where useful for:

* product search
* order lookup
* email
* SKU
* category
* brand
* createdAt
* order status

---

# 33. SECURITY

Review the entire admin implementation.

Protect against:

* unauthorized admin access
* privilege escalation
* insecure direct object access
* invalid input
* malicious query parameters
* mass assignment
* sensitive data exposure

Never trust:

```text
role
userId
price
discount
stock
order ownership
```

when supplied directly by the client.

Backend must verify everything.

---

# 34. ADMIN SEED ACCOUNT

Create a safe development/admin seed mechanism.

Example:

```text
npm run seed:admin
```

Do NOT hardcode a real production password into the frontend.

Use environment variables.

Document how to create an admin account.

---

# 35. ERROR HANDLING

Every major admin page needs:

### Loading

Professional skeleton/spinner.

### Empty

Example:

```text
No products found.
Try changing your filters.
```

### Error

Example:

```text
We couldn't load this data.
Try again.
```

### Success

Use professional toast/notification messages.

Do not use browser `alert()` for normal application interactions.

---

# 36. ACCESSIBILITY

Target WCAG 2.2 AA.

Implement:

* keyboard navigation
* visible focus states
* semantic buttons
* labels
* accessible dialogs
* accessible tables
* appropriate aria labels
* sufficient contrast
* keyboard-accessible sidebar
* keyboard-accessible dropdowns

Do not rely only on color to communicate status.

---

# 37. PERFORMANCE

Do not sacrifice performance.

Implement where appropriate:

* pagination
* server-side filtering
* server-side sorting
* database indexes
* lazy loading
* image optimization
* debounced search
* memoization only where useful

Do NOT load thousands of products/orders into the browser unnecessarily.

---

# 38. PRODUCTION DEPLOYMENT

Fix the current deployment gaps.

The current project reportedly has deployment problems involving:

* protected backend deployment
* frontend production `VITE_API_URL`

Investigate the actual configuration.

Do not guess.

Verify:

```text
Frontend → Production Backend → MongoDB
```

works in the deployed environment.

Ensure:

* environment variables are documented
* CORS is correct
* API base URL is correct
* authentication works in production
* cookies/tokens work correctly
* no localhost API URLs remain in production
* build succeeds
* production frontend loads
* production backend responds
* MongoDB production connection works

Do not expose secrets in GitHub.

---

# 39. MOBILE + VISUAL QA

Actually inspect the application visually.

Test:

```text
390x844
430x932
768x1024
1024x768
1280x720
1440x900
```

Check:

* header
* search
* navigation
* homepage
* product cards
* product detail
* cart
* checkout
* account
* admin dashboard
* admin tables
* admin forms
* admin mobile drawer

Fix:

* overflow
* broken alignment
* clipped text
* horizontal scrolling
* broken images
* overlapping elements
* incorrect spacing
* inconsistent typography

---

# 40. REAL PRODUCT IMAGES

Continue using real product photography.

Do NOT replace product images with:

* emojis
* CSS shapes
* fake illustrations
* generic AI graphics
* colored rectangles

Product cards should look like an actual e-commerce catalog.

Use consistent image aspect ratios and object-fit behavior.

---

# 41. AMAZON-STYLE HOMEPAGE

Do not weaken the current homepage.

Continue improving:

```text
Amazon-style header
Hero
Deals
Categories
Best Sellers
Featured Products
Electronics
Computers
Home
Kitchen
Fashion
Beauty
Books
Recommendations
Recently Viewed
Promotional sections
Footer
```

Keep the visual density and shopping-oriented layout.

---

# 42. CUSTOMER ACCOUNT

Keep the existing account system.

Verify:

```text
/account
/account/orders
/account/wishlist
/account/addresses
/account/reviews
/account/coupons
/account/notifications
```

The admin customer-management system should integrate with these customer records.

---

# 43. README — VERY IMPORTANT

Completely update `README.md`.

The README must document the actual final system.

Do NOT claim a feature exists unless it is actually implemented.

Include:

# Amazon Clone

## Overview

Explain that this is a full-stack MERN e-commerce platform inspired by Amazon's shopping experience.

## Technology Stack

```text
MongoDB
Express.js
React
Node.js
Vite
Mongoose
React Router
Tailwind/CSS
Axios
JWT/session authentication
Recharts
```

Only list technologies actually used.

---

## Features

Document all implemented customer features.

Example:

### Customer

* Homepage
* Product browsing
* Search
* Category filtering
* Brand filtering
* Price filtering
* Rating filtering
* Sorting
* Pagination
* Product details
* Product gallery
* Cart
* Wishlist
* Recently viewed
* Authentication
* Account dashboard
* Addresses
* Coupons
* Deals
* Checkout
* Orders
* Order tracking
* Reviews
* Notifications
* Recommendations

---

## Admin Features

Document all implemented admin functionality:

* Admin authentication
* Role-based authorization
* Admin dashboard
* Revenue analytics
* Order analytics
* Product management
* Category management
* Brand management
* Customer management
* Order management
* Review moderation
* Coupon management
* Deal management
* Inventory management
* Low-stock alerts
* Admin notifications
* Responsive admin interface

Only include features that actually work.

---

# 44. README — ARCHITECTURE

Document:

```text
project/
├── client/
├── server/
├── .agent-logs/
├── CAPTURE-TEST.md
├── README.md
└── ...
```

Use the actual repository structure rather than assuming these exact directories.

Explain:

* frontend architecture
* backend architecture
* API architecture
* authentication
* database
* admin authorization
* deployment

---

# 45. README — API DOCUMENTATION

Document major APIs.

Example:

```text
Authentication
Products
Categories
Brands
Cart
Wishlist
Orders
Reviews
Coupons
Deals
Admin
Analytics
Inventory
Users
```

For admin endpoints clearly indicate:

```text
Requires authentication
Requires admin role
```

---

# 46. README — ENVIRONMENT VARIABLES

Document required environment variables without exposing secrets.

Example:

```env
MONGODB_URI=
JWT_SECRET=
VITE_API_URL=
```

Only document variables actually used.

---

# 47. README — LOCAL DEVELOPMENT

Provide exact setup:

```bash
git clone ...
npm install
cd client
npm install
cd ../server
npm install
```

Use the project's real commands.

Document:

```bash
npm run dev
```

or the actual commands used by this repository.

---

# 48. README — ADMIN SETUP

Document:

```text
How to create an admin user
How to login
Admin URL
Admin role
```

Do not put real credentials in README.

---

# 49. README — DEMO FLOW

Add a practical walkthrough:

```text
1. Open homepage
2. Search for a product
3. Filter products
4. Open product
5. Add to wishlist
6. Add to cart
7. Checkout
8. Place order
9. View order
10. Login as admin
11. Open admin dashboard
12. View analytics
13. Manage products
14. Manage orders
15. Manage customers
16. Manage inventory
17. Manage coupons/deals
18. Moderate reviews
```

This should match the actual application.

---

# 50. README — KNOWN LIMITATIONS

Be honest.

If payment is simulated:

```text
Payment processing is currently simulated.
```

If shipping is simulated:

```text
Shipping calculations/tracking are simulated.
```

If recommendations are deterministic:

```text
Recommendations currently use deterministic business rules rather than machine-learning personalization.
```

Do NOT pretend these are real integrations.

---

# 51. README — DEPLOYMENT

Document:

* frontend deployment
* backend deployment
* MongoDB Atlas
* environment variables
* CORS
* production API URL
* build commands

Again, use the actual platform/configuration.

---

# 52. AGENT CAPTURE — ABSOLUTELY DO NOT BREAK

This project contains:

```text
.agent-logs/
CAPTURE-TEST.md
```

These are required by the assignment.

DO NOT:

* delete them
* rename them
* modify their capture mechanism unnecessarily
* add them to `.gitignore`
* replace their contents with fake logs

Continue automatic capture for every session.

If the existing capture system is working, preserve it exactly.

---

# 53. GIT

Make logical commits during implementation.

Example:

```text
feat: add admin authentication
feat: add admin dashboard
feat: add product management
feat: add order management
feat: add customer management
feat: add inventory management
feat: add coupon and deal management
feat: add analytics
fix: production api configuration
fix: responsive admin layout
docs: update readme
```

Do not create one giant meaningless commit.

Do not commit secrets.

---

# 54. FINAL QA CHECKLIST

Before declaring completion, test all of the following.

## Customer

* [ ] Register
* [ ] Login
* [ ] Logout
* [ ] Search
* [ ] Category filter
* [ ] Brand filter
* [ ] Price filter
* [ ] Rating filter
* [ ] Sorting
* [ ] Product details
* [ ] Wishlist
* [ ] Recently viewed
* [ ] Cart
* [ ] Address
* [ ] Coupon
* [ ] Checkout
* [ ] Order placement
* [ ] Order history
* [ ] Order tracking
* [ ] Review
* [ ] Notifications
* [ ] Account dashboard

## Admin

* [ ] Admin login
* [ ] Customer cannot access admin
* [ ] Admin dashboard
* [ ] Revenue analytics
* [ ] Order analytics
* [ ] Product CRUD
* [ ] Category CRUD
* [ ] Brand CRUD
* [ ] Order management
* [ ] Customer management
* [ ] Review moderation
* [ ] Coupon CRUD
* [ ] Deal CRUD
* [ ] Inventory
* [ ] Low-stock alerts
* [ ] Notifications
* [ ] Admin logout

## Integration

* [ ] Admin-created product appears to customers
* [ ] Customer purchase updates inventory
* [ ] Customer order appears in admin
* [ ] Admin order status appears to customer
* [ ] Admin coupon works at checkout
* [ ] Admin deal appears on customer side
* [ ] Admin review moderation affects customer visibility

## Responsive

* [ ] 390px
* [ ] 430px
* [ ] 768px
* [ ] 1024px
* [ ] 1280px
* [ ] 1440px

## Production

* [ ] Frontend builds
* [ ] Backend starts
* [ ] MongoDB connects
* [ ] Production API works
* [ ] Authentication works
* [ ] Admin authentication works
* [ ] No localhost API remains in production
* [ ] CORS works
* [ ] No secrets committed
* [ ] Public deployed URL works

---

# 55. PRIORITY SYSTEM — VERY IMPORTANT

Because this is a time-limited assignment, prioritize correctly.

## P0 — MUST WORK

1. Admin authentication
2. Admin authorization
3. Admin dashboard
4. Product management
5. Order management
6. Customer management
7. Inventory
8. Analytics
9. Existing customer shopping flow
10. Production deployment
11. README
12. Responsive QA

## P1 — HIGH VALUE

13. Review moderation
14. Coupon management
15. Deal management
16. Notifications
17. Advanced analytics
18. Bulk operations

## P2 — POLISH

19. Animations
20. Advanced transitions
21. Additional dashboard visualizations
22. Extra micro-interactions

If time is limited, finish P0 completely before spending time on P2.

---

# 56. IMPORTANT IMPLEMENTATION RULE

Before changing anything:

### STEP 1

Audit the current repository.

### STEP 2

Identify what already exists.

### STEP 3

Reuse existing models, APIs, components, and styles where possible.

### STEP 4

Implement the missing admin architecture.

### STEP 5

Connect admin functionality to the existing MongoDB data.

### STEP 6

Test customer/admin integration.

### STEP 7

Fix production configuration.

### STEP 8

Perform responsive/visual QA.

### STEP 9

Update README with ONLY implemented features.

### STEP 10

Run final smoke tests.

---

# FINAL EXPECTATION

When finished, the application should feel like a complete full-stack e-commerce product rather than a frontend demo.

There should be two clearly integrated experiences:

## CUSTOMER

```text
Amazon-style shopping experience
```

and

## ADMIN

```text
Amazon-style e-commerce operations dashboard
```

Both must operate on the same backend and MongoDB database.

The admin dashboard must be functional, responsive, secure, data-driven, and visually consistent with the customer-facing Amazon design.

DO NOT stop after creating UI mockups.

Every major admin screen must connect to real backend functionality.

DO NOT create fake analytics.

DO NOT create placeholder buttons.

DO NOT create dead navigation links.

DO NOT claim features in README that do not work.

Do not remove working features just to simplify the implementation.

Start by auditing the current repository, then implement the highest-priority missing functionality immediately.
