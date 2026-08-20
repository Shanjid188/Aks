# AKS Garments — Project Context & Developer Guide

> **Purpose:** This file is a persistent reference for AI assistants and developers working on this codebase. Read this first before making any changes. Update it whenever the project structure or architecture changes.

---

## 1. PROJECT OVERVIEW

| Field | Value |
|---|---|
| **Project Name** | AKS Garments (package: `aks-garments`) |
| **Directory** | `d:\Downloads\bata-footwear-&-accessories-store` |
| **Git Remote** | `https://github.com/Shanjid188/Aks.git` |
| **Type** | Single-page e-commerce store (apparel/fashion) |
| **Locale** | Bangladesh — prices in ৳ BDT, stores across BD, bKash/Nagad/COD |
| **Current Status** | Functional demo e-commerce app, Vercel-ready |

> ⚠️ **Directory name mismatch:** The folder is named `bata-footwear-&-accessories-store` but the app is branded **AKS Garments** — a clothing store (panjabis, shirts, sarees, denim). The `src/assets/images/` contains footwear-themed images.

> ✅ **DEPLOYMENT READY:** Configured for **Vercel** (`vercel.json`: `buildCommand: npm run build`, `outputDirectory: dist`, SPA rewrite to `/index.html`). The `&` in the directory path breaks npm's `.bin` PATH resolution on Windows `cmd.exe`; all npm scripts now invoke JS entry files directly via `node node_modules/...` (works on both Windows and Vercel Linux).

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| **Framework** | React 19 (`^19.0.1`) with TypeScript (`~5.8.2`) |
| **Build Tool** | Vite 6 (`^6.2.3`) |
| **Styling** | Tailwind CSS 4 (`^4.1.14`) via `@tailwindcss/vite` |
| **Icons** | `lucide-react` (`^0.546.0`) |
| **Animations** | `motion` (`^12.23.24`) — import `from 'motion/react'` |
| **Font** | Plus Jakarta Sans (Google Fonts, loaded in `index.html`) |
| **Dev tools** | TypeScript (`tsc`), esbuild, tsx, autoprefixer |

**Scripts** (`package.json`):
- `npm run dev` → Vite on **port 3000** via `node node_modules/vite/bin/vite.js`
- `npm run build` → Vite build via `node node_modules/vite/bin/vite.js build`
- `npm run preview` → Vite preview via `node node_modules/vite/bin/vite.js preview`
- `npm run lint` → `tsc --noEmit` via `node node_modules/typescript/bin/tsc`

> ⚠️ **Important:** All scripts invoke JS entry files directly with `node node_modules/...` because the folder path contains `&` which `cmd.exe` treats as a command separator — breaking npm's `.bin` PATH prefix. Do NOT change these back to shorthand (`vite`, `tsc`) or the build will fail on Windows.

---

## 3. FULL FILE STRUCTURE (current)

```
bata-footwear-&-accessories-store/
├── .gitignore
├── .env.example                  # APP_URL only (AI Studio / Gemini references removed)
├── index.html                    # Entry HTML — title "AKS Garments", OG tags, +Jakarta font
├── metadata.json                 # Project metadata (AI Studio capability removed)
├── package.json
├── package-lock.json
├── README.md                     # Custom project README (AI Studio boilerplate removed)
├── tsconfig.json
├── vite.config.ts                # Vite + Tailwind + React; alias '@' → root
├── vercel.json                   # Vercel deployment config (SPA rewrite)
├── assets/                       # ⚠ EMPTY directory
├── docs/
│   └── PROJECT_CONTEXT.md        # ← This file
└── src/
    ├── App.tsx                   # Layout: Header → Hero → CategoryGrid → BrandBar → ProductGrid → Footer + ALL modals
    ├── index.css                 # Tailwind entry
    ├── main.tsx                  # createRoot(StrictMode)
    ├── types.ts                  # All interfaces (Product, CartItem, Order, etc.)
    ├── vite-env.d.ts
    ├── assets/
    │   └── images/
    │       ├── hero_footwear_showcase_1786895779693.jpg     # Now used by slide-1 in promos.ts
    │       ├── leather_craft_banner_1786895833994.jpg       # Used by slide-3 in promos.ts
    │       ├── marie_claire_chic_1786895817363.jpg          # Used by slide-2 in promos.ts
    │       └── power_athletic_banner_1786895795947.jpg      # Used by slide-4 in promos.ts
    ├── components/               # 18 components (see §6)
    │   ├── BataClubModal.tsx
    │   ├── BrandBar.tsx
    │   ├── CartDrawer.tsx
    │   ├── CategoryVisualGrid.tsx
    │   ├── CheckoutModal.tsx
    │   ├── CompareModal.tsx
    │   ├── Footer.tsx
    │   ├── Header.tsx
    │   ├── HeroSlider.tsx
    │   ├── OrderTrackerModal.tsx
    │   ├── ProductCard.tsx
    │   ├── ProductDetailModal.tsx
    │   ├── ProductDetailPage.tsx
    │   ├── ProductGrid.tsx
    │   ├── ShoeFinderModal.tsx
    │   ├── SizeGuideModal.tsx
    │   ├── StoreLocatorModal.tsx
    │   └── ToastContainer.tsx
    ├── context/
    │   └── StoreContext.tsx      # Global state (512 lines) — see §7
    ├── data/
    │   ├── products.ts           # 14 products + INITIAL_REVIEWS (1031+ lines)
    │   ├── promos.ts             # HERO_SLIDES, VALID_COUPONS, BRAND_INFOS (images FIXED)
    │   └── stores.ts             # 8 store locations
    └── utils/
        └── format.ts             # formatPrice(), calculateShoeSizeFromFootLength()
```

---

## 4. TYPES (`src/types.ts`)

### Categories

```ts
type CategoryType = 'all' | 'men' | 'women' | 'kids' | 'festive' | 'accessories';
```

### Brands

```ts
type BrandName =
  | 'AKS Heritage' | 'AKS Studio' | 'AKS Signature'
  | 'AKS Riva' | 'AKS Denim Co.' | 'AKS Junior' | 'AKS Essentials';
```

### Key Interfaces

- **Product** — id, name, slug, brand, category, subcategory, price, originalPrice, discountPercent, rating, reviewsCount, flags (`isNewArrival`, `isBestSeller`, `isTrending`, `isClearance`), featuredOrder, description, features[], materials{fabric, weave, lining, care, upper?, sole?, insole?}, fit, pattern, sleeve, colors[], sizes[], images[], tags[], occasion, cushionTech, sku
- **ProductColor** — `{ name, hex, image }`
- **ProductSize** — `{ size, chestInches?, lengthInches?, waistInches?, eu?, uk?, us?, inStock, stockCount }`
- **CartItem** — `{ cartItemId, product, selectedColor, selectedSize, quantity, addedAt }`
- **FilterState** — category, subcategory, brand[], priceRange, sizes[], colors[], sortOption, ratingMin, inStockOnly, onSaleOnly, searchQuery
- **Order** — id, items, shippingAddress, deliveryMethod, paymentMethod, subtotal, discount, shippingFee, couponApplied?, total, status (`confirmed|processing|shipped|out_for_delivery|delivered`), createdAt, trackingCode, estimatedDelivery
- **StoreLocation** — id, name, division, district, area, address, phone, openingHours, features, lat, lng, isFlagship?
- **Coupon** — `{ code, discountType: 'percent'|'fixed', value, minSpend, description }`
- **CurrencyMode** — `'BDT' | 'USD'`

---

## 5. DATA

### Products (`src/data/products.ts`)
- **14 products** + `INITIAL_REVIEWS` (1031+ lines total)
- Products use **Unsplash remote image URLs** (NOT local images)
- Distribution:
  - **Men** (8): prod-m-01 → prod-m-08
  - **Women** (4): prod-w-01 → prod-w-04
  - **Kids** (2): prod-k-01, prod-k-02
  - **Accessories** (2): prod-a-01, prod-a-02
- All products have `featuredOrder` 1–16

### Promotions (`src/data/promos.ts`)
- **HERO_SLIDES** — 4 slides, each with `ctaCategory`, optional `ctaSubcategory`, `ctaBrand`
- **VALID_COUPONS** — `AKS15` (15% ≥ ৳2500), `WELCOME10` (10% ≥ ৳1500), `EID2026` (৳600 off ≥ ৳4000), `FREESHIP` (free express)
- **BRAND_INFOS** — 7 AKS brands with tag/desc/logoText/accent color

> ✅ **FIXED (2026-08-20):** The 4 broken image imports (`aks_hero_garments_showcase...`, `aks_heritage_panjabi_banner...`, etc.) were replaced with the 4 available local images (`hero_footwear_showcase...`, `marie_claire_chic...`, `leather_craft_banner...`, `power_athletic_banner...`) so the build/dev server works again.

### Stores (`src/data/stores.ts`)
- 8 AKS stores across BD: 5 Dhaka, 1 Chittagong, 1 Sylhet, 1 Rajshahi
- Flagships: Gulshan-1, Bashundhara City, Jamuna Future Park, GEC Circle

---

## 6. COMPONENTS (`src/components/`)

| Component | Purpose | Key Store Hooks Used |
|---|---|---|
| **Header** | Sticky header, rotating announcements, live search with autocomplete, mega menus, currency toggle | `setIsCartDrawerOpen`, `setIsStoreLocatorOpen`, `setIsBataClubOpen`, `setIsOrderTrackerOpen`, `setIsShoeFinderOpen`, `setIsCompareModalOpen`, `setIsSizeGuideOpen`, `setFilters` |
| **HeroSlider** | 4-slide carousel auto-rotates every 6s | `setFilters`, `setActiveProductPage` |
| **CategoryVisualGrid** | 6 tiles → sets category filter & scrolls to grid | `setFilters` |
| **BrandBar** | 7 brand selectors | `setFilters` |
| **ProductGrid** | Catalog with sidebar filters (brand/size/sale) + sort + view layout | `products`, `filters`, `setFilters` |
| **ProductCard** | Grid/list product card, color swatches, quick-add size overlay, wishlist, compare | `addToCart`, `toggleWishlist`, `openQuickView`, `setActiveProductPage` |
| **ProductDetailPage** | Full page when a product is active | `activeProductPage` |
| **ProductDetailModal** | Quick view modal | `isQuickViewOpen`, `quickViewProduct` |
| **CartDrawer** | Right drawer with promo code, free-shipping progress, item list | `cart`, `applyCoupon`, `setIsCheckoutOpen` |
| **CheckoutModal** | Full checkout flow | `createOrder` |
| **SizeGuideModal** | Garment size chart modal | `isSizeGuideOpen` |
| **StoreLocatorModal** | Store finder list/map | `stores` |
| **BataClubModal** | Loyalty/rewards modal | `isBataClubOpen` |
| **OrderTrackerModal** | Track order status | `orders` |
| **ShoeFinderModal** | "Outfit Matcher" 3-question quiz → recommends products | `isShoeFinderOpen`, `products` |
| **CompareModal** | Compare up to 4 products | `compareList` |
| **ToastContainer** | Toast notification stack | `toasts`, `removeToast` |

---

## 7. GLOBAL STATE (`src/context/StoreContext.tsx`)

### Persisted to localStorage (key prefix `aks_`):
| Key | Data |
|---|---|
| `aks_cart` | CartItem[] |
| `aks_wishlist` | WishlistItem[] |
| `aks_reviews` | Review[] |
| `aks_recent_viewed` | Product[] (max 8) |
| `aks_orders` | Order[] |

> Backward compat: reads also check `bata_` prefixed keys (e.g. `bata_cart`).

### Key logic:
- **Free shipping** threshold: `৳2500`; standard shipping fee `৳120`
- **Coupon math** in `applyCoupon()` — FREESHIP sets discount 0, handled as free shipping
- **Compare limit**: max 4 products (toast warning when exceeded)
- `addToCart` auto-adds product to recentlyViewed
- `createOrder` generates `trackingCode` = `AKS-BD-XXXXXX`, status = `'confirmed'`
- `addReview` prepends review with `id: rev-{Date.now()}`

---

## 8. UTILITIES (`src/utils/format.ts`)

```ts
formatPrice(amount, currency = 'BDT') → string
// BDT: '৳5,000'  |  USD: '$41.50' (amount * 0.0083 rate)

calculateShoeSizeFromFootLength(lengthCm) → { eu, uk, usMen, usWomen, cm, inches }
```

---

## 9. KNOWN ISSUES / TODOS

1. **Name mismatch** — directory says "bata footwear" but app is "AKS Garments" apparel.
2. **`CategoryType` includes `'festive'`** — no product data uses it.
3. **`ShoeFinderModal`** — occasion filter uses exact `p.occasion` matches that often don't match; falls back to fallback products.
4. **No routing** — `activeProductPage` is state-based navigation, no React Router installed.
5. **`BataClubModal`** file name is a leftover from an earlier "Bata" branding.
6. **Wishlist heart in Header opens CartDrawer** — possible bug (no dedicated wishlist view).
7. **Vite chunk size warning** — main JS bundle is 564 kB (gzip 155 kB); could use code-splitting for modals.

---

## 10. QUICK REFERENCE

| Task | File(s) |
|---|---|
| Add a product | `src/data/products.ts` (follow pattern; assign `featuredOrder`) |
| Add hero slide | `src/data/promos.ts` |
| Add coupon | `src/data/promos.ts` |
| Add store location | `src/data/stores.ts` |
| Add a component | create in `src/components/`, import in `App.tsx` |
| Add global state | extend `StoreContextType` + provider in `StoreContext.tsx` |
| Change colors | Tailwind classes using `#[D8232A]` primary (red), `#b51c22` hover |
| Price discounts | compute via `discountPercent` field on product |
| Update styling | Tailwind 4 — theme config in `index.css` (no tailwind.config file) |
| Deploy to Vercel | push to GitHub → import → preset Vite; `vercel.json` handles SPA rewrite |

---

*Docs last updated: 2026-08-20 (post-cleanup: AI Studio traces removed, images fixed, Vercel-ready)*