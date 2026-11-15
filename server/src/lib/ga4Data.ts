// GA4 Data API (read-only) for the Traffic page.
//
// Auth: a Google service account (key JSON in the encrypted secret store,
// GA4_SERVICE_ACCOUNT_JSON env first) signs a JWT with node:crypto and swaps
// it for an access token with the analytics.readonly scope — no extra SDK.
// The service account must be added as a Viewer on the GA4 property.
//
// Reports are aggregate (no user-level data) and cached in Ga4ReportCache.
// Nothing is estimated: when GA4 is unreachable the API says so.
import crypto from 'node:crypto';
import { prisma } from './prisma.ts';
import { getSecret } from './secrets.ts';

export const GA4_PROPERTY_SETTING = 'ga4PropertyId';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const PROPERTY_RE = /^\d{5,15}$/;

let propertySetting: string | null = null;

export async function loadGa4Settings(): Promise<void> {
  const row = await prisma.storeSetting.findUnique({ where: { key: GA4_PROPERTY_SETTING } });
  try {
    propertySetting = row ? (JSON.parse(row.value) as string) || null : null;
  } catch {
    propertySetting = row?.value || null;
  }
}

export const validGa4PropertyId = (v: string) => PROPERTY_RE.test(v);

export function resolvedGa4Property(): { value: string | null; source: 'env' | 'admin' | null } {
  const env = (process.env.GA4_PROPERTY_ID ?? '').trim();
  if (env) return { value: env, source: 'env' };
  return propertySetting ? { value: propertySetting, source: 'admin' } : { value: null, source: null };
}

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = getSecret('GA4_SERVICE_ACCOUNT_JSON');
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    if (!j.client_email || !j.private_key) return null;
    return {
      clientEmail: j.client_email,
      privateKey: j.private_key,
      tokenUri: (process.env.GA4_OAUTH_TOKEN_URL ?? '').trim() || j.token_uri || 'https://oauth2.googleapis.com/token',
    };
  } catch {
    return null;
  }
}

/** Public facts for the Integrations page (the email must be granted access in GA4). */
export function ga4DataStatus() {
  const sa = serviceAccount();
  const property = resolvedGa4Property();
  return {
    propertyId: property.value,
    propertySource: property.source,
    serviceAccountEmail: sa?.clientEmail ?? null,
    connected: sa !== null && property.value !== null,
  };
}

export class Ga4Error extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
  }
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

let tokenCache: { email: string; token: string; expiresAt: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.email === sa.clientEmail && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.clientEmail, scope: SCOPE, aud: sa.tokenUri, iat: now, exp: now + 3600 }));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), sa.privateKey);
  const res = await fetch(sa.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(signature)}` }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const body = (await res?.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res || !res.ok || !body.access_token) {
    throw new Ga4Error(`Google sign-in failed: ${(body?.error_description ?? body?.error ?? (res ? `HTTP ${res.status}` : 'network error')).slice(0, 200)}`);
  }
  tokenCache = { email: sa.clientEmail, token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

interface RunReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
  totals?: { metricValues?: { value: string }[] }[];
  rowCount?: number;
}

export interface ReportRequest {
  dimensions?: string[];
  metrics: string[];
  limit?: number;
  orderByMetric?: string;
  /** Ask GA4 for metric totals across all rows. */
  totals?: boolean;
}

export interface ReportRows {
  rows: { dims: string[]; values: number[] }[];
  totals: number[] | null;
}

async function runReport(range: { start: string; end: string }, req: ReportRequest): Promise<ReportRows> {
  const sa = serviceAccount();
  const property = resolvedGa4Property().value;
  if (!sa || !property) throw new Ga4Error('Google Analytics is not connected', 409);
  const token = await accessToken(sa);
  const base = ((process.env.GA4_DATA_API_BASE ?? '').trim() || 'https://analyticsdata.googleapis.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/v1beta/properties/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: range.start, endDate: range.end }],
      dimensions: (req.dimensions ?? []).map((name) => ({ name })),
      metrics: req.metrics.map((name) => ({ name })),
      ...(req.limit ? { limit: String(req.limit) } : {}),
      ...(req.orderByMetric ? { orderBys: [{ metric: { metricName: req.orderByMetric }, desc: true }] } : {}),
      ...(req.totals ? { metricAggregations: ['TOTAL'] } : {}),
      keepEmptyRows: false,
    }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  const body = (await res?.json().catch(() => ({}))) as RunReportResponse & { error?: { message?: string; status?: string } };
  if (!res || !res.ok) {
    if (res?.status === 401) tokenCache = null;
    const msg = body?.error?.message ?? (res ? `HTTP ${res.status}` : 'network error');
    // Always 502: a 401/403 here is Google's answer, not the admin's own access.
    const hint = res?.status === 403 ? ' Add the service-account email as a Viewer in GA4 → Admin → Property access management.' : '';
    throw new Ga4Error(`Google Analytics: ${msg.slice(0, 300)}${hint}`, 502);
  }
  return {
    rows: (body.rows ?? []).map((r) => ({
      dims: (r.dimensionValues ?? []).map((d) => d.value),
      values: (r.metricValues ?? []).map((m) => Number(m.value) || 0),
    })),
    totals: body.totals?.[0]?.metricValues?.map((m) => Number(m.value) || 0) ?? null,
  };
}

/* ───────────────────────────── Traffic report ───────────────────────────── */

const OVERVIEW_METRICS = ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'ecommercePurchases', 'purchaseRevenue'] as const;

const REPORTS = {
  overview: { metrics: [...OVERVIEW_METRICS] },
  daily: { dimensions: ['date'], metrics: ['sessions', 'totalUsers'], limit: 1000 },
  channels: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions', 'engagedSessions', 'ecommercePurchases', 'purchaseRevenue'], orderByMetric: 'sessions', limit: 25 },
  sourceMedium: { dimensions: ['sessionSourceMedium'], metrics: ['sessions', 'ecommercePurchases', 'purchaseRevenue'], orderByMetric: 'sessions', limit: 20 },
  landingPages: { dimensions: ['landingPage'], metrics: ['sessions', 'engagedSessions', 'ecommercePurchases'], orderByMetric: 'sessions', limit: 20 },
  devices: { dimensions: ['deviceCategory'], metrics: ['sessions', 'ecommercePurchases'], orderByMetric: 'sessions', limit: 10 },
  // Per-item funnel; storefront tracking sends the product SKU as item_id.
  items: { dimensions: ['itemId'], metrics: ['itemsViewed', 'itemsAddedToCart', 'itemsPurchased'], orderByMetric: 'itemsViewed', limit: 2000 },
} satisfies Record<string, ReportRequest>;

export type TrafficReportName = keyof typeof REPORTS;

function cacheKey(name: string, start: string, end: string): string {
  const sa = serviceAccount();
  const id = `${resolvedGa4Property().value}|${sa?.clientEmail ?? ''}|${name}|${start}|${end}`;
  return `ga4:${crypto.createHash('sha256').update(id).digest('hex').slice(0, 40)}`;
}

/** Run (or read from cache) one named report. */
async function cachedReport(name: TrafficReportName, start: string, end: string, today: string, refresh: boolean): Promise<{ data: ReportRows; fetchedAt: Date }> {
  const key = cacheKey(name, start, end);
  if (!refresh) {
    const hit = await prisma.ga4ReportCache.findUnique({ where: { key } });
    if (hit && hit.expiresAt > new Date()) return { data: JSON.parse(hit.payload) as ReportRows, fetchedAt: hit.fetchedAt };
  }
  const data = await runReport({ start, end }, REPORTS[name]);
  // Ranges that include today keep changing; past ranges settle within ~a day.
  const ttl = end >= today ? 3600_000 : 24 * 3600_000;
  const fetchedAt = new Date();
  const payload = JSON.stringify(data);
  await prisma.ga4ReportCache.upsert({
    where: { key },
    create: { key, payload, fetchedAt, expiresAt: new Date(Date.now() + ttl) },
    update: { payload, fetchedAt, expiresAt: new Date(Date.now() + ttl) },
  });
  return { data, fetchedAt };
}

export interface TrafficReport {
  range: { start: string; end: string };
  fetchedAt: string;
  totals: {
    sessions: number;
    users: number;
    newUsers: number;
    engagedSessions: number;
    engagementRate: number | null;
    purchases: number;
    purchaseRevenue: number;
    conversionRate: number | null;
  };
  daily: { day: string; sessions: number; users: number }[];
  channels: { channel: string; sessions: number; engagedSessions: number; purchases: number; revenue: number }[];
  sourceMedium: { sourceMedium: string; sessions: number; purchases: number; revenue: number }[];
  landingPages: { page: string; sessions: number; engagedSessions: number; purchases: number }[];
  devices: { device: string; sessions: number; purchases: number }[];
}

const div = (a: number, b: number) => (b === 0 ? null : a / b);

/** GA4 traffic for store-local calendar days start..end (YYYY-MM-DD). */
export async function trafficReport(start: string, end: string, today: string, refresh = false): Promise<TrafficReport> {
  const names: TrafficReportName[] = ['overview', 'daily', 'channels', 'sourceMedium', 'landingPages', 'devices'];
  const results = await Promise.all(names.map((n) => cachedReport(n, start, end, today, refresh)));
  const r = Object.fromEntries(names.map((n, i) => [n, results[i].data])) as Record<TrafficReportName, ReportRows>;
  const fetchedAt = new Date(Math.min(...results.map((x) => x.fetchedAt.getTime())));

  const o = r.overview.rows[0]?.values ?? OVERVIEW_METRICS.map(() => 0);
  const [sessions, users, newUsers, engagedSessions, purchases, purchaseRevenue] = o;
  return {
    range: { start, end },
    fetchedAt: fetchedAt.toISOString(),
    totals: {
      sessions,
      users,
      newUsers,
      engagedSessions,
      engagementRate: div(engagedSessions, sessions),
      purchases,
      purchaseRevenue,
      conversionRate: div(purchases, sessions),
    },
    daily: r.daily.rows
      .map((x) => ({ day: `${x.dims[0].slice(0, 4)}-${x.dims[0].slice(4, 6)}-${x.dims[0].slice(6, 8)}`, sessions: x.values[0], users: x.values[1] }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    channels: r.channels.rows.map((x) => ({ channel: x.dims[0], sessions: x.values[0], engagedSessions: x.values[1], purchases: x.values[2], revenue: x.values[3] })),
    sourceMedium: r.sourceMedium.rows.map((x) => ({ sourceMedium: x.dims[0], sessions: x.values[0], purchases: x.values[1], revenue: x.values[2] })),
    landingPages: r.landingPages.rows.map((x) => ({ page: x.dims[0], sessions: x.values[0], engagedSessions: x.values[1], purchases: x.values[2] })),
    devices: r.devices.rows.map((x) => ({ device: x.dims[0], sessions: x.values[0], purchases: x.values[1] })),
  };
}

export interface ItemFunnelReport {
  range: { start: string; end: string };
  fetchedAt: string;
  /** Keyed by GA4 item_id (= product SKU). */
  items: Map<string, { viewed: number; addedToCart: number; purchased: number }>;
}

/** GA4 per-item views / add-to-carts / purchases for store-local days start..end. */
export async function itemFunnelReport(start: string, end: string, today: string, refresh = false): Promise<ItemFunnelReport> {
  const { data, fetchedAt } = await cachedReport('items', start, end, today, refresh);
  const items = new Map<string, { viewed: number; addedToCart: number; purchased: number }>();
  for (const r of data.rows) {
    const id = r.dims[0];
    if (!id || id === '(not set)') continue;
    items.set(id, { viewed: r.values[0], addedToCart: r.values[1], purchased: r.values[2] });
  }
  return { range: { start, end }, fetchedAt: fetchedAt.toISOString(), items };
}

/** Smallest possible request, for "Test connection". */
export async function testGa4Connection(today: string): Promise<{ sessionsLast7Days: number }> {
  const start = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  const r = await runReport({ start, end: today }, { metrics: ['sessions'] });
  return { sessionsLast7Days: r.rows[0]?.values[0] ?? 0 };
}

export async function clearGa4Cache(): Promise<void> {
  tokenCache = null;
  await prisma.ga4ReportCache.deleteMany();
}

export async function purgeExpiredGa4Cache(): Promise<string> {
  const res = await prisma.ga4ReportCache.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return `${res.count} expired GA4 report(s) removed`;
}
