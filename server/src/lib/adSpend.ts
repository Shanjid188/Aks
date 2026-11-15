// Advertising spend: storage, CSV parsing, campaign linking and conversion to
// BDT with the admin-managed exchange-rate table.
//
// Exchange rates are never guessed: a non-BDT row on a day with no rate for
// its currency stays unconverted and is reported as such, and is left out of
// BDT totals, ROAS and CPA.
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.ts';
import { matchCampaign, matchableCampaigns, rematchAttributions } from './attribution.ts';

export const BASE_CURRENCY = 'BDT';
export const SPEND_PLATFORMS = ['meta', 'google', 'tiktok', 'other'] as const;
export type SpendPlatform = (typeof SPEND_PLATFORMS)[number];
const PLATFORM_CHANNEL: Record<SpendPlatform, string> = { meta: 'meta', google: 'google', tiktok: 'tiktok', other: 'other' };

export class SpendInputError extends Error {}

/* ───────────────────────────── Dates & currency ───────────────────────────── */

/** 'YYYY-MM-DD' (or anything Date can parse) → UTC midnight of that calendar day. */
export function spendDay(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s) ?? /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 ? d : null;
  }
  // Google Ads also exports e.g. "Nov 3, 2026" — interpreted as that calendar day.
  const named = /^[A-Za-z]{3,9}\.? \d{1,2}, \d{4}$/.test(s) ? new Date(`${s} UTC`) : null;
  if (named && !Number.isNaN(named.getTime())) return spendDay(named);
  return null;
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Store time zone for calendar days (ad platforms report per account-local day). */
export const STORE_TIME_ZONE = (process.env.STORE_TIMEZONE ?? '').trim() || 'Asia/Dhaka';

/** The store-local calendar day of an instant, as UTC midnight. */
export function storeDay(d: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return spendDay(parts)!;
}

export function currencyCode(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(s) ? s : null;
}

export interface FxTable {
  /** currency → rates, newest effectiveFrom first */
  byCurrency: Map<string, { rateToBdt: number; effectiveFrom: Date }[]>;
}

export async function loadFxTable(): Promise<FxTable> {
  const rows = await prisma.fxRate.findMany({ orderBy: { effectiveFrom: 'desc' } });
  const byCurrency = new Map<string, { rateToBdt: number; effectiveFrom: Date }[]>();
  for (const r of rows) {
    const list = byCurrency.get(r.currency) ?? [];
    list.push({ rateToBdt: r.rateToBdt, effectiveFrom: r.effectiveFrom });
    byCurrency.set(r.currency, list);
  }
  return { byCurrency };
}

/** BDT value of `amount` on `day`, or null when no rate covers that day. */
export function toBdt(amount: number, currency: string, day: Date, fx: FxTable): number | null {
  if (currency === BASE_CURRENCY) return amount;
  const rate = fx.byCurrency.get(currency)?.find((r) => r.effectiveFrom.getTime() <= day.getTime());
  return rate ? amount * rate.rateToBdt : null;
}

/* ───────────────────────────── CSV ───────────────────────────── */

/** RFC 4180-ish CSV/TSV parser (quoted fields, doubled quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['day', 'date', 'reporting starts', 'date start', 'date_start'],
  campaign: ['campaign', 'campaign name', 'campaign_name'],
  campaignId: ['campaign id', 'campaign_id', 'campaignid'],
  currency: ['currency', 'currency code', 'currency_code', 'account currency'],
  amount: ['cost', 'spend', 'amount spent', 'amount', 'amount spent (bdt)', 'amount spent (usd)'],
  impressions: ['impr.', 'impressions', 'impr'],
  clicks: ['clicks', 'link clicks'],
  accountId: ['customer id', 'account id', 'account_id'],
};

function headerIndex(header: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const norm = header.map((h) => h.trim().toLowerCase());
  const out: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    let i = norm.findIndex((h) => aliases.includes(h));
    // "Cost (USD)" / "Amount spent (USD)"
    if (i < 0 && key === 'amount') i = norm.findIndex((h) => /^(cost|spend|amount spent) \([a-z]{3}\)$/.test(h));
    if (i >= 0) out[key as keyof typeof HEADER_ALIASES] = i;
  }
  return out;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim().replace(/,/g, '');
  if (!s || s === '--' || s === '-') return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export interface SpendRowInput {
  date: Date;
  platform: SpendPlatform;
  campaignName: string;
  platformCampaignId: string | null;
  accountId: string | null;
  currency: string;
  amount: number;
  impressions: number | null;
  clicks: number | null;
}

export interface CsvParseResult {
  rows: SpendRowInput[];
  errors: { line: number; message: string }[];
  skipped: number;
  /** Currency found in the file header, e.g. "Cost (USD)". */
  detectedCurrency: string | null;
}

/**
 * Parse an ad-platform campaign report (Google Ads "Campaign" report by day,
 * Meta Ads Manager export, or a plain date,campaign,spend file). Report title
 * lines above the header and "Total" lines are skipped. The currency comes
 * from a currency column, the header ("Cost (USD)") or `fallbackCurrency` —
 * when none is available the import is rejected rather than guessed.
 */
export function parseSpendCsv(text: string, platform: SpendPlatform, fallbackCurrency: string | null): CsvParseResult {
  const table = parseCsv(text);
  const errors: CsvParseResult['errors'] = [];
  const headerAt = table.findIndex((r) => {
    const idx = headerIndex(r);
    return idx.date !== undefined && idx.amount !== undefined && (idx.campaign !== undefined || idx.campaignId !== undefined);
  });
  if (headerAt < 0) {
    throw new SpendInputError('No header row found. The file needs a date (Day/Date), a Campaign and a Cost/Spend column.');
  }
  const header = table[headerAt];
  const idx = headerIndex(header);
  const headerCurrency = (() => {
    const h = header[idx.amount!]?.trim() ?? '';
    const m = /\(([A-Za-z]{3})\)$/.exec(h);
    return m ? m[1].toUpperCase() : null;
  })();
  if (idx.currency === undefined && !headerCurrency && !fallbackCurrency) {
    throw new SpendInputError('The file has no currency column. Choose the currency the account is billed in.');
  }

  const rows: SpendRowInput[] = [];
  let skipped = 0;
  for (let r = headerAt + 1; r < table.length; r++) {
    const cells = table[r];
    const line = r + 1;
    const first = (cells[0] ?? '').trim().toLowerCase();
    if (first.startsWith('total')) {
      skipped++;
      continue;
    }
    const date = spendDay(cells[idx.date!] ?? '');
    const name = (idx.campaign !== undefined ? cells[idx.campaign] : '')?.trim() ?? '';
    const cid = (idx.campaignId !== undefined ? cells[idx.campaignId] : '')?.trim() ?? '';
    const amount = num(cells[idx.amount!]);
    const currency = currencyCode(idx.currency !== undefined ? cells[idx.currency] : '') ?? headerCurrency ?? fallbackCurrency;
    const impressions = idx.impressions !== undefined ? num(cells[idx.impressions]) : null;
    const clicks = idx.clicks !== undefined ? num(cells[idx.clicks]) : null;

    if (!date) {
      errors.push({ line, message: `Unreadable date “${(cells[idx.date!] ?? '').slice(0, 40)}”` });
      continue;
    }
    if (!name && !cid) {
      errors.push({ line, message: 'Missing campaign' });
      continue;
    }
    if (amount === null) {
      skipped++; // no spend that day
      continue;
    }
    if (Number.isNaN(amount) || amount < 0) {
      errors.push({ line, message: 'Spend must be a non-negative number' });
      continue;
    }
    if (!currency) {
      errors.push({ line, message: 'Unknown currency' });
      continue;
    }
    if ([impressions, clicks].some((v) => v !== null && (Number.isNaN(v) || v < 0))) {
      errors.push({ line, message: 'Impressions and clicks must be non-negative numbers' });
      continue;
    }
    if (cid && !/^[A-Za-z0-9_-]{1,64}$/.test(cid)) {
      errors.push({ line, message: 'Campaign ID may contain letters, digits, - and _ only' });
      continue;
    }
    rows.push({
      date,
      platform,
      campaignName: (name || cid).slice(0, 200),
      platformCampaignId: cid || null,
      accountId: (idx.accountId !== undefined ? cells[idx.accountId]?.trim().replace(/-/g, '') : '') || null,
      currency,
      amount: Math.round(amount * 100) / 100,
      impressions: impressions === null ? null : Math.round(impressions),
      clicks: clicks === null ? null : Math.round(clicks),
    });
  }
  return { rows, errors, skipped, detectedCurrency: headerCurrency };
}

/* ───────────────────────────── Upserts ───────────────────────────── */

export function spendExternalKey(r: Pick<SpendRowInput, 'platform' | 'accountId' | 'platformCampaignId' | 'campaignName' | 'date'>): string {
  const campaign = r.platformCampaignId ?? `name:${r.campaignName.trim().toLowerCase()}`;
  return `${r.platform}:${r.accountId ?? '-'}:${campaign}:${isoDay(r.date)}`;
}

/**
 * Find (or create) the MarketingCampaign for imported spend rows: by platform
 * campaign ID first, then by name / match keys. New ad-platform campaigns are
 * created so spend and UTM-tagged orders meet on one record.
 */
async function resolveCampaigns(rows: SpendRowInput[], createdBy: string | null): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let campaigns = await matchableCampaigns();
  const withPlatform = await prisma.marketingCampaign.findMany({
    where: { platform: { not: null }, platformCampaignId: { not: null } },
    select: { id: true, platform: true, platformCampaignId: true },
  });
  const byPlatformId = new Map(withPlatform.map((c) => [`${c.platform}:${c.platformCampaignId}`, c.id]));
  for (const r of rows) {
    const key = r.platformCampaignId ? `id:${r.platform}:${r.platformCampaignId}` : `name:${r.campaignName.toLowerCase()}`;
    if (out.has(key)) continue;
    let id = r.platformCampaignId ? byPlatformId.get(`${r.platform}:${r.platformCampaignId}`) : undefined;
    if (!id && !r.platformCampaignId) id = matchCampaign({ utmId: null, utmCampaign: r.campaignName }, campaigns) ?? undefined;
    if (!id) {
      const created = await prisma.marketingCampaign.create({
        data: {
          name: r.campaignName.slice(0, 120),
          channel: PLATFORM_CHANNEL[r.platform],
          platform: r.platform === 'other' ? null : r.platform,
          platformCampaignId: r.platform === 'other' ? null : r.platformCampaignId,
          platformAccountId: r.accountId,
          // Lets utm_campaign={{campaign.name}} links match too.
          matchKeys: JSON.stringify([r.campaignName.trim().toLowerCase()]),
          createdBy,
          notes: 'Created automatically from imported ad spend',
        },
      });
      id = created.id;
      if (r.platformCampaignId) byPlatformId.set(`${r.platform}:${r.platformCampaignId}`, id);
      campaigns = await matchableCampaigns();
    }
    out.set(key, id);
  }
  return out;
}

export interface UpsertResult {
  upserted: number;
  campaignsCreated: number;
  ordersRelinked: number;
}

export async function upsertSpendRows(
  rows: SpendRowInput[],
  opts: { source: 'csv' | 'meta_api'; runId: string; createdBy: string | null }
): Promise<UpsertResult> {
  const before = await prisma.marketingCampaign.count();
  const campaignFor = await resolveCampaigns(rows, opts.createdBy);
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const r of rows) {
    const campaignId = campaignFor.get(r.platformCampaignId ? `id:${r.platform}:${r.platformCampaignId}` : `name:${r.campaignName.toLowerCase()}`) ?? null;
    const data = {
      date: r.date,
      platform: r.platform,
      campaignId,
      platformCampaignId: r.platformCampaignId,
      campaignName: r.campaignName,
      accountId: r.accountId,
      currency: r.currency,
      amount: r.amount,
      impressions: r.impressions,
      clicks: r.clicks,
      source: opts.source,
      importRunId: opts.runId,
    };
    const externalKey = spendExternalKey(r);
    ops.push(prisma.adSpendEntry.upsert({ where: { externalKey }, update: data, create: { ...data, externalKey, createdBy: opts.createdBy } }));
  }
  for (let i = 0; i < ops.length; i += 200) await prisma.$transaction(ops.slice(i, i + 200));
  const campaignsCreated = (await prisma.marketingCampaign.count()) - before;
  const ordersRelinked = campaignsCreated > 0 ? await rematchAttributions() : 0;
  return { upserted: rows.length, campaignsCreated, ordersRelinked };
}

/* ───────────────────────────── Reading ───────────────────────────── */

export interface SpendFilter {
  from?: Date | null;
  to?: Date | null;
  campaignId?: string | null;
  platform?: string | null;
}

export function spendWhere(f: SpendFilter): Prisma.AdSpendEntryWhereInput {
  const date: Prisma.DateTimeFilter = {};
  // Spend rows are whole calendar days: include every store-local day the window touches.
  if (f.from) date.gte = storeDay(f.from);
  if (f.to) date.lte = storeDay(f.to);
  return {
    ...(f.from || f.to ? { date } : {}),
    ...(f.campaignId ? { campaignId: f.campaignId } : {}),
    ...(f.platform ? { platform: f.platform } : {}),
  };
}

export interface SpendTotals {
  /** Converted spend in BDT (rows without a rate excluded). */
  spendBdt: number;
  impressions: number;
  clicks: number;
  rows: number;
  /** Rows left out of spendBdt because no exchange rate covers their day. */
  unconvertedRows: number;
  unconverted: { currency: string; amount: number; rows: number }[];
}

export function emptyTotals(): SpendTotals {
  return { spendBdt: 0, impressions: 0, clicks: 0, rows: 0, unconvertedRows: 0, unconverted: [] };
}

export function addToTotals(t: SpendTotals, row: { amount: number; currency: string; date: Date; impressions: number | null; clicks: number | null }, fx: FxTable): number | null {
  const bdt = toBdt(row.amount, row.currency, row.date, fx);
  t.rows++;
  t.impressions += row.impressions ?? 0;
  t.clicks += row.clicks ?? 0;
  if (bdt === null) {
    t.unconvertedRows++;
    const u = t.unconverted.find((x) => x.currency === row.currency);
    if (u) {
      u.amount += row.amount;
      u.rows++;
    } else t.unconverted.push({ currency: row.currency, amount: row.amount, rows: 1 });
  } else t.spendBdt += bdt;
  return bdt;
}

/** Spend totals for a window (used by Reports and campaign performance). */
export async function spendTotals(f: SpendFilter): Promise<SpendTotals> {
  const [rows, fx] = await Promise.all([
    prisma.adSpendEntry.findMany({ where: spendWhere(f), select: { amount: true, currency: true, date: true, impressions: true, clicks: true } }),
    loadFxTable(),
  ]);
  const t = emptyTotals();
  for (const r of rows) addToTotals(t, r, fx);
  t.spendBdt = Math.round(t.spendBdt * 100) / 100;
  return t;
}
