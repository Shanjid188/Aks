# AKS Mart — Project Context & Developer Guide

> **Purpose:** This file is a persistent reference for AI assistants and developers working on this codebase. Read this first before making any changes. Update it whenever the project structure or architecture changes.

---

## 1. PROJECT OVERVIEW

| Field | Value |
|---|---|
| **Project Name** | AKS Mart (package: `aks-mart`) |
| **Directory** | `d:\Downloads\bata-footwear-&-accessories-store` |
| **Git Remote** | `https://github.com/Shanjid188/Aks.git` |
| **Type** | Single-page e-commerce store (apparel/fashion) |
| **Locale** | Bangladesh — prices in ৳ BDT, stores across BD, bKash/Nagad/COD |
| **Current Status** | Functional demo e-commerce app, Vercel-ready |

> ⚠️ **Directory name mismatch:** The folder is named `bata-footwear-&-accessories-store` but the app is branded **AKS Mart** — a multi-division mart (SHUDDHO food, AKS CRAFT handicrafts, AKS HOME & living, AKS BEAUTY personal care, AKS PRINT custom printing).

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
├── index.html                    # Entry HTML — title "AKS Mart", OG tags, +Jakarta font
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
    ├── components/               # 33 components (see §6)
    │   ├── BestSellers.tsx
    │   ├── Bi.tsx                # BN/EN localised inline text helper
    │   ├── BrandMarquee.tsx
    │   ├── CartDrawer.tsx
    │   ├── CategoryVisualGrid.tsx # "Many Worlds, One Mart"
    │   ├── ContactForm.tsx
    │   ├── FeaturedProducts.tsx
    │   ├── Footer.tsx
    │   ├── Header.tsx
    │   ├── HeroSideBanners.tsx
    │   ├── HeroSlider.tsx
    │   ├── HomeProductCard.tsx
    │   ├── Localized.tsx         # useLocalized() / t()
    │   ├── Logo.tsx
    │   ├── NewArrivals.tsx
    │   ├── ProductCard.tsx
    │   ├── ProductDetailModal.tsx
    │   ├── ProductDetailPage.tsx
    │   ├── ProductGrid.tsx
    │   ├── ProductShowcaseCircle.tsx # "Loved by our customers"
    │   ├── PromoCampaign.tsx
    │   ├── PromoGallery.tsx
    │   ├── PromotionBanner.tsx
    │   ├── SectionHeader.tsx
    │   ├── SizeGuideModal.tsx
    │   ├── Skeleton.tsx          # SkeletonBlock / ProductRailSkeleton / HeroSkeleton / SectionSkeleton
    │   ├── ToastContainer.tsx
    │   ├── TrustBar.tsx
    │   └── WishlistDrawer.tsx
    ├── context/
    │   └── StoreContext.tsx      # Global state (831 lines) — see §7
    ├── lib/
    │   ├── apiCache.ts           # localStorage stale-while-revalidate cache (instant repeat paints)
    │   ├── dataLoader.ts         # API reads with bundled fallbacks + cache writes
    │   ├── router.tsx            # Tiny history router (no react-router)
    │   └── seo.ts                # Runtime <head> manager
    ├── data/
    │   ├── products.ts           # 14 products + INITIAL_REVIEWS (1031+ lines)
    │   ├── promos.ts             # HERO_SLIDES, VALID_COUPONS, BRAND_INFOS (images FIXED)
    │   └── stores.ts             # 8 store locations
    └── utils/
        ├── format.ts             # formatPrice(), calculateShoeSizeFromFootLength()
        └── stock.ts              # stockLeft(), isOutOfStock(), maxOrderableQty() — stock guards
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
- **SIDE_BANNERS** — fallback tiles for the hero's side column (Admin → Hero Slides → Side banners overrides them with the merchant's image-only banners)
- **PROMO_GALLERY** — fallback artwork for the homepage promo gallery above the footer (Admin → **Gallery Images** overrides it — upload only, no form; promo rows in Admin → Storefront → Promotions are used as a second option when the gallery is empty)
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
| **Header** | Logo + name top bar, scrolling announcement marquee (messages follow one another side to side), live search with autocomplete, mega menus, Track Order / currency / language actions left of the wishlist-labelled heart, mobile category drawer | `setIsCartDrawerOpen`, `setIsWishlistDrawerOpen`, `setIsSizeGuideOpen`, `setIsMobileMenuOpen`, `setFilters` |
| **Footer** | Simple, classic footer (newsletter band, service highlights, brand card and motto quote removed): one **brand block** (logo → home, brand text, address/phone/email, "Follow Us" + social icons, compact newsletter) beside **4 link columns** (Information / Shop By / Support / Consumer Policy — a column hides itself when empty), then the bottom bar with the copyright line and the flat "Pay with" strip (brand badges from `src/data/payments.ts` + live methods from Admin → Settings) | `categories`, `dataLoader.loadPages/loadStoreInfo`, `splitFooterPages` |
| **TrustBar / BrandMarquee / SectionHeader / PromotionBanner** | Small shared homepage furniture: service promises, scrolling brand strip, the recurring diamond section heading, and the slim promo strip | — |
| **Skeleton** | Loading placeholders (`SkeletonBlock`, `ProductRailSkeleton`, `HeroSkeleton`, `SectionSkeleton`) rendered while `catalogLoading` is true (or while a lazily-loaded section chunk arrives), so bundled fallback artwork never flashes before the API answers | — |
| **HeroSlider** | 4-slide carousel auto-rotates every 6s | `setFilters`, `setActiveProductPage` |
| **HeroSideBanners** | Image-only banner column beside the hero carousel (Admin → Hero Slides → Side banners; bundled `SIDE_BANNERS` promo tiles show until banners are uploaded) | — |
| **PromoGallery** | Closing homepage section above the footer: image-only bento grid (wide banner + two squares + tall column) fed by Admin → Gallery Images (fallback: promo artwork, then bundled division banners), with a copy-editable heading above it | `dataLoader.loadGalleryBanners` |
| **CategoryVisualGrid** | "Many Worlds, One Mart" — rounded rail of compact division cards (5 per view on desktop, 3 on tablet, peek on phones; snap scroll + clickable dots once the rail overflows; section head with the "see all" pill) → navigates to /category/:slug. One card per division from **Admin → Categories**: card picture = `gridImage` (falls back to `image`), plus name, badge chip, tagline and live product count. Adding/renaming a division there changes this rail immediately | `categories`, `products` |
| **PromoCampaign** | "Active Offers" section: shows uploaded artwork from Admin → Offer Images first (1 wide banner + up to 3 tiles), otherwise the coupon tickets with copyable codes from Admin → Coupons | `dataLoader.loadOfferBanners`, `dataLoader.loadCoupons` |
| **ProductShowcaseCircle** | "Loved by our customers" circle showcase (above Best Sellers): hero product in the big ring + 4 callouts with full details; items are the merchant's pasted product links (Admin → Loved Products), auto-picking trending favourites while empty | `products`, `dataLoader.loadLoveBanners` |
| **BrandBar** | 7 brand selectors | `setFilters` |
| **ProductGrid** | Catalog with sidebar filters (brand/size/sale) + sort + view layout | `products`, `filters`, `setFilters` |
| **ProductCard** | Grid/list product card, color swatches, quick-add size overlay, wishlist | `addToCart`, `toggleWishlist`, `openQuickView`, `setActiveProductPage` |
| **ProductDetailPage** | Full page when a product is active | `activeProductPage` |
| **ProductDetailModal** | Quick view modal | `isQuickViewOpen`, `quickViewProduct` |
| **CartDrawer** | Right drawer with promo code, free-shipping progress, item list | `cart`, `applyCoupon`, `setIsCheckoutOpen` |
| **CheckoutModal** | Full checkout flow | `createOrder` |
| **SizeGuideModal** | Garment size chart modal | `isSizeGuideOpen` |
| **StoreLocatorModal** | Store finder list/map | `stores` |
| **OrderTrackerModal** | Track order status | `orders` |
| **MobileBottomNav** | Sticky bottom bar on <lg (Home · Categories · Cart · Search · Account): Categories toggles the header category drawer, Search focuses the header search box, Account opens a bottom sheet; desktop-only floating/header carts hidden below lg | `isMobileMenuOpen`, `setIsMobileMenuOpen`, `requestMobileSearchFocus` |
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
- **Stock guard** — `addToCart` refuses a stock-tracked product/size that has nothing left
  (and clamps the quantity to what is left) with an explanatory toast, so a cart can never
  hold an unbuyable line. Truth comes from `src/utils/stock.ts`; see *Ordering & stock truth* below.

---

### Performance — first paint (2026-09-30)

Loading used to wait for a single huge JS file (storefront 684 kB, admin 616 kB) because
every page, modal and section was imported eagerly. Now the shell paints first and the rest
arrives on demand:

| Measure | Before | After |
|---|---|---|
| Storefront entry JS | 683.55 kB (gzip 190.16) | **166.02 kB (gzip 47.57)** |
| Admin entry JS | 616.03 kB (gzip 148.83) | **43.73 kB (gzip 11.78)** |
| Production build time | ~39 s / ~38 s | ~9 s / ~5 s |

- **Route + section code splitting** — `src/App.tsx` keeps the home page and shell only; every
  other page and all modals (`CartDrawer`, `ProductDetailModal`, `CheckoutPage`, …) load on
  demand. `src/pages/HomePage.tsx` keeps `HeroSlider` eager and lazy-loads the seven sections
  with `SectionSkeleton` placeholders.
- **Admin module splitting** — `admin/src/App.tsx` lazy-loads all 30 modules (only `LoginPage`
  and the shell are eager) behind a `<Suspense>` spinner in `<main>`.
- **Vendor chunks + dev warmup** — both Vite configs split `react` / `motion` / `lucide-react`
  into cacheable chunks, `optimizeDeps.include` pre-bundles them, and `server.warmup` compiles
  the above-the-fold files when the dev server starts.
- **Stale-while-revalidate cache** — `src/lib/apiCache.ts` mirrors successful public GETs in
  `localStorage` (7-day cap, versioned key `aks_cache_v1_`). `StoreContext` and
  `SiteContentContext` seed their first render from it, so a repeat visit shows the real shop
  immediately and revalidates in the background; `catalogLoading` starts `false` when a cached
  catalogue exists (no skeletons — and still no bundled-artwork flash). If the API is
  unreachable, the last good payload is served instead of an error. Admin requests are never
  cached, so back-office screens always show live data.
- Still heavy on the storefront critical path: `motion` (129.61 kB / 42.75 kB gzip) is used by
  `Header` and `HeroSlider`; replacing those few animations with CSS would trim it further.

---

### Ordering & stock truth (2026-09-30)

"Place order" used to fail with a generic *"We couldn't place your order right now"* for one
specific reason that the UI hid: **the API refuses to sell a stock-tracked product with no
units left**, e.g.

```
POST /api/orders → 400 {"error":"Premium Miniket Rice (5 kg) doesn't have enough stock (available: 0, ordered: 1)"}
```

The endpoint was never broken (valid payloads still return `201` + `order`); the storefront just
swallowed the server's explanation. Three layers now tell the truth instead:

| Layer | Where | Behaviour |
|---|---|---|
| Prevent | `StoreContext.addToCart` + `ProductCard` badge | A tracked product/size with 0 left cannot be added — toast explains why, quantity is clamped to `stockLeft` when fewer units remain than requested, and the card shows an **Out of stock** badge |
| Pre-flight | `CheckoutPage.handlePlaceOrder` (before `createOrder`) | Finds the first cart line whose `quantity > maxOrderableQty(item)` and shows a per-item message ("… is out of stock right now. Please remove it from your bag." / "Only N left of … — please lower the quantity…") without emptying the cart |
| Honest failure | `CheckoutPage` + `StoreContext.createOrder` catch blocks | `apiErrorMessage(e, fallback)` from `src/api.ts` surfaces the API's own sentence (stock, delivery area, payment method, coupon…) instead of a generic one |

- `trackStock` / `stockQuantity` travel with every product (`ApiProduct` → `adaptProduct` →
  `Product`), so the guard is accurate.
- Untracked products (`trackStock !== true`) are never blocked — many have `stockQuantity: 0`
  purely because nothing is tracked for them.
- ⚠️ **Merchant action:** `AKM-FOO-001` (*Premium Miniket Rice (5 kg)*) is tracked with **0 units**,
  so it is deliberately unbuyable until it is restocked in **Admin → Products**.

---


---

## 8. UTILITIES (`src/utils/`)

```ts
// format.ts
formatPrice(amount, currency = 'BDT') → string
// BDT: '৳5,000'  |  USD: '$41.50' (amount * 0.0083 rate)

calculateShoeSizeFromFootLength(lengthCm) → { eu, uk, usMen, usWomen, cm, inches }

// stock.ts — live stock truth (Admin → Products "track stock")
stockLeft(product)      → number | null   // units left, or null when the product is untracked
isOutOfStock(product)   → boolean         // tracked && nothing left
maxOrderableQty(item)   → number          // largest shippable quantity of a cart line (∞ if untracked)
```

---

## 9. BACKEND + ADMIN PANEL (server/ and admin/)

> Added 2026-08-22: A full Node.js REST API and a React admin panel, both sharing the same TypeScript ecosystem as the storefront.

### Architecture

```
d:\Downloads\Aks-store\
├── src/                    # Storefront (Vite + React 19, static SPA)
├── server/                 # REST API (Express + Prisma + SQLite/PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma   # 32 models (AdminUser, Role, Category, Subcategory, Product, Order, Coupon, Store, Review, HeroSlide, SideBanner, GalleryBanner, OfferBanner, LoveBanner, …)
│   │   └── seed.ts          # Seeds DB from src/data/* (16 products, 8 stores, 4 coupons, reviews, admin)
│   ├── src/
│   │   ├── index.ts         # Express app on port 4000, CORS + JSON body parser, 404 + error handler
│   │   └── routes/
│   │       ├── auth.ts      # POST /admin/auth/login, GET /admin/auth/me (JWT + bcrypt)
│   │       ├── products.ts  # GET /products (public, same filters as storefront) + /admin/products CRUD
│   │       ├── orders.ts    # POST /orders (place order) + GET /orders/track/:code + /admin/orders CRUD
│   │       ├── coupons.ts   # POST /coupons/validate (public) + /admin/coupons CRUD
│   │       ├── stores.ts    # GET /stores (public) + /admin/stores CRUD
│   │       ├── reviews.ts   # GET /products/:slug/reviews (public) + /admin/reviews moderation
│   │       ├── galleryBanners.ts    # GET /gallery-banners + /admin/gallery-banners CRUD
│   │       ├── offerBanners.ts      # GET /offer-banners + /admin/offer-banners CRUD
│   │       ├── loveBanners.ts       # GET /love-banners + /admin/love-banners CRUD
│   │       ├── categories.ts        # GET /categories (public taxonomy) + /admin/categories CRUD — feeds the "Many Worlds, One Mart" rail
│   │       ├── heroSlides.ts / sideBanners.ts / pages.ts / newsletter.ts / uploads.ts / settings.ts / seo.ts
│   │       │             # …and the rest of the storefront/operations routers (one file per admin module)
│   │       └── stats.ts     # GET /admin/stats (dashboard metrics)
│   ├── src/lib/
│   │   ├── auth.ts          # JWT sign/verify, requireAuth, requireSuperAdmin, asyncHandler
│   │   └── prisma.ts        # PrismaClient singleton
│   ├── src/utils/
│   │   ├── json.ts          # parseJsonSafe
│   │   └── product.ts       # productToApi (JSON parsing) + productFromApi (serialization)
│   ├── scripts/
│   │   ├── smoke.ts             # 20-check end-to-end suite (places a real order, then rolls it back)
│   │   ├── verify-order-flow.ts # order lifecycle + dashboard endpoint checks (same rollback)
│   │   └── test-cleanup.ts      # shared rollback: deletes a test order, restores stock + coupon counter
│   └── .env                 # DATABASE_URL=file:./dev.db, PORT=4000, JWT_SECRET, JWT_EXPIRES_IN=12h
├── admin/                    # React 19 admin panel (Vite, port 5173, proxies /api → localhost:4000)
│   ├── src/
│   │   ├── App.tsx          # Sidebar layout with nav (Dashboard, Products, Orders, Coupons, Boutiques, Reviews)
│   │   ├── api.ts           # JWT auth client + typed fetch helper (auto 401 → logout)
│   │   ├── types.ts         # Admin type definitions (mirrors server Prisma models)
│   │   ├── components/ui.tsx # Shared UI primitives (Button, Modal, Field, Toggle, Badge, Spinner, etc.)
│   │   ├── components/ImageSetManager.tsx # Shared image-set editor behind every banner page (upload or paste links, reorder, hide, capacity)
│   │   ├── pages/          # 33 pages — the sidebar NAV table in App.tsx is the source of truth
│   │   │   ├── LoginPage.tsx
│   │   │   ├── Dashboard.tsx (stats cards, low-stock alerts, recent orders)
│   │   │   ├── Products.tsx  (full CRUD modal editor)
│   │   │   ├── Orders.tsx    (list + status workflow + detail view)
│   │   │   ├── HeroSlides.tsx / GalleryImages.tsx / OfferImages.tsx / LovedProducts.tsx
│   │   │   │   # homepage artwork modules — all use ImageSetManager (upload or paste image links; every card also takes an optional click-through link)
│   │   │   │   # the "Many Worlds, One Mart" rail needs no module of its own: it is Categories.tsx (name + picture)
│   │   │   ├── Coupons.tsx / Stores.tsx / Reviews.tsx
│   │   │   └── …             # Inventory, Purchases, Suppliers, Invoices, Returns, Expenses, Reports, Roles, Settings, POS…
│   └── .gitignore
└── package.json            # Root: dev, build, dev:api, dev:admin, setup:api, seed scripts
```

### Key design decisions
- **SQLite locally**, PostgreSQL in production (just change `DATABASE_URL` + Prisma `provider`)
- **Soft-delete** for products (`isActive = false`) to keep order history valid
- **Server-side coupon validation** — order totals are recomputed from item snapshots
- **JWT auth** with Bearer token; admin role: `admin` or `superadmin`
- **Smoke / verification tests**: `node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/smoke.ts` (20 checks) and `… scripts/verify-order-flow.ts`. Both place a real order, then roll it back straight out of the local DB via `scripts/test-cleanup.ts` (restoring product stock, the stock-movement ledger and the coupon counter), so a run never pollutes the owner's dashboard or inventory. Cleanup is skipped automatically when `API_URL` points at a remote host (the API exposes no delete route on purpose).

### Running locally
```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Admin (auto-proxies /api → localhost:4000)
cd admin && npm run dev

# Terminal 3 — Storefront
cd .. && npm run dev
```

### Admin login (seeded)
- **Email:** `admin@aksgarments.com.bd`
- **Password:** `Admin@123`

### API Summary
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/admin/auth/login` | — | Get JWT |
| GET | `/api/admin/auth/me` | Bearer | Current admin |
| GET | `/api/products` | — | Public catalog (same filters as storefront) |
| GET | `/api/products/:slug` | — | Single product + approved reviews |
| POST | `/api/orders` | — | Place order → tracking code. Validates stock (400 for a tracked product with 0 units), delivery area, payment method and coupon |
| GET | `/api/orders/track/:code` | — | Track by tracking code |
| POST | `/api/coupons/validate` | — | Validate promo code |
| GET | `/api/stores` | — | All store locations |
| GET | `/api/admin/products` | Bearer | Admin product list |
| POST/PATCH/DELETE | `/api/admin/products/:id` | Bearer | CRUD |
| GET | `/api/admin/orders` | Bearer | Order list (filter by status/search) |
| PATCH | `/api/admin/orders/:id` | Bearer | Update status |
| GET/POST/PATCH/DELETE | `/api/admin/coupons` | Bearer | CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/stores` | Bearer | Boutique CRUD |
| GET | `/api/admin/reviews` | Bearer | Moderate reviews |
| PATCH/DELETE | `/api/admin/reviews/:id` | Bearer | Approve/delete |
| GET | `/api/admin/stats` | Bearer | Dashboard metrics |
| GET | `/api/gallery-banners` | — | Active homepage gallery banners (Admin → Gallery Images) |
| GET/POST/PATCH/DELETE | `/api/admin/gallery-banners` | Bearer | Gallery banner CRUD (image required; optional link) |
| GET | `/api/offer-banners` | — | Active "Active Offers" artwork (Admin → Offer Images) |
| GET/POST/PATCH/DELETE | `/api/admin/offer-banners` | Bearer | Offer image CRUD (image required; optional link) |
| GET | `/api/love-banners` | — | Picked products of the "Loved by our customers" showcase (Admin → Loved Products) |
| GET/POST/PATCH/DELETE | `/api/admin/love-banners` | Bearer | Loved-products CRUD (product link or image required) |
| GET | `/api/admin/invoices` | Bearer | Invoice register — orders (optional `?status=`) with parsed address + item MRP |
| GET | `/api/admin/invoices/:orderId` | Bearer | Single invoice (order + items/payments) for the print window |
| GET | `/api/admin/packaging` | Bearer | Packing queue — orders with parsed address + item product join (`weight`) for slips |
| PATCH | `/api/admin/packaging/:id` | Bearer | Mark packed/shipped (drives the packaging workflow) |
| GET | `/api/admin/pos/receipt/:orderId` | Bearer | Stored POS sale (items + payments + cashier) for receipt (re)printing |
| GET | `/api/admin/reports` | Bearer | Range report — preset `?range=` (today/7d/30d/3m/1y) **or** a custom `?from=&to=` window (ISO dates + times) |

---

### E-commerce invoices (2026-10-01)

Orders become professional A4 invoices, built entirely from real order + settings
data — no mock values, no hard-coded totals.

- **Renderer** — `admin/src/lib/invoiceTemplate.ts` is a pure, dependency-free
  `buildInvoiceHtml(order, settings, { logoUrl })`. It lays out the AKS Mart logo
  (the existing `src/assets/AKS.logo.jpg`), brand + tagline + contact, an invoice
  meta grid (invoice/order no, order/invoice date, payment method + status, source,
  tracking), billing + shipping blocks, a 7-column line table (#, product, SKU,
  qty, unit price, discount, total), a payment block (method, status, TrxID) and a
  totals block (subtotal, product discount, coupon discount, delivery, tax, grand
  total, paid, due). Currency renders as ৳ (`formatMoney`, symbol from settings).
- **Browser glue** — `admin/src/lib/invoice.ts` resolves the logo URL, blends
  Admin settings with the public snapshot (`loadInvoiceSettings`), and opens the
  document in its own window (`openInvoice`) — so the admin chrome is never printed —
  optionally auto-printing once the logo has loaded. Both the **Invoices** register
  (`View` + `Print`) and the Manage Order page reuse it.
- **Real discounts** — the per-row Discount column and the Product Discount total
  come from the product's MRP (`originalPrice`) vs the charged price, and
  "Subtotal − Product Discount" always equals the order's stored subtotal; the
  Coupon Discount line is the order's stored `discount`. Nothing is fabricated.
- **Print** — `@page { size:A4 }`, `@media print` hides the toolbar, product rows
  avoid page breaks (`break-inside: avoid` + repeated `thead`), and long names wrap.
  "Download / Save as PDF" uses the browser's own print dialog (no new dependency).
- **BIN/TIN** are omitted on purpose: the project has no such setting and one must
  never be invented. The custom `returnPolicy` / `thankYouMessage` / `invoiceFooter`
  from Admin → Settings are used when set; the policy falls back to the real 30-day
  "Return & Refund Policy" wording.
- **Route fix** — `GET /api/admin/invoices` now serialises via the shared
  `orderToApi`, so `customerAddress` is parsed (previously it stayed a JSON string,
  leaving the printed address blank) and each item carries `product.originalPrice`.

---

### Packing slips (2026-10-01)

A warehouse document (Admin → Packaging, and the Manage Order page) built from the
real order — deliberately **not** an invoice: it never shows a price, discount,
subtotal, total or payment amount.

- **Renderer** — `admin/src/lib/packingSlipTemplate.ts` is a pure, dependency-free
  `buildPackingSlipHtml(data, settings, { logoUrl })`: AKS Mart logo + brand +
  contact, a `PACKING SLIP` header, an order meta grid (slip/order no, order/packed
  date, order + packing status, source, tracking), a Ship-To block (recipient,
  phone, full address, area, district, delivery instructions), a large 5-column
  item table (#, product, SKU, variant/options, qty — no prices), a package block
  (Total Items + Tracking, and Total Weight only when products carry a weight), a
  6-line packing checklist, and a Packed By / Checked By / Packing Date-&-Time
  staff area.
- **Graceful gaps** — Package Number and Delivery Partner do not exist anywhere in
  the schema, so those rows are omitted rather than invented. The slip number is
  derived deterministically as `PS-<orderNumber>` (no dedicated field exists).
- **Browser glue** — `admin/src/lib/packingSlip.ts` (`openPackingSlip`) resolves the
  same bundled logo, loads settings and opens the slip in its own window with an
  optional auto-print; both the Packaging queue (`View` + `Print`) and Manage Order
  reuse it (the two old inline `printSlip` copies are gone).
- **Data** — `GET /api/admin/packaging` now joins `product.weight` so Total Weight
  can be totalled (0 products currently set a weight, so the row stays hidden);
  `ITEM_INCLUDE` in `orders.ts` gained `weight` for the Manage Order slip.

---

### POS receipts (2026-10-01)

The counter-sale receipt (POS page + order-detail reprint) is an 80mm thermal
document built from the stored POS transaction only — never recalculated.

- **Renderer** — `admin/src/lib/posReceiptTemplate.ts` is a pure, dependency-free
  `buildPosReceiptHtml(data, settings, { logoUrl })`: centred AKS Mart logo + name
  + tagline + address/phone/website; sale info (receipt no, order/sale id, date,
  time, cashier, customer); a compact item list ("Product" then "qty x unit ⟶ line
  total"); the totals block (subtotal, discount, tax, and delivery only if charged);
  a bold grand total; and a payment block (each method + amount, amount paid, change,
  due). ৳ currency; monospace; black-on-white; `@page{ size:80mm auto }`;
  `@media print` hides the toolbar; rows avoid page breaks; long names wrap.
- **Browser glue** — `admin/src/lib/posReceipt.ts`: `openPosReceipt(data)` (immediate
  print after a sale; defaults the cashier to the signed-in admin) and
  `openPosReceiptById(orderId)` (reprint/view — fetches the ORIGINAL store, so totals
  and change are exactly as recorded).
- **Reprint data** — new `GET /api/admin/pos/receipt/:orderId` (POS_VIEW) returns the
  stored sale with `items`, `payments` and `cashier`. The Orders detail modal shows
  **View Receipt** / **Reprint Receipt** for `source === 'pos'` rows.
- **Change** — derived from the stored payment rows (`Σ payments − total`), so the
  receipt always matches what the sale recorded and a reprint is identical.

### POS register (2026-10-01)

`admin/src/pages/POS.tsx` is the original counter UI: on wide screens a two-column
layout — the product catalogue (search box + category selector, responsive grid of
product cards with image / price / stock) on the left, and the **Current Sale** cart
on the right (line items with +/− quantity, Subtotal / Discount / Total, customer
name + phone, payment method `Select` + paid amount + change, and **Complete Sale** /
**Hold**), plus a Holds list to resume or discard parked sales. Sales use the
existing `/pos/sales` and `/pos/holds` APIs, and **Complete Sale** prints the shared
professional 80mm receipt (see POS receipts above) — reprint from the Orders detail
modal. It also supports a per-sale **VAT %**, a **Received/Change** panel, and the
payment methods Cash / bKash / Nagad / Card / Rocket / Bank.

> An earlier full redesign of this page was **reverted** to restore the original
> register. The POS **receipt** module and the Orders-page **reprint** (both described
> above) remain in place.

---

## 10. KNOWN ISSUES / TODOS

1. **Name mismatch** — directory says "bata footwear" but app is "AKS Garments" apparel.
2. **`CategoryType` includes `'festive'`** — no product data uses it.
3. **No routing** — `activeProductPage` is state-based navigation, no React Router installed.
4. **Wishlist heart in Header opens CartDrawer** — possible bug (no dedicated wishlist view).
5. **`filters.inStockOnly` is dead state** — it exists in `FilterState` (`src/types.ts`), is reset in
   `StoreContext`/`Footer` but no filter UI toggles it and no grid applies it. Wire it to
   `!isOutOfStock(product)` if an "in stock only" switch is ever added.
6. **Storefront `motion` chunk** — 129.61 kB (gzip 42.75) still ships on the critical path via
   `Header` + `HeroSlider`. Code splitting is done (entry 683.55 → 166.65 kB, admin 616 → 43.73 kB);
   swapping those animations for CSS is the next win.

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

*Docs last updated: 2026-10-01 (professional A4 invoices, warehouse packing slips and 80mm POS thermal receipts, all built from real transaction data; the POS register itself is the original UI; Reports has a custom From/To date-time range; verification scripts self-clean their test orders)*