# StockFlow — SaaS Inventory Management MVP

A minimal multi-tenant inventory app built to the **StockFlow MVP (6-hr build) PRD v0.1**. A user signs up with their organization, manages products (name, SKU, quantity, prices), and sees a dashboard with inventory totals and low-stock items. Every record is scoped to the user's organization.

## Quick start (Windows)

1. Install [Node.js 22.13+](https://nodejs.org) (LTS recommended).
2. Double-click **`run.bat`**.

The script checks Node, installs dependencies on first run, builds the web app, starts the server, and opens <http://localhost:3000> in your browser. Press `Ctrl+C` in the window to stop.

- If StockFlow is already running, `run.bat` just opens it in the browser.
- If port 3000 is taken by another app, the server automatically uses the next free port (3001, 3002, …) and prints the URL.

### Logging in

On the login page click **Log in as demo user**. That's it — no typing needed. Or enter the credentials manually:

| Email                | Password   |
| -------------------- | ---------- |
| `demo@stockflow.app` | `demo1234` |

The demo account (organization "Demo Electronics Store" with 8 sample products, 4 of them low on stock) is created by the server on every start, and its password is reset to `demo1234` if it was changed, so this login always works. You can also click **Create an account** to start a fresh organization. Set `DEMO_ACCOUNT=off` to disable the demo account.

### Manual start (any OS)

```bash
npm install
npm run build      # build the React frontend into client/dist
npm start          # http://localhost:3000 (also creates the demo account)
```

For development with hot reload, run `npm run dev` (API on :3000) and `npm run dev:client` (Vite on :5173, proxies `/api`).

### Tests

```bash
npm test
```

The API test suite covers signup/login validation, product CRUD, unique SKU per organization, search, stock adjustments, dashboard low-stock logic, settings, and **cross-tenant isolation** (one organization cannot read, edit, adjust or delete another's products).

## Features (mapped to the PRD)

| PRD    | Feature                    | Implementation                                                                                                                                          |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1   | Signup & login             | Email, password, confirm password, organization name. bcrypt password hashing, JWT in an httpOnly cookie, server-side validation.                      |
| FR-2   | Organization context       | An organization is created on signup; every product query is filtered by `organization_id` from the session (never from client input).                |
| FR-3   | Product model              | Name, SKU (unique per org, case-insensitive), description, quantity on hand, cost/selling price, optional low-stock threshold, created/updated timestamps. |
| FR-4   | Product CRUD               | Product list with search (name or SKU), create/edit form, detail summary panel, delete with confirmation dialog.                                       |
| FR-5   | Stock updates              | Edit quantity directly, or use **Adjust stock** (+/- N units with a note). Stores `last_updated_by`, last note, and timestamp. Stock can't go negative. |
| FR-6   | Dashboard                  | Total products, total units on hand, low-stock count, stock value at cost, and a low-stock table (Name, SKU, Quantity, Threshold).                      |
| FR-7   | Settings                   | Organization-wide default low-stock threshold (default 5), used when a product has no threshold of its own.                                            |

A product is **low stock** when `quantity_on_hand <= COALESCE(product.low_stock_threshold, organization.default_low_stock_threshold)`.

## Tech stack

- **Backend:** Node.js + Express 5, SQLite via Node's built-in `node:sqlite` (no native build step), bcryptjs, jsonwebtoken.
- **Frontend:** React 19 + React Router, built with Vite, plain CSS (no UI framework).
- **Auth:** JWT session in an `httpOnly`, `SameSite=Lax` cookie (`Secure` automatically on HTTPS).

## Project structure

```
stockflow/
├── run.bat                 # One-click launcher for Windows
├── server/
│   ├── index.js            # HTTP server entry point
│   ├── app.js              # Express app (API + serves built frontend)
│   ├── config.js           # Paths, port, JWT secret
│   ├── db.js               # SQLite schema
│   ├── auth.js             # Session cookie + requireAuth middleware
│   ├── validation.js       # Input validation
│   ├── seed.js             # Demo account + sample products
│   └── routes/             # auth, products, dashboard, settings
├── client/
│   ├── index.html
│   └── src/
│       ├── pages/          # Login, Signup, Dashboard, Products, ProductForm, Settings
│       ├── components/     # Layout, Field, Dialog (confirm + adjust stock), StockBadge
│       ├── api.js          # fetch wrapper
│       └── auth.jsx        # auth context + route guards
├── tests/api.test.js       # End-to-end API tests (node:test)
├── render.yaml             # Render.com blueprint
└── Dockerfile
```

## API

All endpoints except signup/login/health require the session cookie. Errors return `{ error, fields? }` where `fields` maps form fields to messages.

| Method | Path                        | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/api/auth/signup`          | `{ email, password, confirmPassword, organizationName }` |
| POST   | `/api/auth/login`           | `{ email, password }`                         |
| GET    | `/api/auth/demo`            | Demo account credentials (if enabled)         |
| POST   | `/api/auth/demo`            | One-click login as the demo user              |
| POST   | `/api/auth/logout`          | Clear session                                 |
| GET    | `/api/auth/me`              | Current user + organization                   |
| GET    | `/api/dashboard`            | Summary totals + low-stock items              |
| GET    | `/api/products`             | List; `?search=` (name/SKU), `?lowStock=true` |
| POST   | `/api/products`             | Create product                                |
| GET    | `/api/products/:id`         | Product detail                                |
| PUT    | `/api/products/:id`         | Update product                                |
| POST   | `/api/products/:id/adjust`  | `{ delta, note? }` stock adjustment           |
| DELETE | `/api/products/:id`         | Delete product (hard delete)                  |
| GET    | `/api/settings`             | Organization settings                         |
| PUT    | `/api/settings`             | `{ defaultLowStockThreshold }`                |
| GET    | `/api/health`               | Health check                                  |

## Configuration

| Variable      | Default                 | Purpose                                                  |
| ------------- | ----------------------- | -------------------------------------------------------- |
| `PORT`        | `3000`                  | HTTP port                                                |
| `JWT_SECRET`  | auto-generated          | Session signing key. Generated into `data/.jwt-secret` if not set; **set it in production**. |
| `DATA_DIR`    | `./data`                | Where the SQLite database lives                          |
| `DB_PATH`     | `$DATA_DIR/stockflow.db`| Full database path (`:memory:` for tests)                |
| `DEMO_ACCOUNT`| on                      | Set to `off` to disable the demo account and demo button |

## Deployment

### Render (free tier)

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. `render.yaml` configures the build (`npm ci --include=dev && npm run build`), start command, health check, and a generated `JWT_SECRET`.
3. Open the generated `*.onrender.com` URL.

Render's free tier has an ephemeral filesystem, so the SQLite database resets when the service restarts or redeploys (the demo account is re-created on each start, so the demo login always works). Attach a persistent disk and set `DATA_DIR` to its mount path to keep data.

### Docker (Railway, Fly.io, any VPS)

```bash
docker build -t stockflow .
docker run -p 3000:3000 -e JWT_SECRET=change-me -v stockflow-data:/app/data stockflow
```

## Out of scope (per PRD §4)

Multi-warehouse, variants, channel integrations, orders, purchase orders/suppliers, email notifications, CSV import, public API, RBAC/multi-user orgs, audit logs/movement history, billing, and password reset.
