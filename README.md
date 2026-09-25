# Amazon Clone — MERN

A high-fidelity Amazon-inspired shopping experience built with React, Vite, Express, MongoDB, and Mongoose. The project includes a dense responsive storefront, real REST endpoints, product search and filtering, guest/authenticated carts, checkout, and order history.

## Stack

- **Frontend:** React 18, Vite, React Router, Axios, Lucide React, structured CSS
- **Backend:** Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs
- **Repository:** npm workspaces with `client/` and `server/`

## Run locally

1. Copy environment files:

   ```powershell
   Copy-Item server/.env.example server/.env
   Copy-Item client/.env.example client/.env
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Start MongoDB locally (or set `MONGODB_URI` in `server/.env`). The API intentionally remains usable with a demo catalog when MongoDB is unavailable, which makes the UI easy to preview before configuring a database.

4. Seed the catalog after MongoDB is running:

   ```powershell
   npm run seed
   ```

5. Start both applications:

   ```powershell
   npm run dev
   ```

   - Frontend: `http://localhost:5173`
   - API: `http://localhost:5000/api`
   - Health check: `http://localhost:5000/api/health`

## Core routes

- `/` — dense Amazon-style home page
- `/search` and `/category/:category` — catalog, search, sorting, and filters
- `/product/:id` — gallery, pricing, stock, quantity, add-to-cart, and Buy Now
- `/cart` — persistent guest/account cart and quantity controls
- `/login`, `/register` — JWT authentication
- `/checkout` — address, simulated payment, and order creation
- `/account` and `/account/orders` — account and order history

## Environment

See `client/.env.example`, `server/.env.example`, and the root `.env.example`. Never commit real secrets or a production JWT secret.

## Quality and capture records

The project includes responsive states, keyboard-visible focus styles, loading/empty/error states, and the automatic agent capture setup required by the assignment. Raw agent exchanges are stored in `.agent-logs/` and are intentionally not ignored.
