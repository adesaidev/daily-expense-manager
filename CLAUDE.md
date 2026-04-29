# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Daily Expense Manager — React (Vite + TypeScript) frontend, Node.js/Express backend, PostgreSQL via Prisma ORM.

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
- `controllers/` — One file per domain: `expenses`, `categories`, `recurring`, `analytics`, `merchants`
- `lib/prisma.ts` — Singleton Prisma client
- `middleware/errorHandler.ts` — Global error + 404 handler
- `seed.ts` — Seeds 8 default categories

### Frontend (`client/src/`)
- `main.tsx` — React root, QueryClient, BrowserRouter, route tree
- `lib/api.ts` — All Axios API calls (typed, returns unwrapped data)
- `lib/utils.ts` — `formatCurrency` (INR), `formatDate`, `cn` (class merging)
- `types/index.ts` — All shared TypeScript interfaces
- `components/Layout.tsx` — Sidebar nav shell, `<Outlet />` for pages
- `components/ExpenseForm.tsx` — Shared form used in both create and edit modals
- `components/ui/` — Button, Card, Modal, Badge primitives
- `pages/` — Dashboard, Expenses, Recurring, Merchants, Categories, Analytics

### Data Flow
React Query fetches → `lib/api.ts` axios calls → Vite proxy `/api` → Express routes → Prisma → PostgreSQL.

### Key Conventions
- Currency is INR, formatted via `formatCurrency()` in `lib/utils.ts`
- Amounts stored as `Decimal(10,2)` in DB, arrive as strings in API responses — always `Number(expense.amount)` before arithmetic
- Recurring expense processing is manual (POST `/api/recurring/process`) — not a cron job yet
- `Merchant` is optional on expenses (`merchantId` nullable); deleting a merchant unlinks its expenses rather than cascading
- Merchant breakdown endpoint is at `GET /api/merchants/breakdown` (not under `/analytics`) — must be registered before `/:id` in routes to avoid param collision
- `paymentStatus` is a `PaymentStatus` enum (PENDING | COMPLETED), default COMPLETED — stored in DB, filterable via `?paymentStatus=` query param
- Bill images are stored in `server/uploads/` (max 5 MB, images + PDF); path saved as `billImagePath` on Expense; served as static files at `/uploads/`; upload via `POST /api/expenses/:id/upload` (multipart `bill` field); delete via `DELETE /api/expenses/:id/bill`
- Vite proxies both `/api` and `/uploads` to `:5000` — use relative paths like `/uploads/file.jpg` everywhere in the frontend, not `http://localhost:5000/...`
- Day-wise filter on expenses: pass `?day=N&month=M&year=Y` — all three required for a single-day query
- Expense list is paginated (20/page); analytics endpoints are not paginated
- Vite proxy handles `/api` → `:5000` in dev; in production, configure a reverse proxy or set `VITE_API_URL`
