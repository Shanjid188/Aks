import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { encryptionConfigured, secretStatuses } from '../lib/secrets.ts';
import {
  BASE_CURRENCY,
  SPEND_PLATFORMS,
  SpendInputError,
  addToTotals,
  currencyCode,
  emptyTotals,
  isoDay,
  loadFxTable,
  parseSpendCsv,
  spendDay,
  spendWhere,
  toBdt,
  upsertSpendRows,
  type SpendPlatform,
} from '../lib/adSpend.ts';
import {
  MAX_SYNC_DAYS,
  META_AD_ACCOUNT_SETTING,
  loadAdsSettings,
  metaAdsConfig,
  resolvedMetaAdAccount,
  syncMetaAds,
  validMetaAccountId,
} from '../lib/metaAds.ts';
import { ga4DataStatus } from '../lib/ga4Data.ts';

/**
 * Admin → Advertising → Ad Spend, Exchange Rates and Integrations.
 * Spend is stored in the billed currency and converted to BDT when read.
 */
const router = Router();

const MAX_CSV_BYTES = 5 * 1024 * 1024;

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inputError(res: import('express').Response, err: unknown) {
  if (err instanceof SpendInputError) return res.status(400).json({ error: err.message });
  throw err;
}

function nonNegInt(v: unknown, field: string): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new SpendInputError(`${field} must be a whole number ≥ 0`);
  return n;
}

/* ───────────────────────────── Spend ───────────────────────────── */

router.get(
  '/admin/advertising/spend',
  requirePermission(PERM.ADVERTISING_SPEND_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const platform = q.platform && (SPEND_PLATFORMS as readonly string[]).includes(q.platform) ? q.platform : null;
    const where = spendWhere({ from: parseDate(q.from), to: parseDate(q.to), campaignId: q.campaignId || null, platform });
    const [entries, fx, count] = await Promise.all([
      prisma.adSpendEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { campaignName: 'asc' }],
        take: 1000,
        include: { campaign: { select: { id: true, name: true } } },
      }),
      loadFxTable(),
      prisma.adSpendEntry.count({ where }),
    ]);
    // Totals cover every matching row, not just the listed page.
    const totals = emptyTotals();
    const all = count > entries.length
      ? await prisma.adSpendEntry.findMany({ where, select: { amount: true, currency: true, date: true, impressions: true, clicks: true } })
      : entries;
    for (const r of all) addToTotals(totals, r, fx);
    totals.spendBdt = Math.round(totals.spendBdt * 100) / 100;
    res.json({
      entries: entries.map((e) => ({ ...e, date: isoDay(e.date), amountBdt: toBdt(e.amount, e.currency, e.date, fx) })),
      totalCount: count,
      totals,
      baseCurrency: BASE_CURRENCY,
    });
  })
);

/** Manual entry for a campaign (e.g. a boosted post, an influencer fee). */
router.post(
  '/admin/advertising/spend',
  requirePermission(PERM.ADVERTISING_SPEND_MANAGE),
  asyncHandler(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    try {
      const campaign = typeof b.campaignId === 'string' ? await prisma.marketingCampaign.findUnique({ where: { id: b.campaignId } }) : null;
      if (!campaign) throw new SpendInputError('Choose a campaign');
      const date = spendDay(b.date);
      if (!date) throw new SpendInputError('Date must be YYYY-MM-DD');
      const currency = currencyCode(b.currency);
      if (!currency) throw new SpendInputError('Currency must be a 3-letter code such as BDT or USD');
      const amount = Number(b.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e10) throw new SpendInputError('Amount must be a number ≥ 0');
      const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 500) : null;
      const entry = await prisma.adSpendEntry.create({
        data: {
          date,
          platform: (campaign.platform as SpendPlatform | null) ?? 'other',
          campaignId: campaign.id,
          platformCampaignId: campaign.platformCampaignId,
          campaignName: campaign.name,
          currency,
          amount: Math.round(amount * 100) / 100,
          impressions: nonNegInt(b.impressions, 'Impressions'),
          clicks: nonNegInt(b.clicks, 'Clicks'),
          source: 'manual',
          note,
          createdBy: currentAdmin(req)?.email ?? null,
        },
      });
      await logAudit({
        admin: currentAdmin(req),
        action: 'ad_spend.created',
        entity: 'ad_spend',
        entityId: entry.id,
        details: `${campaign.name} ${isoDay(date)}: ${currency} ${entry.amount}`,
      });
      res.status(201).json({ entry: { ...entry, date: isoDay(entry.date) } });
    } catch (err) {
      return inputError(res, err);
    }
  })
);

router.delete(
  '/admin/advertising/spend/:id',
  requirePermission(PERM.ADVERTISING_SPEND_MANAGE),
  asyncHandler(async (req, res) => {
    const entry = await prisma.adSpendEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    await prisma.adSpendEntry.delete({ where: { id: entry.id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'ad_spend.deleted',
      entity: 'ad_spend',
      entityId: entry.id,
      details: `${entry.campaignName} ${isoDay(entry.date)}: ${entry.currency} ${entry.amount} (${entry.source})`,
    });
    res.json({ ok: true });
  })
);

/**
 * CSV import (Google Ads first; Meta/TikTok exports work too). `dryRun`
 * returns the parsed rows and errors without saving, for the preview step.
 * Re-importing the same days replaces those rows instead of duplicating them.
 */
router.post(
  '/admin/advertising/spend/import',
  requirePermission(PERM.ADVERTISING_SPEND_MANAGE),
  asyncHandler(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const csv = typeof b.csv === 'string' ? b.csv : '';
    if (!csv.trim()) return res.status(400).json({ error: 'Choose a CSV file' });
    if (Buffer.byteLength(csv) > MAX_CSV_BYTES) return res.status(413).json({ error: 'The file is larger than 5 MB' });
    const platform = (SPEND_PLATFORMS as readonly string[]).includes(String(b.platform)) ? (b.platform as SpendPlatform) : null;
    if (!platform) return res.status(400).json({ error: 'Choose the ad platform' });
    const fallbackCurrency = b.currency == null || b.currency === '' ? null : currencyCode(b.currency);
    if (b.currency && !fallbackCurrency) return res.status(400).json({ error: 'Currency must be a 3-letter code' });

    let parsed;
    try {
      parsed = parseSpendCsv(csv, platform, fallbackCurrency);
    } catch (err) {
      return inputError(res, err);
    }
    const fx = await loadFxTable();
    const missingFx = [...new Set(parsed.rows.filter((r) => toBdt(r.amount, r.currency, r.date, fx) === null).map((r) => r.currency))];
    const preview = {
      rows: parsed.rows.length,
      skipped: parsed.skipped,
      errors: parsed.errors.slice(0, 50),
      errorCount: parsed.errors.length,
      detectedCurrency: parsed.detectedCurrency,
      currencies: [...new Set(parsed.rows.map((r) => r.currency))],
      missingFx,
      dateFrom: parsed.rows.length ? isoDay(new Date(Math.min(...parsed.rows.map((r) => r.date.getTime())))) : null,
      dateTo: parsed.rows.length ? isoDay(new Date(Math.max(...parsed.rows.map((r) => r.date.getTime())))) : null,
      campaigns: [...new Set(parsed.rows.map((r) => r.campaignName))].length,
      totalByCurrency: Object.entries(
        parsed.rows.reduce<Record<string, number>>((acc, r) => ((acc[r.currency] = (acc[r.currency] ?? 0) + r.amount), acc), {})
      ).map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 })),
      sample: parsed.rows.slice(0, 10).map((r) => ({ ...r, date: isoDay(r.date) })),
    };
    if (b.dryRun !== false) return res.json({ preview });
    if (parsed.rows.length === 0) return res.status(400).json({ error: 'No spend rows to import', preview });

    const by = currentAdmin(req)?.email ?? null;
    const run = await prisma.integrationSyncRun.create({
      data: { integration: 'csv_import', status: 'running', trigger: 'manual', triggeredBy: by, rangeFrom: spendDay(preview.dateFrom ?? ''), rangeTo: spendDay(preview.dateTo ?? '') },
    });
    const result = await upsertSpendRows(parsed.rows, { source: 'csv', runId: run.id, createdBy: by });
    const message = `${platform} CSV: ${result.upserted} row(s), ${parsed.errors.length} error(s), ${result.campaignsCreated} campaign(s) added`;
    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: parsed.errors.length ? 'partial' : 'success',
        rowsUpserted: result.upserted,
        rowsSkipped: parsed.skipped + parsed.errors.length,
        message,
        finishedAt: new Date(),
      },
    });
    await logAudit({ admin: currentAdmin(req), action: 'ad_spend.imported', entity: 'ad_spend', entityId: run.id, details: message });
    res.json({ preview, result });
  })
);

/* ───────────────────────────── Exchange rates ───────────────────────────── */

router.get(
  '/admin/advertising/fx-rates',
  requirePermission(PERM.ADVERTISING_SPEND_VIEW),
  asyncHandler(async (_req, res) => {
    const [rates, used] = await Promise.all([
      prisma.fxRate.findMany({ orderBy: [{ currency: 'asc' }, { effectiveFrom: 'desc' }] }),
      prisma.adSpendEntry.groupBy({ by: ['currency'], where: { currency: { not: BASE_CURRENCY } }, _min: { date: true } }),
    ]);
    res.json({
      baseCurrency: BASE_CURRENCY,
      rates: rates.map((r) => ({ ...r, effectiveFrom: isoDay(r.effectiveFrom) })),
      // Currencies present in spend, with the earliest day a rate is needed for.
      spendCurrencies: used.map((u) => ({ currency: u.currency, firstSpendDate: u._min.date ? isoDay(u._min.date) : null })),
    });
  })
);

router.post(
  '/admin/advertising/fx-rates',
  requirePermission(PERM.ADVERTISING_SPEND_MANAGE),
  asyncHandler(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const currency = currencyCode(b.currency);
    if (!currency || currency === BASE_CURRENCY) return res.status(400).json({ error: `Currency must be a 3-letter code other than ${BASE_CURRENCY}` });
    const rate = Number(b.rateToBdt);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1e6) return res.status(400).json({ error: 'Rate must be a positive number (BDT per 1 unit)' });
    const effectiveFrom = spendDay(b.effectiveFrom);
    if (!effectiveFrom) return res.status(400).json({ error: 'Effective date must be YYYY-MM-DD' });
    const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 200) : null;
    const existing = await prisma.fxRate.findUnique({ where: { currency_effectiveFrom: { currency, effectiveFrom } } });
    const saved = await prisma.fxRate.upsert({
      where: { currency_effectiveFrom: { currency, effectiveFrom } },
      update: { rateToBdt: rate, note },
      create: { currency, rateToBdt: rate, effectiveFrom, note, createdBy: currentAdmin(req)?.email ?? null },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: existing ? 'fx_rate.updated' : 'fx_rate.created',
      entity: 'fx_rate',
      entityId: saved.id,
      details: `1 ${currency} = ${rate} ${BASE_CURRENCY} from ${isoDay(effectiveFrom)}${existing ? ` (was ${existing.rateToBdt})` : ''}`,
    });
    res.status(existing ? 200 : 201).json({ rate: { ...saved, effectiveFrom: isoDay(saved.effectiveFrom) } });
  })
);

router.delete(
  '/admin/advertising/fx-rates/:id',
  requirePermission(PERM.ADVERTISING_SPEND_MANAGE),
  asyncHandler(async (req, res) => {
    const rate = await prisma.fxRate.findUnique({ where: { id: req.params.id } });
    if (!rate) return res.status(404).json({ error: 'Rate not found' });
    await prisma.fxRate.delete({ where: { id: rate.id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'fx_rate.deleted',
      entity: 'fx_rate',
      entityId: rate.id,
      details: `1 ${rate.currency} = ${rate.rateToBdt} ${BASE_CURRENCY} from ${isoDay(rate.effectiveFrom)}`,
    });
    res.json({ ok: true });
  })
);

/* ───────────────────────────── Integrations ───────────────────────────── */

async function integrationsView() {
  const account = resolvedMetaAdAccount();
  const runs = await prisma.integrationSyncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  return {
    metaAds: {
      accountId: account.value,
      accountSource: account.source,
      connected: metaAdsConfig() !== null,
      maxSyncDays: MAX_SYNC_DAYS,
    },
    ga4: ga4DataStatus(),
    secrets: secretStatuses('integrations'),
    encryptionConfigured: encryptionConfigured(),
    runs,
  };
}

router.get(
  '/admin/advertising/integrations',
  requirePermission(PERM.ADVERTISING_INTEGRATIONS_MANAGE),
  asyncHandler(async (_req, res) => {
    res.json(await integrationsView());
  })
);

router.put(
  '/admin/advertising/integrations/meta-ads',
  requirePermission(PERM.ADVERTISING_INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const raw = typeof req.body?.accountId === 'string' ? req.body.accountId.trim() : '';
    if (raw && !validMetaAccountId(raw)) return res.status(400).json({ error: 'Ad account ID looks like act_1234567890 or 1234567890' });
    const value = raw.replace(/^act_/, '');
    await prisma.storeSetting.upsert({
      where: { key: META_AD_ACCOUNT_SETTING },
      update: { value: JSON.stringify(value) },
      create: { key: META_AD_ACCOUNT_SETTING, value: JSON.stringify(value) },
    });
    await loadAdsSettings();
    await logAudit({
      admin: currentAdmin(req),
      action: 'integration.updated',
      entity: 'integration',
      entityId: 'meta_ads',
      details: `Meta ad account → ${value || '(cleared)'}`,
    });
    res.json(await integrationsView());
  })
);

router.post(
  '/admin/advertising/integrations/meta-ads/sync',
  requirePermission(PERM.ADVERTISING_INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const from = spendDay(req.body?.from);
    const to = spendDay(req.body?.to);
    if (!from || !to) return res.status(400).json({ error: 'Choose a start and end date' });
    let outcome;
    try {
      outcome = await syncMetaAds({ from, to, trigger: 'manual', by: currentAdmin(req)?.email ?? null });
    } catch (err) {
      return inputError(res, err);
    }
    await logAudit({
      admin: currentAdmin(req),
      action: 'integration.synced',
      entity: 'integration',
      entityId: 'meta_ads',
      details: `${outcome.status}: ${outcome.message}`,
    });
    res.status(outcome.status === 'success' ? 200 : 502).json({ outcome, ...(await integrationsView()) });
  })
);

export default router;
