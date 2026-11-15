// Abandoned carts, privacy-conscious (Advertising → Abandoned Carts).
//
// Anonymous layer (everyone): the storefront keeps a random token and PUTs its
// cart while the shopper is on checkout. We store only the token's hash, the
// items re-priced from the catalog, the value and the marketing channel.
//
// Contact layer (opt-in only): when the shopper ticks the unticked-by-default
// reminder box, their phone (and email, if given) is stored with the consent
// time and a random restore code. Contact details are erased when the order is
// placed, when the shopper withdraws (unticks, or uses the link), and
// CART_CONTACT_RETENTION_DAYS after abandonment. They are never sent to any ad
// platform, and an admin can only see them with advertising.carts_contact
// (every reveal is audited).
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.ts';
import { matchCampaign, matchableCampaigns, parseAttribution } from './attribution.ts';

export const CART_CONSENT_TEXT = 'I agree to receive a reminder about my abandoned cart via WhatsApp or SMS.';

const num = (v: string | undefined, fallback: number, min: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? n : fallback;
};
/** Inactivity after which an active checkout counts as abandoned. */
export const abandonAfterMinutes = () => num(process.env.CART_ABANDON_MINUTES, 60, 5);
/** Contact details are erased this many days after abandonment. */
export const contactRetentionDays = () => num(process.env.CART_CONTACT_RETENTION_DAYS, 30, 1);
/** Whole sessions are deleted this many days after creation. */
export const sessionRetentionDays = () => num(process.env.CART_SESSION_RETENTION_DAYS, 180, 7);

export class CartInputError extends Error {}

const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const RESTORE_RE = /^[A-Za-z0-9_-]{20,64}$/;
const BD_PHONE_RE = /^01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export const MAX_ITEMS = 50;
const MAX_QTY = 99;

export const validToken = (t: unknown): t is string => typeof t === 'string' && TOKEN_RE.test(t);
export const validRestoreCode = (c: unknown): c is string => typeof c === 'string' && RESTORE_RE.test(c);
export const hashToken = (t: string) => crypto.createHash('sha256').update(`checkout-session:${t}`).digest('hex');

export interface SessionItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
}

const shortText = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Validate the storefront's items and price them from the catalog (client prices are ignored). */
export async function priceItems(raw: unknown): Promise<SessionItem[]> {
  if (!Array.isArray(raw)) throw new CartInputError('items must be a list');
  if (raw.length > MAX_ITEMS) throw new CartInputError(`At most ${MAX_ITEMS} items`);
  const wanted = raw.map((r) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const sku = shortText(o.sku, 80);
    const quantity = Number(o.quantity);
    if (!sku) throw new CartInputError('Each item needs a SKU');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) throw new CartInputError('Quantity must be 1–99');
    return { sku, quantity, size: shortText(o.size, 40), color: shortText(o.color, 40) };
  });
  const products = await prisma.product.findMany({
    where: { sku: { in: [...new Set(wanted.map((w) => w.sku))] }, isActive: true },
    select: { id: true, sku: true, name: true, price: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  // Unknown or inactive SKUs are dropped, never trusted.
  return wanted.flatMap((w) => {
    const p = bySku.get(w.sku);
    return p ? [{ productId: p.id, sku: p.sku, name: p.name, quantity: w.quantity, size: w.size, color: w.color, price: p.price }] : [];
  });
}

export function parseItems(json: string): SessionItem[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as SessionItem[]) : [];
  } catch {
    return [];
  }
}

/** Opt-in contact: only with explicit consent and a valid Bangladeshi mobile number. */
export function parseContact(raw: unknown): { phone: string; email: string | null } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.consent !== true) throw new CartInputError('Contact details need the reminder consent');
  const phone = shortText(o.phone, 20).replace(/[\s-]/g, '').replace(/^\+?88/, '');
  if (!BD_PHONE_RE.test(phone)) throw new CartInputError('Enter a valid Bangladeshi mobile number');
  const email = shortText(o.email, 254).toLowerCase();
  return { phone, email: email && EMAIL_RE.test(email) ? email : null };
}

const ERASE_CONTACT = { contactPhone: null, contactEmail: null, contactConsentAt: null, restoreCode: null } as const;

/** Create or update the session behind a storefront token. */
export async function upsertSession(
  token: string,
  body: { items: unknown; attribution?: unknown; contact?: unknown }
): Promise<{ status: string; value: number; contact: boolean }> {
  const tokenHash = hashToken(token);
  const existing = await prisma.checkoutSession.findUnique({ where: { tokenHash } });
  // A converted or expired session is finished; the storefront starts a new token.
  if (existing && (existing.status === 'converted' || existing.status === 'recovered' || existing.status === 'expired')) {
    return { status: existing.status, value: existing.value, contact: false };
  }
  const items = await priceItems(body.items);
  const value = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const contact = body.contact === undefined ? undefined : parseContact(body.contact);

  // Channel/campaign of the last non-direct touch — no click ids are stored here.
  const parsed = parseAttribution(body.attribution, false);
  const touch = parsed.last;
  const campaignId = touch ? matchCampaign(touch, await matchableCampaigns()) : null;

  const now = new Date();
  const data: Prisma.CheckoutSessionUncheckedUpdateInput = {
    items: JSON.stringify(items),
    value,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    lastActivityAt: now,
    // Coming back to checkout re-opens an abandoned cart.
    status: 'active',
    ...(touch ? { channel: touch.channel, campaignId } : {}),
    ...(contact
      ? {
          contactPhone: contact.phone,
          contactEmail: contact.email,
          contactConsentAt: existing?.contactConsentAt && existing.contactPhone ? existing.contactConsentAt : now,
          restoreCode: existing?.restoreCode ?? crypto.randomBytes(18).toString('base64url'),
          contactErasedAt: null,
        }
      : {}),
  };
  const saved = existing
    ? await prisma.checkoutSession.update({ where: { id: existing.id }, data })
    : await prisma.checkoutSession.create({ data: { ...(data as Prisma.CheckoutSessionUncheckedCreateInput), tokenHash } });
  return { status: saved.status, value: saved.value, contact: !!saved.contactPhone };
}

/** Shopper withdraws reminder consent (unticks the box, or via the restore link). */
export async function eraseContact(where: Prisma.CheckoutSessionWhereUniqueInput): Promise<boolean> {
  const s = await prisma.checkoutSession.findUnique({ where, select: { id: true, contactPhone: true, contactEmail: true } });
  if (!s) return false;
  if (s.contactPhone || s.contactEmail) {
    await prisma.checkoutSession.update({ where: { id: s.id }, data: { ...ERASE_CONTACT, contactErasedAt: new Date() } });
  }
  return true;
}

/** Items for /cart?restore=<code>. Marks the session as restored (for recovery stats). */
export async function restoreSession(code: string): Promise<{ items: { sku: string; quantity: number; size: string; color: string }[]; status: string } | null> {
  const s = await prisma.checkoutSession.findUnique({ where: { restoreCode: code } });
  if (!s) return null;
  await prisma.checkoutSession.update({ where: { id: s.id }, data: { restoredAt: new Date() } });
  return { items: parseItems(s.items).map(({ sku, quantity, size, color }) => ({ sku, quantity, size, color })), status: s.status };
}

/**
 * Link a just-placed order to its checkout session. An abandoned cart that is
 * then ordered counts as recovered. Contact details are no longer needed and
 * are erased. Never throws — the order must not depend on analytics.
 */
export async function convertSession(token: unknown, orderId: string): Promise<void> {
  if (!validToken(token)) return;
  try {
    const s = await prisma.checkoutSession.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!s || s.orderId || s.status === 'expired') return;
    const now = new Date();
    const recovered = s.status === 'abandoned' || s.abandonedAt !== null;
    await prisma.checkoutSession.update({
      where: { id: s.id },
      data: {
        status: recovered ? 'recovered' : 'converted',
        orderId,
        convertedAt: now,
        ...(recovered ? { recoveredAt: now } : {}),
        lastActivityAt: now,
        ...(s.contactPhone || s.contactEmail ? { ...ERASE_CONTACT, contactErasedAt: now } : {}),
      },
    });
  } catch (e) {
    console.warn('[carts] could not link order to checkout session:', e instanceof Error ? e.message : e);
  }
}

/** Job: mark idle carts abandoned, erase old contact details, delete old sessions. */
export async function runCartMaintenance(now = Date.now()): Promise<string> {
  const idleBefore = new Date(now - abandonAfterMinutes() * 60_000);
  const abandoned = await prisma.checkoutSession.updateMany({
    where: { status: 'active', lastActivityAt: { lt: idleBefore }, itemCount: { gt: 0 } },
    data: { status: 'abandoned', abandonedAt: new Date(now) },
  });
  // Empty carts carry no signal.
  const empty = await prisma.checkoutSession.deleteMany({ where: { status: 'active', itemCount: 0, lastActivityAt: { lt: idleBefore } } });
  const erased = await prisma.checkoutSession.updateMany({
    where: {
      abandonedAt: { lt: new Date(now - contactRetentionDays() * 86_400_000) },
      OR: [{ contactPhone: { not: null } }, { contactEmail: { not: null } }],
    },
    data: { ...ERASE_CONTACT, contactErasedAt: new Date(now) },
  });
  const deleted = await prisma.checkoutSession.deleteMany({ where: { createdAt: { lt: new Date(now - sessionRetentionDays() * 86_400_000) } } });
  return `${abandoned.count} abandoned, ${erased.count} contact(s) erased, ${deleted.count + empty.count} session(s) deleted`;
}

/* ───────────────────────────── Admin reporting ───────────────────────────── */

export interface CartSummary {
  sessions: number;
  active: number;
  converted: number;
  abandoned: number;
  recovered: number;
  /** abandoned ÷ (abandoned + converted + recovered); null when none finished. */
  abandonmentRate: number | null;
  /** recovered ÷ (abandoned + recovered). */
  recoveryRate: number | null;
  abandonedValue: number;
  recoveredValue: number;
  withContact: number;
  topAbandonedProducts: { sku: string; name: string; quantity: number; value: number; carts: number }[];
  byChannel: { channel: string; abandoned: number; abandonedValue: number }[];
}

const ratio = (a: number, b: number) => (b === 0 ? null : a / b);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Summary over sessions started within the window. */
export async function cartSummary(from: Date, to: Date): Promise<CartSummary> {
  const rows = await prisma.checkoutSession.findMany({
    where: { createdAt: { gte: from, lte: to }, itemCount: { gt: 0 } },
    select: { status: true, value: true, items: true, channel: true, contactPhone: true },
  });
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const converted = count('converted');
  const abandoned = count('abandoned');
  const recovered = count('recovered');
  const products = new Map<string, { sku: string; name: string; quantity: number; value: number; carts: number }>();
  const channels = new Map<string, { abandoned: number; abandonedValue: number }>();
  let abandonedValue = 0;
  let recoveredValue = 0;
  for (const r of rows) {
    if (r.status === 'recovered') recoveredValue += r.value;
    if (r.status !== 'abandoned') continue;
    abandonedValue += r.value;
    const ch = channels.get(r.channel ?? 'direct') ?? { abandoned: 0, abandonedValue: 0 };
    ch.abandoned++;
    ch.abandonedValue += r.value;
    channels.set(r.channel ?? 'direct', ch);
    for (const it of parseItems(r.items)) {
      const p = products.get(it.sku) ?? { sku: it.sku, name: it.name, quantity: 0, value: 0, carts: 0 };
      p.quantity += it.quantity;
      p.value += it.price * it.quantity;
      p.carts++;
      products.set(it.sku, p);
    }
  }
  return {
    sessions: rows.length,
    active: count('active'),
    converted,
    abandoned,
    recovered,
    abandonmentRate: ratio(abandoned, abandoned + converted + recovered),
    recoveryRate: ratio(recovered, abandoned + recovered),
    abandonedValue: round2(abandonedValue),
    recoveredValue: round2(recoveredValue),
    withContact: rows.filter((r) => r.status === 'abandoned' && r.contactPhone).length,
    topAbandonedProducts: [...products.values()].map((p) => ({ ...p, value: round2(p.value) })).sort((a, b) => b.value - a.value).slice(0, 10),
    byChannel: [...channels.entries()].map(([channel, c]) => ({ channel, abandoned: c.abandoned, abandonedValue: round2(c.abandonedValue) })).sort((a, b) => b.abandonedValue - a.abandonedValue),
  };
}

/** WhatsApp click-to-chat link (no API — the admin sends it by hand). */
export function whatsappLink(phone: string, restoreUrl: string | null): string {
  const intl = `880${phone.replace(/^0/, '')}`;
  const text = restoreUrl
    ? `Hi! You left some items in your cart. You can pick up where you left off here: ${restoreUrl}`
    : 'Hi! You left some items in your cart. Reply here if you need any help completing your order.';
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
