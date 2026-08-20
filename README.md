# AKS Garments — Official Online Fashion & Apparel Store

A premium single-page e-commerce application for Bangladeshi fashion — featuring artisanal panjabis, tailored formal shirts, festive salwar kameez, denim, kids' wear, and accessories.

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
- Size guide & "Outfit Matcher" quiz
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
│   └── StoreContext.tsx    # Global state (cart, wishlist, filters, orders, toasts)
├── data/                   # Products, hero slides, coupons, brands, store locations
├── utils/format.ts         # Price formatting (BDT/USD) & size calculator
└── types.ts                # All TypeScript interfaces
```

---

(c) 2026 AKS Garments (Bangladesh) Limited. All rights reserved.