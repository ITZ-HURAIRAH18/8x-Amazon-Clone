# Amazon Clone — Phase 2 Power Upgrade

We already have a working MERN Amazon.com clone.

Do NOT rebuild the project from scratch.

Do NOT remove existing functionality.

Do NOT replace the current architecture.

First inspect the entire existing repository and understand what has already been implemented.

The project already contains:

* MERN architecture
* 24 seeded products
* Product APIs
* Product browsing
* Product details
* Search
* Cart
* Authentication
* Orders
* Agent capture logs
* Git workflow
* Initial Amazon-style UI

There are approximately 21 hours remaining.

Our goal now is to transform the current implementation into a much more complete, polished, professional, high-fidelity Amazon-style shopping experience.

The result should feel like a serious production e-commerce application, not a basic assignment demo.

---

# 1. CRITICAL RULES

Before changing anything:

1. Inspect the current project.
2. Understand the existing architecture.
3. Identify what is already implemented.
4. Reuse existing components and APIs.
5. Do not duplicate existing functionality.
6. Do not break the existing agent-capture setup.
7. Do not remove `.agent-logs/`.
8. Do not add `.agent-logs/` to `.gitignore`.
9. Continue committing the logs as required by the assignment.
10. Do not rewrite working code unnecessarily.

Every new feature must integrate with the existing application.

Do not create a second competing implementation.

---

# 2. MAIN GOAL

Upgrade the current project into a powerful Amazon-style marketplace with:

* better homepage
* better navigation
* advanced search
* filters
* sorting
* product discovery
* wishlist
* recently viewed products
* product comparison
* reviews and ratings
* recommendations
* deals
* coupons
* shopping cart improvements
* saved addresses
* order tracking
* reorder
* notifications
* account dashboard
* checkout improvements
* professional loading states
* error handling
* responsive design
* accessibility
* performance improvements
* polished Amazon-style UI

Prioritize features that are visible during a reviewer walkthrough.

---

# 3. PRIORITY SYSTEM

Use this priority order.

## P0 — MUST BE PERFECT

These must be stable:

* Homepage
* Header
* Search
* Product listing
* Product details
* Authentication
* Cart
* Checkout
* Orders
* MongoDB persistence
* Responsive design
* Deployment readiness

## P1 — HIGH-VALUE FEATURES

Implement these next:

* advanced filtering
* sorting
* wishlist
* reviews
* recently viewed
* product comparison
* coupons
* order tracking
* reorder
* saved addresses
* account dashboard
* recommendations
* deals page
* notifications

## P2 — POLISH

After P0/P1:

* skeleton loaders
* animations
* micro-interactions
* improved empty states
* better error states
* accessibility improvements
* performance optimization
* SEO metadata
* 404 page
* professional README

Do not sacrifice P0 stability for P2 polish.

---

# 4. AMAZON-STYLE HOMEPAGE UPGRADE

Make the homepage significantly richer.

Structure:

HEADER

* Amazon-style top navigation
* logo
* delivery location
* search
* category selector
* language
* account
* orders
* cart

SECONDARY NAV

* All
* Today's Deals
* Customer Service
* Registry
* Gift Cards
* Sell
* other appropriate navigation

MAIN CONTENT

1. Hero carousel
2. Shop by category
3. Today's Deals
4. Best Sellers
5. Featured products
6. Electronics
7. Computers
8. Home & Kitchen
9. Fashion
10. Beauty
11. Books
12. Recommended for you
13. Recently viewed
14. Prime-style promotional section
15. More products
16. Footer

The homepage should feel dense and marketplace-oriented.

Do not create huge empty spaces.

---

# 5. PROFESSIONAL HEADER

Improve the header substantially.

Add:

* search category dropdown
* search suggestions
* recent searches
* clear search button
* delivery location selector
* account dropdown
* orders shortcut
* wishlist shortcut
* cart count
* cart subtotal preview
* responsive mobile header
* side navigation drawer

Search suggestions should appear while typing.

Example:

User types:

"lap"

Show:

Laptop
Laptop Stand
Laptop Bag
Laptop Charger

Clicking a suggestion must perform the appropriate search/navigation.

---

# 6. ADVANCED SEARCH

Upgrade the current search system.

Backend:

Support:

* keyword search
* title
* description
* brand
* category
* price range
* rating
* stock
* discount
* bestseller
* deal
* sorting
* pagination

Support URL query parameters.

Example:

/products?search=laptop&category=electronics&minPrice=300&maxPrice=1500&rating=4&sort=price-low

Frontend:

* search input
* suggestions
* filters
* sorting
* result count
* pagination
* clear filters
* mobile filter drawer

Add a "No results" experience.

---

# 7. FILTER SYSTEM

Complete the existing backend brand filtering with a professional UI.

Filters:

* Category
* Brand
* Price
* Customer Rating
* Availability
* Discount
* Deals
* Prime-style delivery

Desktop:

Sticky filter sidebar.

Mobile:

Filter drawer.

Show active filter chips.

Example:

Brand: Apple
Rating: 4+
Price: $500-$1000

Allow:

* remove individual filter
* clear all filters

---

# 8. SORTING

Add:

* Featured
* Price: Low to High
* Price: High to Low
* Avg. Customer Review
* Newest
* Best Sellers
* Biggest Discount

Sorting must update the backend query.

---

# 9. PAGINATION

Implement proper pagination.

Show:

Previous
1
2
3
4
5
Next

Do not load hundreds of products unnecessarily.

Display:

"1-24 of 120 results"

Use backend pagination.

---

# 10. WISHLIST

Add a real wishlist.

Users can:

* add product to wishlist
* remove product
* view wishlist
* move wishlist item to cart
* remove all wishlist items

Add heart/favorite control to ProductCard and ProductDetails.

For authenticated users:

Store wishlist in MongoDB.

For guests:

Use localStorage.

Wishlist page:

/wishlist

Use an Amazon-style dense product layout.

---

# 11. RECENTLY VIEWED PRODUCTS

Track products opened by the user.

Store the last 10–20 products.

Display:

"Recently viewed"

on homepage and product pages.

Avoid duplicate products.

For logged-in users, persist where practical.

For guests, localStorage is acceptable.

---

# 12. PRODUCT COMPARISON

Add product comparison.

Users can select up to 3 or 4 products.

Show:

* image
* title
* price
* rating
* reviews
* brand
* category
* availability
* discount
* important specifications

Add:

"Compare"

button.

Create:

/compare

The comparison page should look like a real commerce comparison table.

---

# 13. PRODUCT DETAILS UPGRADE

Make product pages much more professional.

Include:

LEFT:

* image gallery
* thumbnail navigation
* zoom interaction
* multiple images

CENTER:

* product title
* rating
* review count
* bestseller badge
* brand
* product features
* description
* specifications
* shipping information

RIGHT:

* price
* original price
* discount
* delivery date
* stock
* quantity
* Add to Cart
* Buy Now
* Add to Wishlist

Below:

* Product details
* Specifications
* Customer reviews
* Related products
* Frequently bought together
* Similar products
* Recently viewed

---

# 14. REVIEWS AND RATINGS

Implement a real review system.

Users can:

* submit review
* choose 1–5 stars
* write review
* edit their own review
* delete their own review

Only authenticated users who purchased the product should be allowed to submit a review if order data makes that practical.

Review model:

* user
* product
* order
* rating
* title
* comment
* createdAt
* updatedAt

Display:

* average rating
* total reviews
* rating distribution
* review list
* verified purchase indicator where applicable

Example:

5 stars ████████
4 stars ███
3 stars ██
2 stars █
1 star █

Add sorting:

* Most recent
* Highest rating
* Lowest rating
* Most helpful

If time is limited, prioritize creation + display + rating aggregation over an advanced helpful-vote system.

---

# 15. RECOMMENDATION SYSTEM

Create a practical recommendation engine.

Do NOT over-engineer machine learning.

Use deterministic recommendation logic.

Recommend products based on:

* same category
* same brand
* similar price
* related products
* recently viewed
* frequently bought together
* bestseller products

Display:

"Customers who viewed this item also viewed"

"Recommended for you"

"Frequently bought together"

"Similar items"

Recommendations should feel relevant.

---

# 16. DEALS SYSTEM

Create a dedicated:

/deals

page.

Include:

* Today's Deals
* Lightning-style deals
* Discount percentage
* original price
* current price
* deal progress
* limited stock
* countdown timer

Use seeded deal data.

Countdown must be functional.

Do not fake a countdown that never changes.

---

# 17. COUPONS

Add coupon functionality.

Create Coupon model:

* code
* discountType
* discountValue
* minimumOrder
* maximumDiscount
* expiresAt
* active

Example:

SAVE10

10% OFF

On checkout:

* coupon input
* Apply
* Remove
* validation
* discount calculation

Display:

Subtotal
Discount
Shipping
Tax
Total

All calculations must be consistent.

---

# 18. CART UPGRADE

Improve the cart.

Add:

* Save for later
* Move to wishlist
* Remove
* quantity selector
* stock validation
* subtotal
* estimated tax
* shipping
* coupon
* total

Add:

"Frequently bought together"

below the cart.

If product becomes unavailable:

Show an appropriate message.

---

# 19. SAVED ADDRESSES

Upgrade account addresses.

Users can:

* add address
* edit address
* delete address
* set default address

Fields:

* fullName
* phone
* street
* apartment
* city
* state
* postalCode
* country

Checkout should allow selecting a saved address.

---

# 20. CHECKOUT UPGRADE

Make checkout feel like a real Amazon-style checkout.

Steps:

1. Delivery address
2. Delivery method
3. Payment method
4. Order review
5. Place order

Show an order summary on the right.

Add:

* address selection
* add address
* delivery options
* payment method selection
* coupon
* subtotal
* shipping
* tax
* discount
* total

Payment gateway remains optional.

For this assignment, a realistic simulated payment method is acceptable.

Clearly structure the code so a real payment gateway can be integrated later.

---

# 21. ORDER TRACKING

Upgrade orders.

Each order should show:

Order placed
|
Processing
|
Shipped
|
Out for delivery
|
Delivered

Create a visual order timeline.

Show:

* order number
* order date
* products
* total
* shipping address
* status
* estimated delivery
* tracking-style information

Add:

"View order"

"Buy again"

"Track package"

---

# 22. BUY AGAIN

Add a "Buy Again" section to the account.

Products from previous orders should be displayed.

Button:

"Buy again"

Clicking it adds the product to cart.

---

# 23. ACCOUNT DASHBOARD

Transform the current account page into a professional Amazon-style account center.

Sections:

Your Orders
Your Wishlist
Your Addresses
Login & Security
Buy Again
Recently Viewed
Your Reviews
Coupons
Notifications

Use a clean grid.

Do not make it look like a SaaS dashboard.

Keep it commerce-focused.

---

# 24. NOTIFICATIONS

Create a lightweight notification system.

Examples:

Order placed
Order shipped
Order delivered
Wishlist item price changed
Product back in stock

Add notification icon/menu.

Unread count should work.

Store notifications in MongoDB for authenticated users.

---

# 25. PRODUCT BADGES

Create reusable badges:

* Best Seller
* Limited Time Deal
* New
* 20% off
* Prime-style delivery
* In Stock
* Low Stock

Do not overload every product with badges.

Use badges only when appropriate.

---

# 26. PRODUCT CARD UPGRADE

Product cards must be highly polished.

Include:

* image
* title
* rating
* review count
* price
* original price
* discount
* badge
* delivery information
* wishlist button
* Add to Cart

Hover behavior:

* subtle border/shadow
* image remains stable
* actions become visible where appropriate

Do not create excessive animations.

---

# 27. LOADING EXPERIENCE

Add professional skeleton loaders for:

* homepage
* product grid
* product detail
* cart
* orders
* wishlist
* account

Do not show blank white screens while data loads.

---

# 28. ERROR STATES

Create useful error states.

Examples:

Product not found

Unable to load products

Network error

Session expired

Cart update failed

Order failed

Payment simulation failed

Use:

Retry

Go Home

Continue Shopping

where appropriate.

---

# 29. EMPTY STATES

Create polished empty states:

Empty cart
Empty wishlist
No search results
No orders
No notifications
No recently viewed products
No reviews

Keep them simple and Amazon-like.

Do not use unnecessary illustrations.

---

# 30. MOBILE EXPERIENCE

Improve mobile significantly.

Test:

390px
430px
768px
1024px
1280px
1440px

Mobile:

* compact header
* search remains prominent
* horizontal category scrolling
* product grid
* filter drawer
* cart controls
* checkout
* account
* order tracking

No horizontal page overflow.

---

# 31. ACCESSIBILITY

Verify:

* keyboard navigation
* visible focus
* semantic HTML
* aria labels
* alt text
* dialog accessibility
* drawer accessibility
* Escape handling
* proper form labels
* sufficient contrast
* touch target size

Do not hide focus outlines.

---

# 32. VISUAL POLISH

Perform a full visual QA pass.

Check:

* spacing
* typography
* alignment
* card heights
* image ratios
* header proportions
* search width
* button sizes
* colors
* borders
* shadows
* responsive breakpoints

The UI should feel intentionally designed.

Do not introduce:

* excessive rounded corners
* gradients
* glass effects
* huge whitespace
* purple AI colors
* random animations
* unnecessary emoji
* decorative AI illustrations

---

# 33. AMAZON-STYLE DESIGN TOKENS

Keep the current Amazon token system.

Use:

--amz-nav-dark
--amz-nav-secondary
--amz-ink
--amz-muted
--amz-canvas
--amz-surface
--amz-border
--amz-border-strong
--amz-link
--amz-link-hover
--amz-accent
--amz-search
--amz-buy
--amz-buy-hover
--amz-success
--amz-warning

Do not introduce random colors.

---

# 34. REAL PRODUCT IMAGES

Improve the catalog quality.

Use real product photography from appropriate sources.

Product images should:

* match the product
* have consistent aspect ratios
* load reliably
* have useful alt text
* support multiple images on product detail pages

Avoid:

* emoji
* random placeholders
* decorative generated images
* broken URLs

---

# 35. PERFORMANCE

Improve:

* image lazy loading
* pagination
* API efficiency
* MongoDB indexes
* React rendering
* unnecessary requests
* component rendering
* bundle size where practical

Add MongoDB indexes for commonly queried fields where appropriate.

---

# 36. SEO

Add appropriate:

* page titles
* meta descriptions
* product metadata
* canonical URLs where appropriate
* semantic headings

Product pages should have meaningful titles.

---

# 37. SECURITY

Review:

* JWT handling
* password hashing
* authorization
* input validation
* API error responses
* CORS
* environment variables
* sensitive data exposure

Never expose:

* passwords
* JWT secrets
* MongoDB credentials

Do not commit `.env`.

---

# 38. MONGODB PRODUCTION READINESS

Keep local development working.

Prepare the project for MongoDB Atlas.

Document:

MONGODB_URI

configuration.

Do not break the local MongoDB workflow.

Add clear environment configuration.

---

# 39. DEPLOYMENT READINESS

Prepare both:

Frontend
Backend
MongoDB

for deployment.

Verify that:

* frontend production build works
* backend starts correctly
* API routes work
* CORS works
* environment variables work
* MongoDB connection works
* authentication works
* no localhost API URLs remain in production configuration

If deployment can be completed within the remaining time, deploy it.

Public HTTPS deployment is important for the assignment.

---

# 40. README UPGRADE — VERY IMPORTANT

Update README.md to clearly document what has been built.

Do not merely write generic setup instructions.

Create a professional project README.

Include:

# Amazon Clone

## Overview

Explain that this is a high-fidelity MERN e-commerce implementation inspired by Amazon's shopping experience.

## Features

Create a comprehensive feature list.

Example:

### Shopping

* Product browsing
* Product search
* Advanced filtering
* Sorting
* Pagination
* Product details
* Product gallery
* Categories
* Deals
* Recommendations
* Recently viewed
* Product comparison

### Cart

* Add to cart
* Quantity management
* Remove item
* Save for later
* Wishlist integration
* Coupon application
* Dynamic totals

### Authentication

* Registration
* Login
* Logout
* Protected routes
* Account dashboard

### Wishlist

* Add/remove wishlist items
* Move to cart
* Persistent wishlist

### Reviews

* Ratings
* Reviews
* Verified purchase indicator
* Review sorting

### Checkout

* Address selection
* Saved addresses
* Delivery method
* Payment method UI
* Coupons
* Order summary
* Order creation

### Orders

* Order history
* Order details
* Order tracking
* Buy again
* Order status

### UI/UX

* Amazon-style header
* Search suggestions
* Side drawer
* Hero carousel
* Product carousels
* Responsive design
* Skeleton loaders
* Empty states
* Error states
* Accessibility

### Backend

* Node.js
* Express
* MongoDB
* Mongoose
* JWT
* REST API

---

# 41. README — WHAT WAS ADDED IN THIS PHASE

Create a dedicated section:

## Phase 2 Enhancements

Document exactly what you added during this upgrade.

For example:

* Advanced product filtering UI
* Product sorting
* Wishlist
* Recently viewed products
* Product comparison
* Review system
* Recommendation sections
* Deals page
* Coupon system
* Saved addresses
* Order tracking
* Buy Again
* Notification system
* Account dashboard improvements
* Product card improvements
* Search suggestions
* Loading skeletons
* Empty states
* Error states
* Accessibility improvements
* Responsive improvements
* Performance improvements
* SEO improvements
* Deployment configuration

Only list features that actually exist.

Never claim a feature is implemented if it is not.

---

# 42. README — ARCHITECTURE

Document:

client
server
MongoDB
API
authentication
state management

Show a folder structure.

---

# 43. README — API DOCUMENTATION

Document the main endpoints.

Example:

Authentication

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Products

GET /api/products
GET /api/products/:id

Cart

GET /api/cart
POST /api/cart
PATCH /api/cart/:id
DELETE /api/cart/:id

Wishlist

GET /api/wishlist
POST /api/wishlist
DELETE /api/wishlist/:id

Orders

POST /api/orders
GET /api/orders
GET /api/orders/:id

Reviews

GET /api/products/:id/reviews
POST /api/products/:id/reviews

Use the actual implemented routes, not hypothetical routes.

---

# 44. README — SETUP

Include exact:

1. clone
2. install client
3. install server
4. environment variables
5. database setup
6. seed command
7. run backend
8. run frontend
9. production build

Commands must actually work.

---

# 45. README — DEMO FLOW

Add:

## Recommended Demo Flow

1. Open homepage
2. Search for a product
3. Apply filters
4. Open product
5. Add to wishlist
6. Add to cart
7. Change quantity
8. Login
9. Checkout
10. Apply coupon
11. Place order
12. Open order history
13. Track order
14. Buy again

This should reflect actual implemented functionality.

---

# 46. README — KNOWN LIMITATIONS

Document anything intentionally not implemented.

For example:

* Real payment gateway
* Seller marketplace
* Advanced personalization
* Production recommendation ML
* Real shipping provider integration

Do not hide limitations.

Do not claim Amazon's real backend functionality.

---

# 47. FINAL TESTING

Before finishing, perform an actual end-to-end smoke test.

TEST 1:

Register user.

TEST 2:

Login.

TEST 3:

Search product.

TEST 4:

Filter.

TEST 5:

Sort.

TEST 6:

Open product.

TEST 7:

Add wishlist.

TEST 8:

Add cart.

TEST 9:

Change quantity.

TEST 10:

Checkout.

TEST 11:

Select address.

TEST 12:

Apply coupon.

TEST 13:

Place order.

TEST 14:

Verify MongoDB order.

TEST 15:

Open order history.

TEST 16:

Open order tracking.

TEST 17:

Buy again.

TEST 18:

Submit review if eligible.

TEST 19:

Open wishlist.

TEST 20:

Test mobile layout.

TEST 21:

Test logout/login again.

Fix every obvious failure found during this process.

---

# 48. AGENT CAPTURE REQUIREMENT

The 8x assignment requires automatic agent capture.

Do NOT disable or modify the existing capture system unless necessary.

Continue recording:

* prompts
* final responses
* timestamps
* model

Keep:

.agent-logs/

committed.

Do not manually rewrite logs.

Do not delete previous logs.

Do not add logs to `.gitignore`.

---

# 49. GIT COMMITS

Commit logically during the upgrade.

Examples:

feat: add advanced product filters
feat: add wishlist system
feat: add product reviews
feat: add product comparison
feat: add coupon system
feat: add order tracking
feat: improve Amazon homepage
feat: improve search experience
feat: improve responsive UI
fix: resolve checkout persistence issue
fix: resolve product image loading
docs: update README with phase 2 features

Do not create one giant final commit.

---

# 50. FINAL PRIORITY

If time becomes limited, use this order:

1. Fix existing bugs
2. Improve homepage
3. Improve search/filter/sorting
4. Wishlist
5. Reviews
6. Order tracking
7. Coupons
8. Recently viewed
9. Product comparison
10. Recommendations
11. Account improvements
12. UI polish
13. Responsive QA
14. Deployment
15. README
16. Final smoke test

Do NOT spend hours implementing a complicated payment gateway while core shopping flows still have bugs.

---

# 51. FINAL QUALITY BAR

Before declaring the project complete, ask yourself:

Can a new visitor understand the site immediately?

Does the site visually resemble Amazon?

Can the visitor search?

Can they filter?

Can they open a product?

Can they see realistic product information?

Can they wishlist?

Can they add to cart?

Can they checkout?

Can they place an order?

Can they view the order?

Can they track it?

Can they buy again?

Can they leave a review?

Does the UI work on mobile?

Are loading/error/empty states handled?

Does the backend persist important data?

Is the repository clean?

Is README accurate?

Is the project deployable?

If any core answer is no, fix it before adding another low-priority feature.

---

# 52. START

Start by auditing the existing implementation.

Return a concise report containing:

1. What already exists
2. What is partially implemented
3. What is missing
4. What you will upgrade first
5. Any bugs you discover

Then begin implementation immediately.

Do not rebuild existing functionality.

Do not create a generic e-commerce template.

Do not stop at visual mockups.

Build a polished, functional, high-fidelity Amazon-style MERN marketplace.

The final result must look professional, behave professionally, and be ready for a live assignment walkthrough.
