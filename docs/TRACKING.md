# Advertising & E-commerce Tracking

Meta Pixel + Meta Conversions API (CAPI) + Google Analytics 4 ecommerce, behind a
consent banner. Everything is off until the IDs below are set.

> The storefront is a Vite + React SPA (not Next.js). `vite.config.ts` accepts the
> `NEXT_PUBLIC_*` prefix so the public IDs keep their usual names.

## How it works

| Piece | Where |
|---|---|
| Consent store (localStorage `aks.trackingConsent.v1`) | `src/lib/tracking/consent.ts` |
| Pixel + gtag loader, event API, dedup guards | `src/lib/tracking/index.ts` |
| Consent banner + route page-view listener | `src/components/TrackingConsent.tsx` (mounted in `src/App.tsx`) |
| "Cookie settings" link (reopens the banner) | `src/components/Footer.tsx` |
| CAPI client, retries, send-once ledger, GA4 refunds | `server/src/lib/tracking/send.ts` |
| Hashing / customer matching | `server/src/lib/tracking/userData.ts` |
| Order → Purchase / refund rules | `server/src/lib/tracking/orders.ts` |
| Browser-event relay to CAPI | `server/src/routes/tracking.ts` (`POST /api/tracking/meta`) |
| Send-once ledger table | `TrackingEvent` in `server/prisma/schema.prisma` |
| Tests | `server/tests/tracking.test.ts` |

### When is it a Purchase?

An order is a Purchase when **the API has persisted it** (`POST /api/orders`
returned 201). Every payment method this shop offers — Cash on Delivery and the
manual bKash / Nagad / bank transfers — is settled *after* the order is placed,
so placement is the conversion.

- The browser fires Purchase **only** from `createOrder()` in
  `src/context/StoreContext.tsx`, right after the API returns the order — never
  from the confirmation page, and never for the offline fallback order
  (`VITE_USE_API=false`).
- All amounts come from the server's order record (catalog prices, server-side
  coupon, shipping, tax). `transaction_id` / `order_id` is the database order id.
- Browser guard: each order id is remembered (localStorage + memory), so a
  refresh, back-navigation or retry never sends a second Purchase.
- Server guard: the CAPI Purchase is claimed in `TrackingEvent`
  (`meta:Purchase:<orderId>`, unique), so it is sent at most once.
- If the order is later **cancelled, refunded or returned**, a GA4 `refund` is
  sent server-side (once per order, and only if GA4 recorded the purchase).
  Meta has no refund event.

### Deduplication (Pixel ↔ CAPI)

| Event | event_id | Browser | Server |
|---|---|---|---|
| Purchase | `purchase_<order.id>` | Pixel | CAPI from `POST /orders` |
| ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Search | random `<event>_<uuid>` per action | Pixel | CAPI via `/api/tracking/meta` (same id) |
| PageView | — | Pixel only | — |

### Consent

- Nothing loads and nothing is sent until the shopper chooses. Events before
  that are dropped, not queued.
- **Analytics** → GA4. **Advertising** → Meta Pixel + CAPI (including hashed
  email/phone/name/city on Purchase). Each can be granted separately via
  "Customize"; "Cookie settings" in the footer changes it later.
- Withdrawing consent stops further events, revokes Pixel consent, sets GA4
  consent to denied, and deletes `_ga*`, `_gid`, `_fbp`, `_fbc` cookies.
- The order request carries `tracking.consent`; the server sends nothing to Meta
  without `marketing: true`. Google Consent Mode v2 `ad_*` signals follow the
  advertising choice.

### Data sent to Meta

Hashed (SHA-256 after Meta's normalisation): email, phone (as `8801…`), first
name, last name, district, division, postal code, country (`bd`), external_id
(hashed phone). Unhashed, as Meta requires: client IP (from nginx `X-Real-IP`;
private/loopback addresses dropped), user agent, `_fbp`, `_fbc`. No address
lines, notes, transaction IDs or anything else. The relay endpoint never
accepts customer identity — only IP, user agent and the two cookies.

Logs contain event name, event id, HTTP status and Meta's error code/message —
never request bodies.

## Environment variables

### Storefront build (repo root `.env` / `.env.local`, or CI env) — public

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | `123456789012345` | Meta Pixel / dataset ID |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-ABC123XYZ` | GA4 web stream measurement ID |

These are only a **fallback**: at startup the storefront asks the API
(`GET /api/tracking/config`) for the IDs, which come from the server environment
or Admin → Advertising → Tracking Settings, so changing them there needs no
rebuild. An admin switching a channel off also disables the build-time ID.
Never put a secret under `NEXT_PUBLIC_*` or `VITE_*`.

### API server (`server/.env`) — server-only

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` (or `META_PIXEL_ID`) | for CAPI | Same Pixel ID as the storefront |
| `META_CAPI_ACCESS_TOKEN` | for CAPI | Conversions API access token — **secret** |
| `META_TEST_EVENT_CODE` | testing only | Routes server events to Events Manager → Test events. **Remove in production.** |
| `META_GRAPH_API_VERSION` | no | Defaults to `v26.0`; bump when Meta deprecates it |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` (or `GA_MEASUREMENT_ID`) | for refunds | Same G-ID as the storefront |
| `GA4_API_SECRET` | for refunds | GA4 Measurement Protocol API secret — **secret** |

| `INTEGRATION_ENCRYPTION_KEY` | for admin-entered secrets | 32 bytes (hex/base64) used to encrypt secrets stored from the admin panel |

**Admin → Advertising → Tracking Settings** can set every value above. Order of
precedence for each one: server environment variable → admin setting → off.
Secrets entered in the admin are encrypted (AES-256-GCM) with
`INTEGRATION_ENCRYPTION_KEY`, are write-only (only the last 4 characters are
ever shown) and are never logged; the page also shows delivery health, lets you
retry failed server sends and sends a Meta test event.

CAPI is active only when both the Pixel ID and the access token are set;
GA4 server refunds only when both the measurement ID and the API secret are set.
`META_GRAPH_API_BASE` and `GA4_MP_ENDPOINT` exist only so the tests can point at
a local fake — do not set them in production.

### Local development

```bash
# repo root .env.local
NEXT_PUBLIC_META_PIXEL_ID="123456789012345"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-ABC123XYZ"

# server/.env (in addition to DATABASE_URL / JWT_SECRET)
NEXT_PUBLIC_META_PIXEL_ID="123456789012345"
META_CAPI_ACCESS_TOKEN="EAAB..."
META_TEST_EVENT_CODE="TEST12345"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-ABC123XYZ"
GA4_API_SECRET="..."
```

Then `npm run setup:api` once (creates the `TrackingEvent` table), `npm run dev:api`
and `npm run dev`. In dev builds every event is also logged to the browser console
(`[tracking] …`) and GA4 runs with `debug_mode`.

### Production (VPS)

1. Put the server variables in `server/.env` on the server (not in git).
2. Put the two `NEXT_PUBLIC_*` IDs in the root `.env` on the server, or export
   them in the deploy script before `npm run build`.
3. Deploy. The workflow already runs `prisma db push`, which adds `TrackingEvent`.
4. Remove `META_TEST_EVENT_CODE` once verified, and restart (`pm2 restart aks-store`).

## Account configuration

**Meta (Events Manager)**
1. Create (or pick) the dataset/Pixel for aksmartbd.com → copy its ID.
2. Settings → Conversions API → *Generate access token* → `META_CAPI_ACCESS_TOKEN`.
3. Business settings → Brand safety → Domains → verify `aksmartbd.com`.
4. If your account still shows *Aggregated Event Measurement / web event
   configuration*, rank Purchase highest.

**Google Analytics 4**
1. Admin → Property settings → set the **currency to BDT** and time zone to Asia/Dhaka.
2. Admin → Data streams → Web → copy the measurement ID.
3. In that stream → *Enhanced measurement* → Page views → *Show advanced
   settings* → **turn OFF "Page changes based on browser history events"**.
   The app sends page views itself; leaving this on double-counts every page.
4. Same stream → *Measurement Protocol API secrets* → Create → `GA4_API_SECRET`.
5. Admin → Events → confirm `purchase` is a key event.

## Event map

| Shopper action | GA4 | Meta (Pixel) | Meta CAPI | Source |
|---|---|---|---|---|
| Any route change (incl. first load) | `page_view` | `PageView` | — | `PageViewTracker` |
| Catalog / category / search results shown | `view_item_list` | — | — | `ProductGrid.tsx` |
| Product page or quick view | `view_item` | `ViewContent` | relayed | `pages/ProductDetailPage.tsx`, `openQuickView` |
| Add to bag / quantity + | `add_to_cart` | `AddToCart` | relayed | `addToCart`, `updateCartQuantity` |
| Remove / quantity − | `remove_from_cart` | — | — | `removeFromCart`, `updateCartQuantity` |
| Checkout page opened | `begin_checkout` | `InitiateCheckout` | relayed | `CheckoutPage.tsx` |
| Place order submitted (valid form) | `add_shipping_info` (`shipping_tier` = zone) | — | — | `CheckoutPage.tsx` |
| Place order submitted (valid form) | `add_payment_info` (`payment_type`) | `AddPaymentInfo` | relayed | `CheckoutPage.tsx` |
| API created the order | `purchase` | `Purchase` | from `POST /orders` | `StoreContext.createOrder` / `routes/orders.ts` |
| Search submitted / trending chip | `search` | `Search` | relayed | `Header.tsx` |
| Order cancelled / refunded / returned (admin) | `refund` (Measurement Protocol) | — | — | `routes/orders.ts`, `routes/returns.ts` |

Values: always BDT. Item id = product **SKU** everywhere (GA4 `item_id`, Meta
`content_ids`). Purchase `value` = order total (goods − discount + shipping +
tax), with `shipping`, `tax` and `coupon` as separate GA4 parameters. Funnel
events use goods value after the coupon (shipping is not known yet).

## Verifying

### Meta Events Manager
1. Set `META_TEST_EVENT_CODE` in `server/.env`, restart the API.
2. Events Manager → your dataset → **Test events**. Enter the site URL there and
   open it from that tab (so browser events are tagged too).
3. Accept the cookie banner, view a product, add to bag, check out with COD.
4. You should see each event twice — **Browser** and **Server** — merged as
   *Deduplicated* for ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo,
   Purchase. Purchase's event ID is `purchase_<order id>` on both.
5. Reload the confirmation page: no new Purchase appears.
6. After real traffic: Overview → Purchase → check *Event match quality* and the
   deduplication rate. The *Meta Pixel Helper* browser extension also shows the
   browser events and their event IDs.
7. Remove `META_TEST_EVENT_CODE` when done.

### GA4 DebugView
1. Run a dev build (`npm run dev` sets `debug_mode`), or install the *Google
   Analytics Debugger* extension for production.
2. GA4 → Admin → **DebugView**, pick your device.
3. Walk the funnel; expect `page_view` → `view_item_list` → `view_item` →
   `add_to_cart` → `begin_checkout` → `add_shipping_info` → `add_payment_info` →
   `purchase`. Open `purchase` and check `transaction_id`, `value`, `currency`
   = BDT, `shipping`, `tax`, `coupon` and the items.
4. In admin, cancel that order → a `refund` with the same `transaction_id`
   appears in Reports → Monetization within ~24h (Measurement Protocol events
   don't show in DebugView).

### Automated
`cd server && node --import tsx --test tests/tracking.test.ts` boots the API
against a fake Meta/GA4 endpoint and checks the Purchase payload, hashing,
consent gating, event ids, retries, the relay and once-only refunds.

## Known limitations / manual follow-ups

- **Purchase on placement** includes manual transfers whose payment an admin has
  not yet verified, and COD orders that may later be refused. Cancellations are
  corrected in GA4 (refund) but cannot be retracted from Meta. To count only
  confirmed orders instead, move the CAPI send to the admin status change — the
  browser Purchase would then have to be dropped.
- **Refunds**: one GA4 refund per order. A second partial refund on the same
  order is not reported.
- `view_item_list` is sent for the catalog grid (`/products`, categories,
  search) — not for the home-page product rails.
- The relay endpoint is public. It whitelists events, validates and caps every
  field, forces BDT and never accepts identity, and is rate-limited per IP
  (in-memory, per process) — but its values are client-supplied. Purchase never
  goes through it.
- POS (counter) orders and admin-created orders are not tracked.
- Consent is per device/browser and shown to every visitor (no geo rules).
- Ad blockers will block the Pixel/gtag; CAPI still receives Purchase (if the
  shopper consented) and relayed events, but `_fbp` will be missing.
- The Meta Graph API version defaults to `v26.0`; update
  `META_GRAPH_API_VERSION` when Meta announces its deprecation.

## Campaign attribution (orders)

The storefront records where each shopper came from (`src/lib/tracking/attribution.ts`):

- What it collects: utm_* tags, the referring site's **host name only** and the landing path, with no query string.
- How touches are kept: the first and the last non-direct visit within **30 days** are stored in `localStorage` (`aks.attribution.v1`) and sent with the order as `attribution`.
- Who it applies to: campaign tags are collected for every visitor.
- Ad click IDs (fbclid, gclid, gbraid, wbraid, ttclid, msclkid):
  - Kept only with **advertising consent**.
  - Held in memory until consent is given.
  - Stripped if consent is withdrawn.
  - Erased server-side after 90 days by the daily `purge-click-ids` job.

The server (`server/src/lib/attribution.ts`):

- Re-validates every field and derives a channel.
- Stores `OrderAttribution` rows (`first` and `last`).
- Links each touch to a `MarketingCampaign`:
  - `utm_id` = platform campaign ID wins.
  - Otherwise `utm_campaign` must match one of the campaign's match keys or its name (case-insensitive).
- The default reporting model is **last non-direct**; **first touch** is the alternative.
- POS orders carry no attribution.

Where it appears in the admin:

- **Advertising → Campaigns**: create campaigns, see unmatched UTM tags, re-match orders, and copy the Meta and Google URL templates.
- **Order detail**: a *Marketing source* card.
- **Orders list**: filter by channel.
- Raw click IDs are never returned by the API.

Before production, check legally that collecting UTM tags without consent meets the privacy rules that apply to you.
