// Meta Marketing API → daily campaign spend (Insights). Read-only: needs a
// token with `ads_read` for the ad account. The token comes from the encrypted
// secret store (META_ADS_ACCESS_TOKEN, env first) and is sent as an
// Authorization header — never in a URL, a log line or a response.
import { prisma } from './prisma.ts';
import { getSecret } from './secrets.ts';
import { SpendInputError, currencyCode, isoDay, spendDay, storeDay, upsertSpendRows, type SpendRowInput } from './adSpend.ts';

export const META_AD_ACCOUNT_SETTING = 'adsMetaAccountId';
const ACCOUNT_RE = /^(act_)?\d{5,25}$/;
export const MAX_SYNC_DAYS = 90;

let accountSetting: string | null = null;

export async function loadAdsSettings(): Promise<void> {
  const row = await prisma.storeSetting.findUnique({ where: { key: META_AD_ACCOUNT_SETTING } });
  try {
    accountSetting = row ? (JSON.parse(row.value) as string) || null : null;
  } catch {
    accountSetting = row?.value || null;
  }
}

export function validMetaAccountId(v: string): boolean {
  return ACCOUNT_RE.test(v);
}

/** Ad account ID without the act_ prefix; env first. */
export function resolvedMetaAdAccount(): { value: string | null; source: 'env' | 'admin' | null } {
  const env = (process.env.META_AD_ACCOUNT_ID ?? '').trim();
  if (env) return { value: env.replace(/^act_/, ''), source: 'env' };
  return accountSetting ? { value: accountSetting.replace(/^act_/, ''), source: 'admin' } : { value: null, source: null };
}

export function metaAdsConfig() {
  const token = getSecret('META_ADS_ACCESS_TOKEN');
  const account = resolvedMetaAdAccount().value;
  if (!token || !account) return null;
  return {
    token,
    account,
    base: ((process.env.META_GRAPH_API_BASE ?? '').trim() || 'https://graph.facebook.com').replace(/\/+$/, ''),
    version: (process.env.META_GRAPH_API_VERSION ?? '').trim() || 'v26.0',
  };
}

interface InsightRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  account_currency?: string;
  date_start?: string;
}

class MetaApiError extends Error {}

async function getJson(url: string, token: string): Promise<{ data?: InsightRow[]; paging?: { next?: string }; error?: { message?: string; code?: number } }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
  if (!res.ok || body.error) {
    // Meta error messages describe the problem without echoing the token.
    const msg = (body.error?.message ?? `HTTP ${res.status}`).replace(/access_token=[^&\s]+/g, 'access_token=***').slice(0, 300);
    throw new MetaApiError(`Meta API: ${msg}`);
  }
  return body as never;
}

/** Fetch daily campaign insights for [from, to] (store-local calendar days). */
async function fetchInsights(cfg: NonNullable<ReturnType<typeof metaAdsConfig>>, from: Date, to: Date): Promise<SpendRowInput[]> {
  const params = new URLSearchParams({
    level: 'campaign',
    time_increment: '1',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,account_currency,date_start',
    time_range: JSON.stringify({ since: isoDay(from), until: isoDay(to) }),
    limit: '500',
  });
  let url: string | undefined = `${cfg.base}/${cfg.version}/act_${cfg.account}/insights?${params}`;
  const rows: SpendRowInput[] = [];
  let pages = 0;
  while (url && pages++ < 200) {
    const body = await getJson(url, cfg.token);
    for (const r of body.data ?? []) {
      const date = spendDay(r.date_start ?? '');
      const currency = currencyCode(r.account_currency);
      const amount = Number(r.spend);
      if (!date || !currency || !r.campaign_id || !/^[A-Za-z0-9_-]{1,64}$/.test(r.campaign_id) || !Number.isFinite(amount) || amount < 0) continue;
      const int = (v?: string) => (v != null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
      rows.push({
        date,
        platform: 'meta',
        campaignName: (r.campaign_name || r.campaign_id).slice(0, 200),
        platformCampaignId: r.campaign_id,
        accountId: cfg.account,
        currency,
        amount: Math.round(amount * 100) / 100,
        impressions: int(r.impressions),
        clicks: int(r.clicks),
      });
    }
    // Only follow pagination on the same Graph host.
    const next = body.paging?.next;
    url = next && next.startsWith(cfg.base) ? next : undefined;
  }
  return rows;
}

export interface SyncOutcome {
  runId: string;
  status: 'success' | 'failed';
  rowsUpserted: number;
  campaignsCreated: number;
  message: string;
}

/**
 * Sync Meta spend for a range of calendar days (UTC-midnight dates from
 * spendDay/storeDay). Every run is recorded in IntegrationSyncRun.
 */
export async function syncMetaAds(opts: { from: Date; to: Date; trigger: 'manual' | 'schedule'; by: string | null }): Promise<SyncOutcome> {
  const cfg = metaAdsConfig();
  if (!cfg) throw new SpendInputError('Meta Ads is not connected: add the ad account ID and an access token with ads_read.');
  const { from, to } = opts;
  if (from > to) throw new SpendInputError('The start date is after the end date');
  if ((to.getTime() - from.getTime()) / 86_400_000 + 1 > MAX_SYNC_DAYS) throw new SpendInputError(`Sync at most ${MAX_SYNC_DAYS} days at a time`);

  const run = await prisma.integrationSyncRun.create({
    data: { integration: 'meta_ads', status: 'running', trigger: opts.trigger, rangeFrom: from, rangeTo: to, triggeredBy: opts.by },
  });
  try {
    const rows = await fetchInsights(cfg, from, to);
    const res = await upsertSpendRows(rows, { source: 'meta_api', runId: run.id, createdBy: opts.by });
    const message = `${res.upserted} day row(s) from ${isoDay(from)} to ${isoDay(to)}; ${res.campaignsCreated} campaign(s) added`;
    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: { status: 'success', rowsUpserted: res.upserted, message, finishedAt: new Date() },
    });
    return { runId: run.id, status: 'success', rowsUpserted: res.upserted, campaignsCreated: res.campaignsCreated, message };
  } catch (e) {
    const message = e instanceof MetaApiError ? e.message : `Sync failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown error'}`;
    await prisma.integrationSyncRun.update({ where: { id: run.id }, data: { status: 'failed', message, finishedAt: new Date() } });
    return { runId: run.id, status: 'failed', rowsUpserted: 0, campaignsCreated: 0, message };
  }
}

/** Scheduled job: refresh the last 3 days (Meta revises recent spend). */
export async function scheduledMetaSync(): Promise<string> {
  if (!metaAdsConfig()) return 'skipped: not connected';
  const to = storeDay(new Date());
  const from = new Date(to.getTime() - 2 * 86_400_000);
  const r = await syncMetaAds({ from, to, trigger: 'schedule', by: null });
  return `${r.status}: ${r.message}`;
}
