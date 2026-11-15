/**
 * Anonymous checkout sessions, for abandoned-cart analytics.
 *
 * While the shopper is on checkout the cart (SKU, quantity, size, colour) is
 * synced under a random token kept in localStorage. No personal data is sent
 * unless the shopper ticks the reminder opt-in, which is unticked by default.
 * Prices are never sent — the server prices items from the catalog. Ad click
 * IDs are stripped; only campaign tags travel, so the channel can be shown.
 */
import { api } from '../api';
import type { CartItem } from '../types';
import { attributionForOrder, type AttributionTouch } from './tracking/attribution';

const KEY = 'aks.checkoutSession.v1';
const USE_API = import.meta.env.VITE_USE_API !== 'false';

/** The exact opt-in wording approved for the checkout page. */
export const CART_REMINDER_CONSENT_TEXT = 'I agree to receive a reminder about my abandoned cart via WhatsApp or SMS.';

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readToken(): string | null {
  try {
    const t = localStorage.getItem(KEY);
    return t && /^[A-Za-z0-9_-]{32,128}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/** Token for the current checkout (created on first use). */
export function checkoutSessionToken(): string {
  let t = readToken();
  if (!t) {
    t = randomToken();
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // Storage blocked: the token lives for this page only.
    }
  }
  return t;
}

/** Forget the token once an order is placed (the next checkout is a new session). */
export function resetCheckoutSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Token to attach to the order, if a session exists. */
export function currentCheckoutSession(): string | undefined {
  return readToken() ?? undefined;
}

function campaignTouches() {
  const a = attributionForOrder();
  if (!a) return undefined;
  const strip = (t?: AttributionTouch): Omit<AttributionTouch, 'clickId' | 'clickIdType'> | undefined => {
    if (!t) return undefined;
    const { clickId: _id, clickIdType: _type, ...rest } = t;
    return rest;
  };
  return { first: strip(a.first), last: strip(a.last) };
}

export interface ReminderContact {
  phone: string;
  email?: string;
}

/**
 * Sync the cart. `contact` is sent only when the shopper has opted in;
 * omit it to leave stored consent unchanged. Failures are silent — this is
 * analytics and must never affect checkout.
 */
export async function syncCheckoutSession(cart: CartItem[], contact?: ReminderContact): Promise<void> {
  if (!USE_API) return;
  const items = cart
    .filter((c) => c.product?.sku)
    .slice(0, 50)
    .map((c) => ({
      sku: c.product.sku,
      quantity: Math.min(99, Math.max(1, Math.floor(c.quantity))),
      size: typeof c.selectedSize === 'string' ? c.selectedSize : c.selectedSize?.size ?? '',
      color: c.selectedColor?.name ?? '',
    }));
  try {
    await api(`/checkout-sessions/${checkoutSessionToken()}`, {
      method: 'PUT',
      body: { items, attribution: campaignTouches(), ...(contact ? { contact: { consent: true, phone: contact.phone, email: contact.email } } : {}) },
    });
  } catch {
    // ignore
  }
}

/** Shopper unticked the reminder box: erase stored contact details. */
export async function withdrawReminderConsent(): Promise<void> {
  const t = readToken();
  if (!USE_API || !t) return;
  try {
    await api(`/checkout-sessions/${t}/contact`, { method: 'DELETE' });
  } catch {
    // ignore
  }
}

export interface RestoredItem {
  sku: string;
  quantity: number;
  size: string;
  color: string;
}

/** Items behind a `/cart?restore=<code>` link. */
export function fetchRestoredCart(code: string) {
  return api<{ items: RestoredItem[]; status: string }>(`/checkout-sessions/restore/${encodeURIComponent(code)}`);
}

/** "Forget my details" from a restore link. */
export function eraseDetailsByRestoreCode(code: string) {
  return api<{ erased: boolean }>(`/checkout-sessions/restore/${encodeURIComponent(code)}/contact`, { method: 'DELETE' });
}
