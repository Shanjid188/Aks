# AKS Mart — Everyday Essentials Online Store

A fast, single-page e-commerce application for everyday Bangladeshi essentials — featuring curated food staples (SHUDDHO), handcrafted goods (AKS CRAFT), home & décor (AKS HOME), beauty (AKS BEAUTY), and custom printing (AKS PRINT).

## Tech Stack

- **React 19** + TypeScript
- **Vite 6** (dev server, build tool)
- **Tailwind CSS 4**
- **Motion** (animations)
- **Lucide React** (icons)

## Features

- Full product catalog with advanced filtering (category, brand, size, price, sale)
- Live search with autocomplete
- Shopping bag (cart) with coupons & BDT/USD currency toggle
- Wishlist & product comparison (up to 4 items)
- Product quick view + full product detail pages
- Checkout flow (bKash, Nagad, card, COD)
- Store locator (8 locations across Bangladesh)
- Order tracking
- Product Guide & Smart Finder quiz
- Client-side persistence via localStorage

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (port 3000)
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Build

```bash
npm run build     # outputs static site to dist/
npm run preview   # preview the production build locally
npm run lint      # type-check with tsc --noEmit
```

## Deploy

The app is a static SPA and can be deployed to **Vercel**, Netlify, or any static host.

```bash
npm run build
```

**Vercel:** push to GitHub → import repo → framework preset: **Vite** → build command: `npm run build` → output directory: `dist`.

## Project Structure

```
src/
├── App.tsx                 # Root layout: Header, sections, Footer, all modals
├── components/             # 18 UI components (Header, ProductGrid, CartDrawer, etc.)
├── context/
│   └── StoreContext.tsx    # Storefront state (cart, wishlist, filters, orders, toasts)
├── data/                   # Products, hero slides, coupons, brands, store locations
├── utils/format.ts         # Price formatting (BDT/USD) & size calculator
└── types.ts                # All TypeScript interfaces

server/                     # NEW — REST API (Express + Prisma + SQLite)
├── prisma/schema.prisma    # Database schema (products, orders, coupons, stores, reviews, admins)
├── prisma/seed.ts          # Seeds DB from src/data/* (16 products, 8 stores, 4 coupons, reviews, admin)
├── src/index.ts            # Express app (port 4000)
├── src/routes/             # auth, products, orders, coupons, stores, reviews, stats
└── scripts/smoke.ts        # End-to-end API test suite (17 checks)

admin/                      # React 19 admin panel (Vite, port 5173)
└── src/pages/              # Login, Dashboard, Products, Orders, Coupons, Boutiques, Reviews
```

## Backend API (server/)

```bash
# 1. Install + create DB + seed (first time only)
npm run setup:api

# 2. Start the API (http://localhost:4000)
npm run dev:api
```

**Admin login:** seeded on first boot — **change it immediately** on your server with
`server/prisma/set-admin-password.ts` (see `docs/DEPLOY_VPS.md`). Never ship default credentials.

Key endpoints:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/admin/auth/login` | — | Get a JWT |
| `GET /api/products` | — | Public catalog (same filters as storefront) |
| `POST /api/orders` | — | Place an order → returns tracking code |
| `GET /api/orders/track/:code` | — | Customer tracking |
| `POST /api/coupons/validate` | — | Validate promo code |
| `GET /api/admin/stats` | Bearer | Dashboard metrics |
| `/api/admin/products` | Bearer | Product CRUD |
| `/api/admin/orders` | Bearer | Order list + status updates |
| `/api/admin/coupons` | Bearer | Coupon CRUD |
| `/api/admin/stores` | Bearer | Boutique CRUD |
| `/api/admin/reviews` | Bearer | Review moderation |

## Admin Panel (React)

```bash
npm run dev:admin   # http://localhost:5173 (proxies /api → :4000)
```

The storefront currently uses local data (localStorage) with the same data
shapes as the API. Swapping it to `GET /api/products` / `POST /api/orders`
is a planned next step — all types and endpoints are already compatible.
See `docs/PROJECT_CONTEXT.md` for full architecture details.

> Dev database is SQLite for zero-setup. For production, change the Prisma
> provider to `postgresql` and set `DATABASE_URL` in `server/.env`.

---

(c) 2026 AKS Garments (Bangladesh) Limited. All rights reserved.