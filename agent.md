# Amazon.com Clone — MERN Full-Stack Implementation

You are my senior full-stack engineer and UI implementation agent.

We are building a high-fidelity Amazon.com e-commerce clone as a time-limited software engineering assignment.

The goal is to reproduce the Amazon shopping experience as closely as practical, including its visual hierarchy, layout density, navigation patterns, product browsing, cart behavior, authentication, and checkout flow.

Do NOT create a generic e-commerce website.

Do NOT redesign Amazon into a modern SaaS-style interface.

The result should immediately feel like Amazon when someone opens it.

Use the provided Amazon design-system information below as the primary visual reference.

---

# 1. Technology — MUST USE MERN

Use:

* MongoDB
* Express.js
* React
* Node.js

Frontend:

* React
* Vite
* React Router
* Tailwind CSS or well-structured CSS
* Axios
* Context API or Redux Toolkit where appropriate

Backend:

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT authentication
* REST APIs

Do not replace MERN with Django, Firebase, Supabase, or another backend.

---

# 2. Development Philosophy

Build the application from scratch.

Before implementing a feature:

1. Inspect the existing project.
2. Understand the current architecture.
3. Reuse existing components where appropriate.
4. Do not unnecessarily rewrite working code.
5. Keep frontend and backend properly separated.
6. Keep components reusable.
7. Keep API logic separate from UI components.
8. Keep MongoDB models clean and normalized.
9. Implement real functionality instead of fake buttons.
10. Prioritize working core functionality over low-value features.

Every major interaction should actually work.

If something cannot realistically be implemented within the remaining assignment time, prioritize the user-visible core flow rather than spending excessive time on edge functionality.

---

# 3. PRIMARY OBJECTIVE

Create a high-fidelity Amazon.com clone containing:

* Amazon-style global header
* Amazon-style secondary navigation
* Search
* Category browsing
* Product listing
* Product details
* Product images
* Product ratings
* Product pricing
* Discounts
* Product availability
* Add to cart
* Cart quantity controls
* Cart subtotal
* Remove from cart
* Authentication
* User account
* Orders
* Checkout
* Order creation
* Order history
* Responsive design
* Footer
* Side navigation drawer
* Product carousels
* Hero/banner sections
* Loading states
* Empty states
* Error states

The application must feel like one coherent Amazon shopping experience.

---

# 4. DO NOT MAKE IT LOOK AI-GENERATED

The UI must NOT look like a generic AI-generated website.

Avoid:

* excessive rounded cards
* excessive gradients
* glassmorphism
* huge empty spaces
* random animations
* oversized typography
* purple/blue AI-style color palettes
* unnecessary decorative illustrations
* excessive shadows
* generic SaaS dashboard layouts
* unnecessary emojis
* fake-looking placeholder UI

Do not use emojis as visual decoration.

Use icons where Amazon uses icons.

The interface should feel dense, practical, commercial, and production-oriented.

---

# 5. AMAZON VISUAL LANGUAGE

Follow this visual hierarchy:

1. Dark Amazon-style global header
2. Dominant search bar
3. Secondary dark navigation
4. Large promotional/hero area
5. Light-grey commerce background
6. White category/product surfaces
7. Product carousels
8. Dense product information
9. Large multi-column footer

Use Amazon's familiar visual language:

* dark navy/black navigation
* white content surfaces
* Amazon yellow for primary commerce actions
* orange for Amazon/search accents
* blue for links
* light grey page background
* compact typography
* square/low-radius cards
* dense information layout

Do NOT turn this into a modern minimalist storefront.

---

# 6. COLOR TOKENS

Create reusable CSS variables/design tokens.

Use:

--amz-nav-dark: #131921;
--amz-nav-secondary: #232F3E;
--amz-ink: #0F1111;
--amz-muted: #565959;
--amz-canvas: #E3E6E6;
--amz-surface: #FFFFFF;
--amz-border: #D5D9D9;
--amz-border-strong: #BBBFBF;
--amz-link: #2162A1;
--amz-link-hover: #C7511F;
--amz-accent: #FF9900;
--amz-search: #FEBD69;
--amz-buy: #FFD814;
--amz-buy-hover: #F7CA00;
--amz-success: #007600;
--amz-warning: #B12704;

Do not scatter random colors throughout the code.

Use semantic design tokens.

---

# 7. TYPOGRAPHY

Use:

font-family: Arial, sans-serif;

Base:

14px / 20px

Header:

12px–14px

Card headings:

21px bold

Product text:

12px–14px

Large hero headings:

32px–48px depending on available space.

Typography should be compact.

Do not use oversized modern landing-page typography.

---

# 8. GLOBAL HEADER

Build a highly accurate Amazon-style header.

Desktop structure:

---

Logo | Deliver To | Search | Language | Account |
Orders | Cart
-------------

The search bar must visually dominate the header.

Include:

* Amazon-style logo treatment
* delivery/location section
* category dropdown
* search input
* search button
* language selector
* account/login section
* orders section
* cart section
* cart item count

Interactions:

* search must work
* category dropdown must work
* cart must navigate to cart
* account must navigate to account/login
* logo must return home
* location section can open a delivery/location panel

Header must remain dense and compact.

---

# 9. SECONDARY NAVIGATION

Create a second dark navigation row.

Include:

* hamburger menu
* All
* Today's Deals
* Customer Service
* Registry
* Gift Cards
* Sell

The menu should resemble Amazon's navigation density.

Hover/focus states must be visible.

---

# 10. SIDE DRAWER

Implement a left-side navigation drawer.

When the hamburger button is clicked:

* drawer opens from left
* background overlay appears
* drawer contains navigation categories
* close button works
* clicking overlay closes drawer
* Escape closes drawer
* keyboard focus must remain usable

Example structure:

Hello, sign in

Digital Content & Devices

Shop by Department

Programs & Features

Help & Settings

---

# 11. HOME PAGE

The homepage should reproduce Amazon's dense commerce layout.

Structure:

1. Global header
2. Secondary navigation
3. Hero/banner carousel
4. Delivery/location notice where appropriate
5. Category cards
6. Product carousels
7. Deals section
8. Bestseller section
9. Additional product/category sections
10. Footer

Do not make the homepage sparse.

Use real product photography wherever legally/technically appropriate.

Do not use emoji placeholders.

---

# 12. PRODUCT DATA

Create a MongoDB Product model.

Fields should include:

* title
* description
* price
* originalPrice
* discount
* images
* category
* brand
* rating
* reviewCount
* stock
* bestseller
* featured
* deal
* createdAt

Seed the database with a realistic catalog.

Use real product categories such as:

* Electronics
* Computers
* Phones
* Home
* Kitchen
* Fashion
* Beauty
* Books
* Toys
* Grocery
* Sports

Product images should be actual product photography from appropriate image sources, not colored placeholder boxes.

If external images are used, keep URLs reliable.

---

# 13. PRODUCT LISTING PAGE

Implement:

* category title
* result count
* sorting
* filters
* product grid
* product image
* product title
* rating
* review count
* price
* discount
* Prime-style delivery information where appropriate
* Add to Cart

Filters should include useful commerce filters such as:

* category
* price
* rating
* availability
* brand

The page must handle:

* loading
* empty results
* API errors
* many products
* long titles

---

# 14. SEARCH

Search must be functional.

When a user searches:

Example:

"laptop"

the backend should return matching products.

Search should support:

* title matching
* category matching
* brand matching

Create:

GET /api/products

with query parameters for:

* search
* category
* minPrice
* maxPrice
* rating
* sort
* page
* limit

Do not implement search as a fake frontend-only filter if the backend can reasonably support it.

---

# 15. PRODUCT DETAILS PAGE

Create an Amazon-style product detail page.

Layout:

Left:

* image gallery
* main product image
* thumbnails

Middle:

* product title
* rating
* review count
* description
* features
* brand/category information

Right:

* price
* discount
* delivery information
* stock
* quantity selector
* Add to Cart
* Buy Now

The purchase panel should visually resemble Amazon's commerce panel.

Implement:

* image switching
* quantity changes
* add to cart
* buy now
* stock validation

---

# 16. CART

Create a real shopping cart.

Cart must support:

* product image
* product title
* price
* quantity
* increase quantity
* decrease quantity
* remove item
* subtotal
* total item count
* checkout button

Cart state must persist appropriately.

Use backend persistence for authenticated users.

For guests, use localStorage if needed.

Do not make the cart merely visual.

---

# 17. AUTHENTICATION

Implement:

* Sign up
* Login
* Logout
* Protected account/order routes

MongoDB User model:

* name
* email
* passwordHash
* address
* createdAt

Use secure password hashing.

Use JWT authentication.

Do not store plain-text passwords.

---

# 18. ACCOUNT PAGE

Create an Amazon-style account area.

Include sections such as:

* Your Orders
* Your Addresses
* Login & Security
* Your Account
* Payment-related information where appropriate

Keep the layout practical and Amazon-like.

---

# 19. CHECKOUT

Create a working checkout flow.

Steps:

1. Cart
2. Delivery address
3. Order summary
4. Payment method UI
5. Place order
6. Order confirmation

For this assignment, do not spend excessive time integrating a real payment gateway unless already available.

A simulated payment method is acceptable.

But placing the order must actually create an Order record in MongoDB.

---

# 20. ORDER MODEL

Create:

Order

Fields:

* user
* items
* shippingAddress
* paymentMethod
* subtotal
* shipping
* tax
* total
* status
* createdAt

Order status:

* Pending
* Processing
* Shipped
* Delivered
* Cancelled

Create APIs for:

* create order
* get user's orders
* get single order

---

# 21. DATABASE API STRUCTURE

Use clean REST endpoints.

Example:

GET    /api/products
GET    /api/products/:id
POST   /api/products

POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/cart
POST   /api/cart
PATCH  /api/cart/:itemId
DELETE /api/cart/:itemId

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id

Keep controllers, routes, models, middleware, and services organized.

---

# 22. RESPONSIVE DESIGN

Desktop is the primary target because Amazon desktop is the primary visual reference.

But the application must also work on:

* 1440px
* 1280px
* 1024px
* 768px
* 390px

On mobile:

* desktop header must transform appropriately
* search remains usable
* navigation becomes compact
* product grids become responsive
* horizontal carousels can scroll
* cards must not overflow
* buttons must remain touch-friendly

Do not simply shrink the desktop design.

---

# 23. ACCESSIBILITY

Follow WCAG 2.2 AA principles.

Must include:

* semantic HTML
* keyboard navigation
* visible focus states
* meaningful button labels
* alt text
* sufficient contrast
* form labels
* accessible dialogs
* Escape handling for drawers/modals
* logical tab order

Every interactive element must be usable with keyboard and pointer/touch input.

---

# 24. COMPONENT ARCHITECTURE

Create reusable components such as:

AmazonShell
GlobalHeader
AmazonLogo
DeliveryLocation
SearchBar
CategorySelect
AccountMenu
CartIcon
SecondaryNav
SideDrawer
HeroCarousel
CategoryCard
ProductCard
ProductCarousel
DealCard
RatingStars
Price
QuantitySelector
FilterSidebar
SortDropdown
ProductGallery
PurchasePanel
CartItem
CartSummary
CheckoutSteps
AddressCard
OrderCard
Footer
FooterColumn

Avoid one giant React component.

---

# 25. STATES

Every important component must handle:

* default
* hover
* focus
* active
* disabled
* loading
* error
* empty

Examples:

Loading products:

Show Amazon-style skeleton/loading UI.

No search results:

Show a useful empty state.

Cart empty:

Show an Amazon-style empty-cart experience.

API failure:

Show a clear retry message.

Out of stock:

Disable purchase actions appropriately.

---

# 26. IMAGES

Use high-quality real product/category photography.

Do not use:

* emoji as product images
* random generated illustrations
* generic gradient placeholders
* obvious AI-generated decorative artwork
* unrelated stock illustrations

Use product photography that visually resembles a real commerce catalog.

Do not use fake image URLs.

If an image source fails, provide a graceful fallback.

---

# 27. HERO SECTION

Create an Amazon-style promotional hero carousel.

Requirements:

* large commerce banner
* real product/category photography
* left/right controls
* multiple slides
* automatic rotation can be used
* manual navigation must work
* pause/interaction behavior should remain accessible

Do not create an artistic marketing landing page.

It must feel like a retail promotion.

---

# 28. PRODUCT CAROUSELS

Implement horizontally scrollable product sections.

Each carousel should include:

* title
* product cards
* previous button
* next button
* horizontal scrolling
* responsive behavior

Do not allow product cards to become excessively large.

---

# 29. CATEGORY CARDS

Create Amazon-style category cards.

Typical structure:

Heading

2x2 product/category image grid

"Shop now" / "See more" link

Cards should be square/flat with minimal radius.

Avoid modern floating SaaS cards.

---

# 30. FOOTER

Build a large Amazon-style footer.

Include:

Back to top

Get to Know Us

Make Money with Us

Amazon Payment Products

Let Us Help You

Language selector

Country selector

Currency selector

Amazon services/sub-brands

Copyright/legal links

The footer should be visually dense.

---

# 31. ERROR HANDLING

Implement proper frontend and backend error handling.

Backend:

* validation errors
* authentication errors
* missing product
* insufficient stock
* database errors

Frontend:

* loading
* errors
* retry
* empty states
* invalid routes

Create a proper 404 page.

---

# 32. PERFORMANCE

Prioritize:

* fast initial load
* optimized images
* lazy loading
* reusable components
* avoiding unnecessary API requests
* pagination where appropriate
* efficient MongoDB queries

Do not over-engineer.

---

# 33. CODE QUALITY

Use:

* meaningful component names
* meaningful variable names
* reusable functions
* environment variables
* clean folder structure
* no hardcoded secrets
* no duplicated API logic
* no unnecessary dependencies

Create:

.env.example

Never commit secrets.

---

# 34. PROJECT STRUCTURE

Prefer:

client/

src/
components/
pages/
layouts/
hooks/
context/
services/
utils/
assets/

server/

controllers/
models/
routes/
middleware/
services/
config/
utils/

Use a clean MERN architecture.

---

# 35. ENVIRONMENT VARIABLES

Example:

client:

VITE_API_URL=

server:

PORT=
MONGODB_URI=
JWT_SECRET=

Use environment variables instead of hardcoding secrets.

---

# 36. SEED DATA

Create a seed script.

The project should be easy to start with realistic products.

Include enough products to make the homepage and category pages feel populated.

Create realistic:

* names
* prices
* ratings
* reviews
* discounts
* categories
* stock
* images

Do not repeat the same product excessively.

---

# 37. HOME PAGE DENSITY

The homepage must not look empty.

Aim for a dense commerce page with:

* hero
* multiple category cards
* multiple product carousels
* deals
* bestsellers
* recommended products
* additional categories
* footer

The page should visually communicate a large marketplace.

---

# 38. AMAZON-STYLE DETAILS

Pay attention to details that make the experience feel authentic:

* compact header typography
* search-first layout
* cart count
* Prime-style delivery indicators
* blue commerce links
* yellow purchase buttons
* orange search accent
* rating stars
* review counts
* crossed-out original prices
* discount percentages
* delivery dates
* stock messaging
* "See more" links
* product badges
* category dropdown
* account navigation
* side drawer
* back-to-top footer
* dense footer navigation

These details matter.

---

# 39. DO NOT OVERBUILD LOW-VALUE FEATURES

Because this is a time-limited assignment, prioritize:

P0 — MUST WORK

* Homepage
* Header
* Search
* Product listing
* Product details
* Cart
* Authentication
* Checkout
* Orders
* MongoDB
* REST API
* Responsive UI
* Deployment readiness

P1 — SHOULD WORK

* filters
* sorting
* carousels
* side drawer
* account page
* order history
* delivery/location UI

P2 — ONLY IF TIME REMAINS

* advanced recommendations
* complex payment integration
* sophisticated personalization
* advanced seller functionality
* admin dashboard
* extensive review system
* advanced recommendation algorithms

Do not sacrifice P0 features for P2 features.

---

# 40. IMPORTANT ASSIGNMENT RULE

The application must be a real working product, not a screenshot or static mockup.

A reviewer should be able to:

1. Open the deployed website.
2. Browse products.
3. Search.
4. Open a product.
5. Add it to cart.
6. Change quantity.
7. Login/register.
8. Checkout.
9. Place an order.
10. View the order.

These flows must work.

---

# 41. VISUAL QUALITY BAR

Before considering the project complete, compare the implementation against Amazon's actual visual patterns.

Check:

* header height
* search width
* spacing
* typography
* colors
* product density
* card dimensions
* button appearance
* footer structure
* mobile behavior
* hover states
* focus states
* loading states

Fix visual inconsistencies.

Do not stop after creating a rough approximation.

---

# 42. FINAL QA

Before finishing, test:

AUTH

[ ] Register works
[ ] Login works
[ ] Logout works
[ ] Protected routes work

SEARCH

[ ] Search works
[ ] Empty search state works
[ ] Search results work

PRODUCTS

[ ] Product listing works
[ ] Product details work
[ ] Images work
[ ] Ratings display
[ ] Prices display
[ ] Stock works

CART

[ ] Add to cart works
[ ] Quantity increase works
[ ] Quantity decrease works
[ ] Remove works
[ ] Total updates

CHECKOUT

[ ] Address works
[ ] Order summary works
[ ] Place order works
[ ] Order is saved in MongoDB

ORDERS

[ ] Orders page works
[ ] Order details work

UI

[ ] Header resembles Amazon
[ ] Search is dominant
[ ] Navigation works
[ ] Side drawer works
[ ] Hero works
[ ] Carousels work
[ ] Footer works
[ ] Responsive layout works

ACCESSIBILITY

[ ] Keyboard navigation works
[ ] Focus states visible
[ ] Images have alt text
[ ] Buttons have accessible labels
[ ] Dialogs/drawers can close with Escape

---

# 43. DEPLOYMENT

Prepare the project for production deployment.

Frontend can be deployed using a suitable frontend hosting provider.

Backend can be deployed using a suitable Node.js hosting provider.

MongoDB should use MongoDB Atlas or another production-compatible MongoDB instance.

Make sure:

* production API URL works
* CORS is configured
* environment variables are configured
* MongoDB connection works
* authentication works in production
* frontend can communicate with backend
* no localhost URLs remain in production configuration

The final result must be accessible through a public HTTPS URL.

---

# 44. GIT WORKFLOW

Make logical commits throughout development.

Do not create one giant commit containing everything.

Use meaningful commit messages such as:

feat: create Amazon-style header
feat: add product API
feat: implement product details
feat: implement shopping cart
feat: add authentication
feat: implement checkout
fix: improve responsive product grid
fix: resolve cart quantity bug

Remember that the assignment requires `.agent-logs/` to remain committed.

Do not add `.agent-logs/` to `.gitignore`.

---

# 45. MOST IMPORTANT INSTRUCTION

Do not spend the entire available time perfecting one page.

Build the complete shopping journey first.

Priority:

Working product > complete core flow > visual fidelity > secondary features.

However, do not use "working functionality" as an excuse for poor UI.

The final product should have both:

1. Functional MERN architecture
2. High-fidelity Amazon-style UX/UI

---

# 46. EXECUTION PLAN

Work in this order:

PHASE 1
Inspect project and establish architecture.

PHASE 2
Set up React + Vite + styling.

PHASE 3
Set up Express + MongoDB + Mongoose.

PHASE 4
Create Product/User/Cart/Order models.

PHASE 5
Create product APIs and seed data.

PHASE 6
Build Amazon global header and navigation.

PHASE 7
Build homepage.

PHASE 8
Build product listing/search.

PHASE 9
Build product details.

PHASE 10
Build authentication.

PHASE 11
Build cart.

PHASE 12
Build checkout and orders.

PHASE 13
Build account/order history.

PHASE 14
Build footer, drawer, carousels and secondary interactions.

PHASE 15
Responsive and accessibility pass.

PHASE 16
Visual polish.

PHASE 17
Full QA.

PHASE 18
Production deployment preparation.

Do not wait until the end to discover that the backend or authentication is broken.

Continuously test the application while building.

---

# 47. WORKING STYLE

You are operating inside a time-limited assignment.

Be decisive.

Do not ask me unnecessary questions when a reasonable implementation decision can be made.

If multiple approaches are possible, choose the simplest production-quality approach that satisfies the requirements.

Do not spend excessive time explaining what you are going to do.

Actually implement it.

After each major phase:

1. Verify the application.
2. Fix obvious errors.
3. Continue to the next phase.

Never claim a feature works without checking it.

Never leave obvious broken buttons or dead navigation if the feature is part of the core flow.

---

# 48. START NOW

First inspect the existing repository and determine:

* current files
* current framework
* existing dependencies
* existing frontend
* existing backend
* existing database configuration
* existing agent-capture setup

Do not destroy working assignment infrastructure.

Then create a concise implementation plan and begin with the highest-priority working functionality.

Remember:

This is a high-fidelity Amazon.com clone.

MERN is mandatory.

The UI must feel like Amazon.

The core shopping journey must actually work.

The final application must be deployable.

Do not build a generic AI-generated e-commerce template.
