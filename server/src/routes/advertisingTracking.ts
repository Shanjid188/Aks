import crypto from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, hasPermission, requireAuth, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import {
  SECRET_DEFS,
  SecretError,
  clearSecret,
  encryptionConfigured,
  secretStatuses,
  setSecret,
} from '../lib/secrets.ts';
import {
  ga4Config,
  ga4SwitchOn,
  loadTrackingSettings,
  metaConfig,
  metaSwitchOn,
  publicTrackingIds,
  resolvedGa4MeasurementId,
  resolvedMetaPixelId,
  resolvedMetaTestEventCode,
} from '../lib/tracking/config.ts';
import { sendMetaEvent } from '../lib/tracking/send.ts';
import { isRetryable, retryFailedTracking } from '../lib/tracking/orders.ts';
import { sha256 } from '../lib/tracking/userData.ts';

/**
 * Admin → Advertising → Tracking Settings, plus the encrypted secret store
 * shared with Integrations. Public IDs and switches are StoreSetting rows;
 * secrets are write-only and never appear in any response or audit entry.
 */
const router = Router();

/** Public: the tracker IDs the storefront may load (empty when off). */
router.get('/tracking/config', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  // The switches let the storefront drop build-time fallback IDs too.
  res.json({ ...publicTrackingIds(), metaEnabled: metaSwitchOn(), ga4Enabled: ga4SwitchOn() });
});

function trackingView() {
  const pixel = resolvedMetaPixelId();
  const ga = resolvedGa4MeasurementId();
  const test = resolvedMetaTestEventCode();
  return {
    meta: {
      enabled: metaSwitchOn(),
      pixelId: pixel.value || null,
      pixelIdSource: pixel.source,
      testEventCode: test.value || null,
      testEventCodeSource: test.source,
      graphApiVersion: (process.env.META_GRAPH_API_VERSION ?? '').trim() || 'v26.0',
      /** Browser Pixel loads for consenting shoppers. */
      pixelActive: publicTrackingIds().metaPixelId !== null,
      /** Server-side Conversions API is sending. */
      capiActive: metaConfig() !== null,
    },
    ga4: {
      enabled: ga4SwitchOn(),
      measurementId: ga.value || null,
      measurementIdSource: ga.source,
      tagActive: publicTrackingIds().ga4MeasurementId !== null,
      /** Server-side refunds via Measurement Protocol. */
      refundsActive: ga4Config() !== null,
    },
    secrets: secretStatuses(),
    encryptionConfigured: encryptionConfigured(),
  };
}

router.get(
  '/admin/advertising/tracking',
  requirePermission(PERM.ADVERTISING_TRACKING_VIEW),
  asyncHandler(async (_req, res) => {
    res.json(trackingView());
  })
);

const PIXEL_RE = /^\d{5,20}$/;
const GA4_RE = /^G-[A-Z0-9]{4,20}$/;
const TEST_CODE_RE = /^[A-Za-z0-9_-]{1,40}$/;

router.put(
  '/admin/advertising/tracking',
  requirePermission(PERM.ADVERTISING_TRACKING_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: [string, unknown][] = [];
    const changes: string[] = [];
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const text = (k: string) => (body[k] == null ? '' : String(body[k]).trim());

    if (has('metaPixelId')) {
      const v = text('metaPixelId');
      if (v && !PIXEL_RE.test(v)) return res.status(400).json({ error: 'Meta Pixel / dataset ID must be 5–20 digits' });
      updates.push(['trackingMetaPixelId', v]);
      changes.push(`Meta Pixel ID → ${v || '(cleared)'}`);
    }
    if (has('ga4MeasurementId')) {
      const v = text('ga4MeasurementId').toUpperCase();
      if (v && !GA4_RE.test(v)) return res.status(400).json({ error: 'GA4 measurement ID looks like G-XXXXXXXXXX' });
      updates.push(['trackingGa4MeasurementId', v]);
      changes.push(`GA4 measurement ID → ${v || '(cleared)'}`);
    }
    if (has('metaTestEventCode')) {
      const v = text('metaTestEventCode');
      if (v && !TEST_CODE_RE.test(v)) return res.status(400).json({ error: 'Test event code may contain letters, digits, - and _ only' });
      updates.push(['trackingMetaTestEventCode', v]);
      changes.push(`Meta test event code → ${v || '(cleared)'}`);
    }
    for (const [k, key, label] of [
      ['metaEnabled', 'trackingMetaEnabled', 'Meta tracking'],
      ['ga4Enabled', 'trackingGa4Enabled', 'GA4 tracking'],
    ] as const) {
      if (!has(k)) continue;
      if (typeof body[k] !== 'boolean') return res.status(400).json({ error: `${k} must be true or false` });
      updates.push([key, body[k]]);
      changes.push(`${label} ${body[k] ? 'enabled' : 'disabled'}`);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    await prisma.$transaction(
      updates.map(([key, value]) =>
        prisma.storeSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        })
      )
    );
    await loadTrackingSettings();
    await logAudit({
      admin: currentAdmin(req),
      action: 'tracking.settings_updated',
      entity: 'tracking',
      details: changes.join('; '),
    });
    res.json(trackingView());
  })
);

/* ───────────────────────────── Secrets ───────────────────────────── */

/** Tracking secrets need tracking_manage; integration credentials need integrations_manage. */
async function canManageSecret(req: Parameters<typeof hasPermission>[0], key: string): Promise<boolean> {
  const def = SECRET_DEFS.find((d) => d.key === key);
  if (!def) return false;
  return hasPermission(
    req,
    def.group === 'tracking' ? PERM.ADVERTISING_TRACKING_MANAGE : PERM.ADVERTISING_INTEGRATIONS_MANAGE
  );
}

function sendSecretError(res: import('express').Response, err: unknown) {
  if (err instanceof SecretError) return res.status(err.status).json({ error: err.message });
  throw err;
}

router.put(
  '/admin/advertising/secrets/:key',
  requireAuth,
  asyncHandler(async (req, res) => {
    const key = req.params.key;
    if (!SECRET_DEFS.some((d) => d.key === key)) return res.status(404).json({ error: 'Unknown secret' });
    if (!(await canManageSecret(req, key))) {
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    }
    const value = typeof req.body?.value === 'string' ? req.body.value : '';
    try {
      await setSecret(key, value, currentAdmin(req)?.email ?? null);
    } catch (err) {
      return sendSecretError(res, err);
    }
    // Never log the value — only which secret changed.
    await logAudit({ admin: currentAdmin(req), action: 'secret.updated', entity: 'integration_secret', entityId: key, details: `${key} set` });
    res.json({ secrets: secretStatuses() });
  })
);

router.delete(
  '/admin/advertising/secrets/:key',
  requireAuth,
  asyncHandler(async (req, res) => {
    const key = req.params.key;
    if (!SECRET_DEFS.some((d) => d.key === key)) return res.status(404).json({ error: 'Unknown secret' });
    if (!(await canManageSecret(req, key))) {
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    }
    try {
      await clearSecret(key);
    } catch (err) {
      return sendSecretError(res, err);
    }
    await logAudit({ admin: currentAdmin(req), action: 'secret.cleared', entity: 'integration_secret', entityId: key, details: `${key} cleared` });
    res.json({ secrets: secretStatuses() });
  })
);

/* ───────────────────────────── Health ───────────────────────────── */

const HOUR = 3600 * 1000;

router.get(
  '/admin/advertising/tracking/health',
  requirePermission(PERM.ADVERTISING_TRACKING_VIEW),
  asyncHandler(async (_req, res) => {
    const since7d = new Date(Date.now() - 7 * 24 * HOUR);
    const since24h = new Date(Date.now() - 24 * HOUR);
    const channels = ['meta_capi', 'ga4_mp'] as const;

    const [counts7d, counts24h, lastSent, failures, browserPurchases] = await Promise.all([
      prisma.trackingEvent.groupBy({ by: ['channel', 'status'], where: { createdAt: { gte: since7d }, channel: { in: [...channels] } }, _count: { _all: true } }),
      prisma.trackingEvent.groupBy({ by: ['channel', 'status'], where: { createdAt: { gte: since24h }, channel: { in: [...channels] } }, _count: { _all: true } }),
      Promise.all(
        channels.map((channel) =>
          prisma.trackingEvent.findFirst({ where: { channel, status: 'sent' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true, eventName: true } })
        )
      ),
      prisma.trackingEvent.findMany({
        where: { status: 'failed' },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        select: { id: true, channel: true, eventName: true, orderId: true, attempts: true, lastError: true, createdAt: true, updatedAt: true },
      }),
      prisma.trackingEvent.count({ where: { channel: 'ga4_browser', createdAt: { gte: since7d } } }),
    ]);

    const tally = (rows: typeof counts7d, channel: string) => {
      const out = { sent: 0, failed: 0, pending: 0 };
      for (const r of rows) if (r.channel === channel && r.status in out) out[r.status as keyof typeof out] = r._count._all;
      return out;
    };

    res.json({
      channels: channels.map((channel, i) => ({
        channel,
        last7d: tally(counts7d, channel),
        last24h: tally(counts24h, channel),
        lastSentAt: lastSent[i]?.updatedAt ?? null,
        lastSentEvent: lastSent[i]?.eventName ?? null,
      })),
      browserPurchasesReported7d: browserPurchases,
      failures: failures.map((f) => ({ ...f, retryable: isRetryable(f) })),
    });
  })
);

router.post(
  '/admin/advertising/tracking/retry',
  requirePermission(PERM.ADVERTISING_TRACKING_MANAGE),
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 200) : undefined;
    const result = await retryFailedTracking(ids);
    await logAudit({
      admin: currentAdmin(req),
      action: 'tracking.retry',
      entity: 'tracking',
      details: `retry: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
    });
    res.json(result);
  })
);

/**
 * Send one Conversions API test event. Requires a test event code so it shows
 * up only under Events Manager → Test events, never in reporting.
 */
router.post(
  '/admin/advertising/tracking/test-event',
  requirePermission(PERM.ADVERTISING_TRACKING_MANAGE),
  asyncHandler(async (req, res) => {
    const cfg = metaConfig();
    if (!cfg) return res.status(400).json({ error: 'Conversions API is not active: set the Pixel ID and access token, and enable Meta.' });
    if (!cfg.testEventCode) return res.status(400).json({ error: 'Set a test event code first (Events Manager → Test events).' });
    const result = await sendMetaEvent({
      event_name: 'PageView',
      event_id: `admintest_${crypto.randomUUID()}`,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      // Synthetic, non-personal identifiers so Meta accepts the test event.
      user_data: { external_id: [sha256('aks-admin-test-event')], client_user_agent: 'AKS Admin test event' },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: 'tracking.test_event',
      entity: 'tracking',
      details: result?.ok ? 'Meta test event accepted' : `Meta test event failed: ${result && !result.ok ? result.error : 'not configured'}`,
    });
    if (!result || !result.ok) return res.status(502).json({ ok: false, error: result && !result.ok ? result.error : 'Not configured' });
    res.json({ ok: true, testEventCode: cfg.testEventCode });
  })
);

export default router;
