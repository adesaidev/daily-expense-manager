# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack business management app — React (Vite + TypeScript) frontend, Node.js/Express backend, PostgreSQL via Prisma ORM. Started as a daily expense tracker and has grown to include inventory management (SKUs, Purchases, Sell Orders) and a product catalog.

## Commands

### Development
```bash
# Run both servers together (from root)
npm run dev

# Run individually
npm run dev --workspace=server    # Express API on :5000
npm run dev --workspace=client    # Vite dev server on :5173
```

### Database
```bash
npm run db:migrate --workspace=server   # Run Prisma migrations
npm run db:generate --workspace=server  # Regenerate Prisma client after schema changes
npm run db:seed --workspace=server      # Seed default categories
npm run db:studio --workspace=server    # Open Prisma Studio GUI
```

### Build
```bash
npm run build   # Build both client and server
```

## Environment Setup

Copy `server/.env.example` → `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string. No client `.env` needed — Vite proxies `/api` to `:5000`.

## Architecture

### Monorepo
```
/client   React + Vite + Tailwind + React Query
/server   Express + Prisma + PostgreSQL
```

### Backend (`server/src/`)
- `index.ts` — Express app bootstrap (cors, helmet, morgan, routes)
- `routes/index.ts` — All route definitions mounted under `/api`
- `controllers/` — One file per domain: `expenses`, `categories`, `recurring`, `analytics`, `merchants`, `skus`, `purchases`, `sellOrders`, `products`, `uploads`
- `lib/prisma.ts` — Singleton Prisma client
- `lib/upload.ts` — Multer config (bill images + product images)
- `middleware/errorHandler.ts` — Global error + 404 handler
- `seed.ts` — Seeds 8 default categories

### Frontend (`client/src/`)
- `main.tsx` — React root, QueryClient, BrowserRouter, route tree
- `lib/api.ts` — All Axios API calls (typed, returns unwrapped data)
- `lib/utils.ts` — `formatCurrency` (INR), `formatDate`, `cn` (class merging)
- `types/index.ts` — All shared TypeScript interfaces
- `components/Layout.tsx` — Sidebar nav shell, `<Outlet />` for pages
- `components/ExpenseForm.tsx` — Shared form used in both create and edit modals
- `components/ui/` — Button, Card, Modal, Badge, CalendarPicker primitives
- `pages/` — Dashboard, Expenses, Recurring, Merchants, Categories, Analytics, Products, SKUs, Purchases, SellOrders

### Data Flow
React Query fetches → `lib/api.ts` axios calls → Vite proxy `/api` → Express routes → Prisma → PostgreSQL.

### Domain Model
Two largely separate concerns share the same app:

**Expense tracking**: `Expense` → `Category`, optional `Merchant`, optional `Recurring`. Bill images stored in `server/uploads/`.

**Inventory**: `SKU` (stock unit) is the central inventory entity. `Purchase` + `PurchaseItem` records incoming stock; `SellOrder` + `SellOrderItem` records outgoing stock. Both item types reference `SKU` and cascade-delete with their parent order. `Product` is a separate marketing/catalog entity (dimensions, GST, images) not linked to `SKU` in the schema.

## Key Conventions

- Currency is INR, formatted via `formatCurrency()` in `lib/utils.ts`
- All monetary amounts (`amount`, `totalAmount`, `unitPrice`, etc.) are `Decimal(10,2)` in the DB and arrive as **strings** in API responses — always `Number(x)` before arithmetic
- Recurring expense processing is manual (`POST /api/recurring/process`) — not a cron job
- `Merchant` is optional on expenses and purchases; deleting a merchant unlinks (nullifies) rather than cascading
- Merchant breakdown endpoint is `GET /api/merchants/breakdown` — registered before `/:id` in routes to avoid param collision; same pattern applies to `GET /expenses/export`
- `paymentStatus` is `PENDING | COMPLETED` (default COMPLETED), filterable via `?paymentStatus=` on expenses
- `paymentType` is `CASH | UPI | BANK_TRANSFER | CARD` (nullable)
- Bill images: stored in `server/uploads/`, max 5 MB, images + PDF; upload via `POST /api/expenses/:id/upload` (multipart field `bill`); delete via `DELETE /api/expenses/:id/bill`; path saved as `billImagePath` on Expense
- Product images: upload via `POST /api/products/:id/image` (multipart field `image`); delete via `DELETE /api/products/:id/image`; path saved as `imagePath` on Product
- Vite proxies both `/api` and `/uploads` to `:5000` — use relative paths like `/uploads/file.jpg` in the frontend, never `http://localhost:5000/...`
- Day-wise filter on expenses: `?day=N&month=M&year=Y` — all three required
- **Paginated** (20/page): expenses, purchases, sell orders. **Not paginated**: analytics, categories, merchants, skus, products
- QueryClient default: `staleTime: 30_000, retry: 1`
