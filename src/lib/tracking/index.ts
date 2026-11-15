/**
 * Advertising & analytics tracking for the storefront: Meta Pixel (+ the
 * Conversions API relay) and GA4 ecommerce.
 *
 * - Third-party scripts load only after consent, on an idle callback, so they
 *   never block the first paint. Before consent, events are dropped (not queued).
 * - Every Meta event the server also sends carries the same event_id, so Meta
 *   deduplicates browser + server copies. Purchase uses `purchase_<order.id>`
 *   (see server/src/lib/tracking/orders.ts).
 * - Page views are sent by usePageViewTracking() on route changes; the Pixel's
 *   own History-API auto PageView is disabled so nothing is counted twice.
 * - Money is always BDT, whatever display currency the shopper picked.
 */
import type { ApiOrder } from '../../api';
import type { CartItem, Product } from '../../types';
import {
  deleteCookies,
  getConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  subscribeConsent,
  type ConsentState,
} from './consent';

export * from './consent';

const BUILD_PIXEL_ID = (import.meta.env.NEXT_PUBLIC_META_PIXEL_ID ?? '').trim();
const BUILD_GA_ID = (import.meta.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
const USE_API = import.meta.env.VITE_USE_API !== 'false';
const CURRENCY = 'BDT';
const DEBUG = import.meta.env.DEV;

/*
 * Tracker IDs are resolved at runtime from GET /api/tracking/config (server
 * environment → Admin → Tracking Settings), so changing them needs no rebuild
 * and an admin can switch a channel off. Build-time NEXT_PUBLIC_* values are
 * the fallback when the server has none or the API is unavailable. Nothing is
 * loaded or sent until the config is known AND the shopper has consented.
 */
let PIXEL_ID = '';
let GA_ID = '';
let configReady = false;
const configListeners = new Set<() => void>();

export const isPixelConfigured = () => PIXEL_ID !== '';
export const isGaConfigured = () => GA_ID !== '';
/** True when any tracker is configured — otherwise no consent prompt is needed. */
export const isTrackingConfigured = () => isPixelConfigured() || isGaConfigured();

/** For useSyncExternalStore: changes whenever the resolved config changes. */
export function trackingConfigSnapshot(): string {
  return `${configReady ? 1 : 0}|${PIXEL_ID}|${GA_ID}`;
}
export function subscribeTrackingConfig(fn: () => void): () => void {
  configListeners.add(fn);
  return () => configListeners.delete(fn);
}

interface RuntimeTrackingConfig {
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
  metaEnabled?: boolean;
  ga4Enabled?: boolean;
}

async function fetchRuntimeConfig(): Promise<RuntimeTrackingConfig | null> {
  if (!USE_API) return null;
  try {
    const res = await fetch(`${API_BASE}/tracking/config`, { signal: AbortSignal.timeout(4000) });
    return res.ok ? ((await res.json()) as RuntimeTrackingConfig) : null;
  } catch {
    return null;
  }
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/* ───────────────────────────── Script loading ───────────────────────────── */

let pixelReady = false;
let gaReady = false;

function onIdle(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  if (ric) ric(fn, { timeout: 3000 });
  else setTimeout(fn, 1500);
}

function injectScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Meta's base-code stub: queues calls until fbevents.js arrives. */
function initPixel() {
  if (pixelReady || !isPixelConfigured()) return;
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
  }
  // SPA: our router listener sends PageView; stop the Pixel's own pushState hook.
  window.fbq.disablePushState = true;
  // No automatic button-click / metadata events — only the events below.
  window.fbq('set', 'autoConfig', false, PIXEL_ID);
  window.fbq('consent', 'grant');
  window.fbq('init', PIXEL_ID);
  pixelReady = true;
  onIdle(() => injectScript('https://connect.facebook.net/en_US/fbevents.js'));
}

function initGa(marketing: boolean) {
  if (!isGaConfigured()) return;
  if (!gaReady) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js requires the real `arguments` object.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
    });
    window.gtag('js', new Date());
    // Page views are sent manually on every route change.
    window.gtag('config', GA_ID, { send_page_view: false, ...(DEBUG ? { debug_mode: true } : {}) });
    gaReady = true;
    onIdle(() => injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`));
  } else {
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
    });
  }
}

function applyConsent(state: ConsentState | null) {
  if (state?.analytics) initGa(state.marketing);
  else if (gaReady) {
    window.gtag?.('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    deleteCookies(['_ga', '_gid', '_gat']);
  }

  if (state?.marketing) {
    ensureFbcCookie();
    if (pixelReady) window.fbq?.('consent', 'grant');
    else initPixel();
  } else if (pixelReady) {
    window.fbq?.('consent', 'revoke');
    deleteCookies(['_fbp', '_fbc']);
  }
}

let started = false;
let pageViewPending = false;

/** Call once at app start. Resolves the tracker IDs, then loads whatever the stored consent allows. */
export function initTracking(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void fetchRuntimeConfig().then((runtime) => {
    PIXEL_ID = runtime?.metaEnabled === false ? '' : (runtime?.metaPixelId ?? '').trim() || BUILD_PIXEL_ID;
    GA_ID = runtime?.ga4Enabled === false ? '' : (runtime?.ga4MeasurementId ?? '').trim() || BUILD_GA_ID;
    configReady = true;
    configListeners.forEach((fn) => fn());
    if (isTrackingConfigured()) startTracking();
  });
}

function startTracking() {
  let previous = getConsent();
  applyConsent(previous);
  subscribeConsent((state) => {
    applyConsent(state);
    // A channel that was just switched on counts the page the shopper is on,
    // exactly once; channels that were already on are not repeated.
    if (state?.analytics && !previous?.analytics) gaPageView();
    if (state?.marketing && !previous?.marketing) meta('PageView', {});
    previous = state;
  });
  // The route's page view was requested before the IDs were known.
  if (pageViewPending) {
    pageViewPending = false;
    sendPageView();
  }
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function log(channel: string, name: string, data: unknown) {
  if (DEBUG) console.debug(`[tracking] ${channel} ${name}`, data);
}

function newEventId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

/** Drop a repeat of the same key within `ms` (React StrictMode double effects, double clicks). */
const recent = new Map<string, number>();
function once(key: string, ms = 1500): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last !== undefined && now - last < ms) return false;
  recent.set(key, now);
  if (recent.size > 200) for (const [k, t] of recent) if (now - t > 60_000) recent.delete(k);
  return true;
}

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/**
 * Facebook click id from the landing URL. Kept in memory only (never stored or
 * sent) until marketing consent: by then the shopper has usually navigated
 * away from the ?fbclid= URL, so the Pixel could no longer see it.
 */
const landingClick =
  typeof window === 'undefined'
    ? null
    : (() => {
        const fbclid = new URLSearchParams(window.location.search).get('fbclid');
        return fbclid ? { fbclid, at: Date.now() } : null;
      })();

/** Write _fbc (Meta's documented format) if Meta hasn't — called only with marketing consent. */
function ensureFbcCookie() {
  if (!landingClick || readCookie('_fbc')) return;
  const value = `fb.1.${landingClick.at}.${landingClick.fbclid}`;
  document.cookie = `_fbc=${encodeURIComponent(value)}; max-age=${90 * 24 * 3600}; path=/; SameSite=Lax`;
}

function metaBrowserIds(): { fbp?: string; fbc?: string } {
  ensureFbcCookie();
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc') };
}

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/* ───────────────────────────── Items ───────────────────────────── */

export interface TrackItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  brand?: string;
  category?: string;
  category2?: string;
  variant?: string;
}

/** SKU is the item id everywhere (GA4 item_id, Meta content_ids, server CAPI). */
export function itemFromProduct(product: Product, quantity = 1, variant?: string): TrackItem {
  return {
    id: product.sku || product.id,
    name: product.name,
    price: round(product.price),
    quantity,
    brand: product.brand,
    category: product.category,
    category2: product.subcategory,
    variant,
  };
}

function variantOf(item: Pick<CartItem, 'selectedColor' | 'selectedSize'>): string | undefined {
  const parts = [item.selectedColor?.name, item.selectedSize?.size].filter(
    (p): p is string => !!p && p !== 'Default'
  );
  return parts.length ? parts.join(' / ') : undefined;
}

export function itemFromCartItem(item: CartItem, quantity = item.quantity): TrackItem {
  return itemFromProduct(item.product, quantity, variantOf(item));
}

function gaItems(items: TrackItem[], extra: Record<string, unknown> = {}) {
  return items.map((it, index) => ({
    item_id: it.id,
    item_name: it.name,
    price: it.price,
    quantity: it.quantity,
    index,
    ...(it.brand ? { item_brand: it.brand } : {}),
    ...(it.category ? { item_category: it.category } : {}),
    ...(it.category2 ? { item_category2: it.category2 } : {}),
    ...(it.variant ? { item_variant: it.variant } : {}),
    ...extra,
  }));
}

function metaContents(items: TrackItem[]) {
  return {
    content_type: 'product',
    content_ids: items.map((it) => it.id),
    contents: items.map((it) => ({ id: it.id, quantity: it.quantity, item_price: it.price })),
    num_items: items.reduce((n, it) => n + it.quantity, 0),
  };
}

const itemsValue = (items: TrackItem[]) => round(items.reduce((s, it) => s + it.price * it.quantity, 0));

/* ───────────────────────────── Senders ───────────────────────────── */

function ga(name: string, params: Record<string, unknown>) {
  if (!isGaConfigured() || !hasAnalyticsConsent() || !window.gtag) return;
  window.gtag('event', name, params);
  log('ga4', name, params);
}

let relayDisabled = (() => {
  try {
    return sessionStorage.getItem('aks.capiRelay') === 'off';
  } catch {
    return false;
  }
})();

/** Send the same event to the API, which forwards it to the Conversions API. */
function relay(eventName: string, eventId: string, customData: Record<string, unknown>) {
  if (!USE_API || relayDisabled) return;
  const body = JSON.stringify({
    eventName,
    eventId,
    eventSourceUrl: window.location.href,
    customData,
    ...metaBrowserIds(),
    consent: { marketing: true },
  });
  fetch(`${API_BASE}/tracking/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { accepted?: boolean; reason?: string } | null) => {
      if (json?.reason === 'disabled') {
        relayDisabled = true;
        try {
          sessionStorage.setItem('aks.capiRelay', 'off');
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
}

/**
 * Meta standard event. `serverCopy` also relays it to CAPI with the same
 * event_id. Returns the event_id (or null when not sent).
 */
function meta(name: string, data: Record<string, unknown>, opts: { eventId?: string; serverCopy?: boolean } = {}) {
  if (!isPixelConfigured() || !hasMarketingConsent() || !window.fbq) return null;
  const eventId = opts.eventId ?? newEventId(name.toLowerCase());
  window.fbq('track', name, data, { eventID: eventId });
  log('meta', name, { ...data, eventID: eventId });
  if (opts.serverCopy) relay(name, eventId, data);
  return eventId;
}

/* ───────────────────────────── Page views ───────────────────────────── */

let lastPage = '';
let pageTimer: ReturnType<typeof setTimeout> | undefined;

function gaPageView() {
  ga('page_view', {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
  });
}

function sendPageView() {
  const url = window.location.pathname + window.location.search;
  if (url === lastPage) return;
  lastPage = url;
  gaPageView();
  meta('PageView', {});
}

/**
 * Route-change page view. Debounced so redirects (/products/x → /products)
 * count once and the page has set its <title> before we read it; deduped by
 * URL so React re-renders and StrictMode double effects never repeat it.
 */
export function trackPageView(): void {
  if (!configReady) {
    pageViewPending = true;
    return;
  }
  if (!isTrackingConfigured()) return;
  clearTimeout(pageTimer);
  pageTimer = setTimeout(() => sendPageView(), 300);
}

/* ───────────────────────────── Ecommerce events ───────────────────────────── */

export function trackViewItem(product: Product): void {
  if (!isTrackingConfigured() || !once(`view:${product.id}`)) return;
  const item = itemFromProduct(product);
  ga('view_item', { currency: CURRENCY, value: item.price, items: gaItems([item]) });
  meta(
    'ViewContent',
    { currency: CURRENCY, value: item.price, content_name: item.name, content_category: item.category, ...metaContents([item]) },
    { serverCopy: true }
  );
}

/** GA4 only — Meta has no list-view event. Sends at most the first 30 items. */
export function trackViewItemList(products: Product[], listId: string, listName: string): void {
  if (!isTrackingConfigured() || products.length === 0) return;
  const shown = products.slice(0, 30);
  if (!once(`list:${listId}:${shown.map((p) => p.id).join(',')}`, 10_000)) return;
  ga('view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items: gaItems(shown.map((p) => itemFromProduct(p)), { item_list_id: listId, item_list_name: listName }),
  });
}

export function trackAddToCart(item: TrackItem): void {
  if (!isTrackingConfigured() || item.quantity <= 0) return;
  const value = itemsValue([item]);
  ga('add_to_cart', { currency: CURRENCY, value, items: gaItems([item]) });
  meta('AddToCart', { currency: CURRENCY, value, content_name: item.name, ...metaContents([item]) }, { serverCopy: true });
}

/** GA4 only — Meta has no remove-from-cart standard event. */
export function trackRemoveFromCart(item: TrackItem): void {
  if (!isTrackingConfigured() || item.quantity <= 0) return;
  ga('remove_from_cart', { currency: CURRENCY, value: itemsValue([item]), items: gaItems([item]) });
}

export interface CheckoutSnapshot {
  items: TrackItem[];
  /** What the shopper will pay for the goods, after the coupon discount. */
  value: number;
  coupon?: string;
}

export function trackBeginCheckout(c: CheckoutSnapshot): void {
  if (!isTrackingConfigured() || c.items.length === 0) return;
  ga('begin_checkout', { currency: CURRENCY, value: round(c.value), ...(c.coupon ? { coupon: c.coupon } : {}), items: gaItems(c.items) });
  meta('InitiateCheckout', { currency: CURRENCY, value: round(c.value), ...metaContents(c.items) }, { serverCopy: true });
}

/** GA4 only. `shippingTier` is the delivery zone label. */
export function trackAddShippingInfo(c: CheckoutSnapshot & { shippingTier: string }): void {
  if (!isTrackingConfigured() || c.items.length === 0) return;
  ga('add_shipping_info', {
    currency: CURRENCY,
    value: round(c.value),
    shipping_tier: c.shippingTier,
    ...(c.coupon ? { coupon: c.coupon } : {}),
    items: gaItems(c.items),
  });
}

export function trackAddPaymentInfo(c: CheckoutSnapshot & { paymentType: string }): void {
  if (!isTrackingConfigured() || c.items.length === 0) return;
  ga('add_payment_info', {
    currency: CURRENCY,
    value: round(c.value),
    payment_type: c.paymentType,
    ...(c.coupon ? { coupon: c.coupon } : {}),
    items: gaItems(c.items),
  });
  meta('AddPaymentInfo', { currency: CURRENCY, value: round(c.value), ...metaContents(c.items) }, { serverCopy: true });
}

export function trackSearch(term: string): void {
  const q = term.trim().slice(0, 100);
  if (!isTrackingConfigured() || !q || !once(`search:${q.toLowerCase()}`, 3000)) return;
  ga('search', { search_term: q });
  meta('Search', { search_string: q, currency: CURRENCY }, { serverCopy: true });
}

/* ───────────────────────────── Purchase ───────────────────────────── */

/** Must match purchaseEventId() in server/src/lib/tracking/orders.ts. */
export const purchaseEventId = (orderId: string) => `purchase_${orderId}`;

const PURCHASES_KEY = 'aks.trackedPurchases.v1';

function purchaseAlreadyTracked(orderId: string): boolean {
  try {
    const ids = JSON.parse(localStorage.getItem(PURCHASES_KEY) || '[]') as string[];
    return ids.includes(orderId);
  } catch {
    return false;
  }
}

function markPurchaseTracked(orderId: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(PURCHASES_KEY) || '[]') as string[];
    localStorage.setItem(PURCHASES_KEY, JSON.stringify([orderId, ...ids.filter((i) => i !== orderId)].slice(0, 50)));
  } catch {
    /* storage blocked — the in-memory guard below still holds for this visit */
  }
}

const purchasesThisVisit = new Set<string>();

/**
 * Purchase — call ONLY with the order the API just created (POST /orders
 * response), never from the confirmation page. All amounts come from the
 * server's order record. Guarded per order id, so a retry, refresh or
 * back-navigation never sends it twice from this browser; the server sends the
 * CAPI copy with the same event_id.
 */
export function trackPurchase(order: ApiOrder, catalog: Product[] = []): void {
  if (!isTrackingConfigured() || !order?.id) return;
  if (purchasesThisVisit.has(order.id) || purchaseAlreadyTracked(order.id)) return;
  purchasesThisVisit.add(order.id);
  markPurchaseTracked(order.id);

  const bySku = new Map(catalog.map((p) => [p.sku, p]));
  const items: TrackItem[] = (order.items ?? []).map((it) => {
    const p = bySku.get(it.productSku);
    const variant = [it.color, it.size].filter((v) => v && v !== 'Default').join(' / ');
    return {
      id: it.productSku || it.productId || '',
      name: it.productName,
      price: round(it.price),
      quantity: it.quantity,
      brand: p?.brand,
      category: p?.category,
      category2: p?.subcategory,
      variant: variant || undefined,
    };
  });

  const value = round(order.total);
  ga('purchase', {
    transaction_id: order.id,
    currency: CURRENCY,
    value,
    tax: round(order.tax ?? 0),
    shipping: round(order.shippingFee),
    ...(order.couponCode ? { coupon: order.couponCode } : {}),
    items: gaItems(items),
  });
  meta(
    'Purchase',
    { currency: CURRENCY, value, order_id: order.id, ...metaContents(items) },
    { eventId: purchaseEventId(order.id) }
  );
}

/** Identifiers + consent the API needs to send the server-side Purchase. */
export function checkoutTrackingContext() {
  const consent = getConsent();
  const marketing = isPixelConfigured() && consent?.marketing === true;
  return {
    consent: { analytics: isGaConfigured() && consent?.analytics === true, marketing },
    ...(marketing ? metaBrowserIds() : {}),
    eventSourceUrl: window.location.href,
  };
}
