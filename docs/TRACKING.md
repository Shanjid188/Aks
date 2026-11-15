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

## Ad spend

Admin → Advertising → **Ad Spend** holds daily spend per campaign (`AdSpendEntry`). Spend gets there in three ways:

- **Meta Ads sync:**
  - Set up in **Integrations**: an ad account ID plus a token with `ads_read`. The token is stored encrypted, and the `META_ADS_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` env vars take precedence.
  - Runs every 6 hours for the last 3 days, or manually for up to 90 days.
  - The token is sent only in the `Authorization` header.
- **CSV import:**
  - Google Ads first (Campaigns → segment by Day → Download CSV); any Date/Campaign/Cost CSV also works.
  - A preview step shows totals and bad lines.
  - Re-importing the same days replaces the earlier rows (keyed by platform, account, campaign and day).
- **Manual entries:** for boosted posts, influencer fees and similar.

Imported campaigns are created or matched automatically: by platform campaign ID first, then by name. Orders are then re-linked to them.

**Currency:**

- Spend is stored in the billed currency.
- It is converted to BDT at read time using the admin **exchange-rate table**. A rate applies from its date until the next rate for that currency.
- Rates are never guessed. Rows without a rate are listed as "not converted" and excluded from BDT totals until a rate is added.

Reports show an *Ad spend* line for the selected window, but only to admins with `advertising.spend_view`.

Every import, sync, manual entry, deletion and rate change is audited. Sync history is kept in `IntegrationSyncRun`.

## Campaign performance

Admin → Advertising → **Performance** (`GET /api/admin/advertising/performance`) shows, per campaign: spend, orders, revenue, ROAS, CPA, CTR, CPC and AOV, plus revenue by channel and a daily revenue-vs-spend chart.

Defaults:

- Booked net revenue: cancelled, returned and refunded orders are excluded, and refunds are subtracted.
- Last non-direct touch.
- Online orders only; POS is excluded.

The toggles switch to delivered revenue, first touch, or include POS. Two summary figures:

- **ROAS** = attributed revenue ÷ spend.
- **Blended ROAS** = all revenue ÷ spend.

Ratios with a zero denominator show "—". Spend columns are hidden from admins without `advertising.spend_view`.

## Traffic (GA4 Data API)

Admin → Advertising → **Traffic** reads aggregate reports from GA4: sessions, users, engagement, purchases, channels, source/medium, landing pages and devices.

**Setup (Integrations):**

1. Enter the numeric GA4 **property ID**.
2. Paste a Google Cloud **service-account key** (JSON).
3. Add the service account's email as a **Viewer** on the property.

The key is stored encrypted; the env vars `GA4_PROPERTY_ID` and `GA4_SERVICE_ACCOUNT_JSON` take precedence.

**How it works:**

- The server signs a JWT itself (RS256 via node:crypto, `analytics.readonly` scope) and calls the REST `runReport` endpoint. No Google SDK is bundled.
- Responses are cached in `Ga4ReportCache`: for 1 hour when the range includes today, otherwise for 24 hours. `refresh=1` refetches, and a daily job removes expired entries.
- If GA4 is unreachable or refuses access, the page shows that error. It never shows estimated numbers.

GA4 counts only visitors who accepted analytics cookies, and it reports gross purchases. Revenue and ROAS therefore come from your own orders (Performance, Reports), not from GA4.

## Product performance (Reports → Products)

Admin → Reports → **Products** extends the existing Reports page (no separate report). `GET /api/admin/reports/products?from&to&basis&source&model` returns, per product:

- **Units sold, product revenue** (price × qty on counted orders — before order discount, shipping and tax), **refunds**, **net revenue**. Counted orders follow `lib/revenue.ts` (booked by default, delivered on request; all sources by default).
- **Refund allocation:** a refund tied to a return request goes to that return's product; any other refund is split over the order's lines by item value.
- **Profit and margin** from each sale's cost snapshot (`OrderItem.unitCost`), else the product's cost price. A product with any unknown cost shows "No cost price", never 0.
- **Return rate** = returned ÷ ordered units over all placed (non-cancelled) orders: orders with status returned/refunded count all their units; other orders count approved/received/refunded return requests.
- **Net revenue by channel** (needs `advertising.campaigns_view`): last non-direct touch by default; POS sales appear as their own "POS" bucket.
- **GA4 item funnel** (needs `advertising.traffic_view` and a connected GA4): views, add-to-cart rate and view-to-purchase rate, matched on SKU (the storefront sends the SKU as `item_id`), cached like the Traffic reports and labelled as consented shoppers only.

Click a product for its daily trend (`/api/admin/reports/products/:productId/trend`). Admins with `reports.export` can download the table as CSV.

## Abandoned carts

Admin → Advertising → **Abandoned Carts** (`advertising.carts_view`).

**Anonymous layer (everyone).** On the checkout page the storefront keeps a random token (`aks.checkoutSession.v1`) and sends the cart to `PUT /api/checkout-sessions/:token`: SKU, quantity, size and colour, plus campaign tags so the channel can be shown. Ad click IDs are stripped. The server stores only the token's SHA-256 hash, re-prices the items from the catalog (client prices are ignored) and drops unknown SKUs. The order request carries the token, and the session becomes **converted**, or **recovered** if it had been abandoned first. The `cart-maintenance` job (every 10 min) marks sessions idle for `CART_ABANDON_MINUTES` (default 60) as **abandoned**.

**Contact layer (opt-in only).** An unticked checkbox reads: *"I agree to receive a reminder about my abandoned cart via WhatsApp or SMS."* Only when it is ticked, and a valid mobile number is entered, are the phone (and email) stored, together with the consent time and a random restore code. Contact details are erased:

- when the shopper unticks the box (`DELETE /api/checkout-sessions/:token/contact`);
- when they use "Forget my contact details" on the restore link;
- when they place the order;
- `CART_CONTACT_RETENTION_DAYS` (default 30) after abandonment.

Sessions are deleted after `CART_SESSION_RETENTION_DAYS` (default 180). Contact details are never sent to Meta or Google.

**Recovery is manual.** The cart list never includes contact details. An admin with `advertising.carts_contact` can open a cart's contact card, and each opening is logged (`cart.contact_viewed`). The card has an *Open WhatsApp* link (`wa.me`, pre-filled message) and a restore link `/cart?restore=<code>` that puts the items back in the shopper's bag. The admin can mark a cart contacted or recovered, and both actions are logged. Automated SMS is not implemented; it needs a messaging provider.

**Metrics.** Abandonment rate = abandoned ÷ (abandoned + converted + recovered). The page also shows abandoned and recovered value, the products most often left behind, and abandoned value by channel.
