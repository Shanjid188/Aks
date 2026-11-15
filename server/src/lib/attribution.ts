// Marketing attribution for orders: validate the storefront's `attribution`
// block, derive a channel, and link touches to MarketingCampaign rows.
//
// Model: the storefront keeps the first and the last NON-direct visit within a
// 30-day window. "Last non-direct" is the default reporting model; "first" is
// the alternative. Both rows are stored per order.
//
// Privacy: campaign tags (utm_*) and the referring HOST describe the campaign,
// not the person, and are kept for every order. Ad click IDs identify an ad
// click and are kept only when the order carries advertising consent; they are
// erased after CLICK_ID_RETENTION_DAYS. Full referrer URLs are never accepted.
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.ts';

export const ATTRIBUTION_WINDOW_DAYS = 30;
export const CLICK_ID_RETENTION_DAYS = 90;

export const CLICK_ID_TYPES = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid'] as const;
export type ClickIdType = (typeof CLICK_ID_TYPES)[number];

export const CHANNELS = [
  'paid_social',
  'paid_search',
  'organic_search',
  'social',
  'email',
  'sms',
  'referral',
  'display',
  'affiliate',
  'other',
] as const;
export type Channel = (typeof CHANNELS)[number];

export interface Touch {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  utmId: string | null;
  clickIdType: ClickIdType | null;
  clickId: string | null;
  referrerHost: string | null;
  landingPath: string | null;
  touchedAt: Date;
  channel: Channel;
}

/* ───────────────────────────── Cleaning ───────────────────────────── */

// Printable text without control characters or angle brackets.
const SAFE_TEXT = /^[^\u0000-\u001f\u007f<>]+$/;

function tag(v: unknown, max = 150): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > max || !SAFE_TEXT.test(s)) return null;
  return s;
}

function host(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return /^(?=.{1,253}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s.replace(/^www\./, '') : null;
}

function path(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  // Path only — the query string can carry personal data and is dropped.
  return /^\/[^\s?#]{0,300}$/.test(s) ? s : null;
}

function clickId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^[A-Za-z0-9_.~-]{4,500}$/.test(s) ? s : null;
}

function when(v: unknown, now: number): Date | null {
  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) return null;
  // Inside the attribution window and not in the future (5 min clock skew).
  if (t > now + 5 * 60_000 || t < now - ATTRIBUTION_WINDOW_DAYS * 86_400_000) return null;
  return new Date(t);
}

function cleanTouch(raw: unknown, allowClickId: boolean, now: number): Touch | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const touchedAt = when(r.at, now);
  if (!touchedAt) return null;
  const type = CLICK_ID_TYPES.includes(r.clickIdType as ClickIdType) ? (r.clickIdType as ClickIdType) : null;
  const id = type && allowClickId ? clickId(r.clickId) : null;
  const t = {
    utmSource: tag(r.source)?.toLowerCase() ?? null,
    utmMedium: tag(r.medium)?.toLowerCase() ?? null,
    utmCampaign: tag(r.campaign, 200),
    utmContent: tag(r.content, 200),
    utmTerm: tag(r.term),
    utmId: tag(r.id, 100),
    clickIdType: type,
    clickId: id,
    referrerHost: host(r.referrerHost),
    landingPath: path(r.landingPath),
    touchedAt,
  };
  // A touch must carry at least one marketing signal (otherwise it was direct).
  if (!t.utmSource && !t.utmMedium && !t.utmCampaign && !t.utmId && !t.clickIdType && !t.referrerHost) return null;
  return { ...t, channel: deriveChannel(t) };
}

export interface ParsedAttribution {
  first: Touch | null;
  last: Touch | null;
}

/** Validate the storefront's `attribution` block. Absent/invalid → no attribution (direct). */
export function parseAttribution(raw: unknown, marketingConsent: boolean, now = Date.now()): ParsedAttribution {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const first = cleanTouch(a.first, marketingConsent, now);
  const last = cleanTouch(a.last, marketingConsent, now) ?? first;
  return { first: first ?? last, last };
}

/* ───────────────────────────── Channels ───────────────────────────── */

const PAID_SEARCH_MEDIUMS = new Set(['cpc', 'ppc', 'paid_search', 'paidsearch', 'paid-search', 'sem']);
const PAID_SOCIAL_MEDIUMS = new Set(['paid_social', 'paidsocial', 'paid-social', 'social_paid', 'cpm', 'paid', 'ads']);
const SOCIAL_MEDIUMS = new Set(['social', 'social-network', 'social_network', 'social-media', 'sm', 'organic_social']);
const SOCIAL_SOURCES = new Set(['facebook', 'fb', 'instagram', 'ig', 'tiktok', 'youtube', 'linkedin', 'twitter', 'x', 'messenger', 'whatsapp', 'pinterest', 'threads']);
const SEARCH_HOSTS = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|search\.brave)\./;
const SOCIAL_HOSTS = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|t\.co|twitter\.com|x\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|lnkd\.in|pinterest\.com|threads\.net|messenger\.com|whatsapp\.com)$/;

export function deriveChannel(t: Omit<Touch, 'channel' | 'touchedAt'>): Channel {
  const medium = t.utmMedium ?? '';
  const source = t.utmSource ?? '';
  if (PAID_SEARCH_MEDIUMS.has(medium)) return 'paid_search';
  if (PAID_SOCIAL_MEDIUMS.has(medium)) return SOCIAL_SOURCES.has(source) || !source ? 'paid_social' : 'display';
  if (medium === 'email' || medium === 'newsletter') return 'email';
  if (medium === 'sms') return 'sms';
  if (SOCIAL_MEDIUMS.has(medium)) return 'social';
  if (medium === 'organic') return 'organic_search';
  if (medium === 'referral') return 'referral';
  if (medium === 'display' || medium === 'banner') return 'display';
  if (medium === 'affiliate') return 'affiliate';
  if (t.clickIdType === 'gclid' || t.clickIdType === 'gbraid' || t.clickIdType === 'wbraid' || t.clickIdType === 'msclkid') return 'paid_search';
  if (t.clickIdType === 'ttclid') return 'paid_social';
  if (SOCIAL_SOURCES.has(source)) return 'social';
  // Meta adds fbclid to organic shares too, so on its own it means "social".
  if (t.clickIdType === 'fbclid') return 'social';
  if (!medium && !source && t.referrerHost) {
    if (SEARCH_HOSTS.test(t.referrerHost)) return 'organic_search';
    if (SOCIAL_HOSTS.test(t.referrerHost)) return 'social';
    return 'referral';
  }
  return 'other';
}

/* ───────────────────────────── Campaign matching ───────────────────────────── */

export interface MatchableCampaign {
  id: string;
  name: string;
  platformCampaignId: string | null;
  matchKeys: string;
  createdAt: Date;
}

export function parseMatchKeys(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string').map((k) => k.trim().toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Campaign for a touch: utm_id = platform campaign id first, then utm_campaign
 * ∈ match keys (or equal to the campaign name). Ties go to the oldest campaign
 * so the result is deterministic. Archived campaigns still match history.
 */
export function matchCampaign(
  t: Pick<Touch, 'utmId' | 'utmCampaign'>,
  campaigns: MatchableCampaign[]
): string | null {
  const sorted = [...campaigns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (t.utmId) {
    const byId = sorted.find((c) => c.platformCampaignId && c.platformCampaignId === t.utmId);
    if (byId) return byId.id;
  }
  const key = t.utmCampaign?.trim().toLowerCase();
  if (key) {
    const byKey = sorted.find((c) => parseMatchKeys(c.matchKeys).includes(key) || c.name.trim().toLowerCase() === key);
    if (byKey) return byKey.id;
  }
  return null;
}

export async function matchableCampaigns(): Promise<MatchableCampaign[]> {
  return prisma.marketingCampaign.findMany({
    select: { id: true, name: true, platformCampaignId: true, matchKeys: true, createdAt: true },
  });
}

/** Nested-create rows for Order.attributions (written in the same statement as the order). */
export async function attributionCreateInput(
  parsed: ParsedAttribution
): Promise<Prisma.OrderAttributionCreateWithoutOrderInput[] | undefined> {
  if (!parsed.last || !parsed.first) return undefined;
  const campaigns = await matchableCampaigns();
  return (['first', 'last'] as const).map((touch) => {
    const t = parsed[touch]!;
    const campaignId = matchCampaign(t, campaigns);
    return {
      touch,
      channel: t.channel,
      utmSource: t.utmSource,
      utmMedium: t.utmMedium,
      utmCampaign: t.utmCampaign,
      utmContent: t.utmContent,
      utmTerm: t.utmTerm,
      utmId: t.utmId,
      clickIdType: t.clickIdType,
      clickId: t.clickId,
      referrerHost: t.referrerHost,
      landingPath: t.landingPath,
      touchedAt: t.touchedAt,
      ...(campaignId ? { campaign: { connect: { id: campaignId } } } : {}),
    };
  });
}

/**
 * Re-link attribution rows to campaigns: rows with no campaign, plus rows
 * currently linked to `campaignId` (whose match rules may have changed).
 * Returns how many rows changed.
 */
export async function rematchAttributions(campaignId?: string): Promise<number> {
  const campaigns = await matchableCampaigns();
  const rows = await prisma.orderAttribution.findMany({
    where: {
      OR: [{ campaignId: null }, ...(campaignId ? [{ campaignId }] : [])],
      AND: [{ OR: [{ utmId: { not: null } }, { utmCampaign: { not: null } }] }],
    },
    select: { id: true, utmId: true, utmCampaign: true, campaignId: true },
  });
  let changed = 0;
  for (const r of rows) {
    const next = matchCampaign(r, campaigns);
    if (next !== r.campaignId) {
      await prisma.orderAttribution.update({ where: { id: r.id }, data: { campaignId: next } });
      changed++;
    }
  }
  return changed;
}

/** Erase ad click IDs older than the retention period. */
export async function purgeExpiredClickIds(now = Date.now(), db: Pick<typeof prisma, 'orderAttribution'> = prisma): Promise<number> {
  const cutoff = new Date(now - CLICK_ID_RETENTION_DAYS * 86_400_000);
  const res = await db.orderAttribution.updateMany({
    where: { clickId: { not: null }, createdAt: { lt: cutoff } },
    data: { clickId: null },
  });
  return res.count;
}
