// Courier booking routes: admin configuration (Settings → Courier), booking +
// status refresh from the Shipped page, and the public courier webhook.
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, hasPermission, requireAuth, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { encryptionConfigured, secretStatuses } from '../lib/secrets.ts';
import { orderToApi } from './orders.ts';
import {
  bookOrder,
  CourierError,
  CourierRequestError,
  courierState,
  getProvider,
  handleCourierWebhook,
  PROVIDERS,
  syncCourierStatuses,
  syncOneOrder,
} from '../lib/courier/index.ts';

const router = Router();

export const COURIER_SYNC_JOB = 'courier-status-sync';

function sendCourierError(res: Response, err: unknown) {
  if (err instanceof CourierRequestError) return res.status(err.status).json({ error: err.message, code: err.code });
  throw err;
}

/** Booking is the courier step of the Shipped page: shipping.update, or packaging.pack (who could hand off before). */
async function canBook(req: Request): Promise<boolean> {
  return (await hasPermission(req, PERM.SHIPPING_UPDATE)) || (await hasPermission(req, PERM.PACKAGING_PACK));
}

/** Lightweight state for the Shipped page: does গাড়ি book with a courier or hand off manually? */
router.get(
  '/admin/courier/status',
  requirePermission(PERM.ORDERS_VIEW),
  asyncHandler(async (_req, res) => {
    const s = await courierState();
    res.json({ active: s.active, enabled: s.enabled, configured: s.configured, provider: { id: s.provider.id, label: s.provider.label } });
  })
);

async function configView() {
  const s = await courierState();
  const lastSync = await prisma.jobLock.findUnique({ where: { name: COURIER_SYNC_JOB }, select: { lastRunAt: true, lastResult: true } });
  const bookedInTransit = await prisma.order.count({
    where: { courierConsignmentId: { not: null }, status: { in: ['shipped', 'out_for_delivery'] } },
  });
  return {
    enabled: s.enabled,
    provider: s.providerId,
    configured: s.configured,
    active: s.active,
    providers: Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, credentialKeys: p.credentialKeys })),
    encryptionConfigured: encryptionConfigured(),
    secrets: secretStatuses('courier'),
    webhookPath: `/api/webhooks/courier/${s.providerId}`,
    lastSync: lastSync ? { at: lastSync.lastRunAt, result: lastSync.lastResult } : null,
    bookedInTransit,
  };
}

router.get(
  '/admin/courier/config',
  requirePermission(PERM.SETTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    res.json(await configView());
  })
);

router.put(
  '/admin/courier/config',
  requirePermission(PERM.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as { enabled?: unknown; provider?: unknown };
    const changes: string[] = [];
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
      await prisma.storeSetting.upsert({
        where: { key: 'courierEnabled' },
        update: { value: JSON.stringify(body.enabled) },
        create: { key: 'courierEnabled', value: JSON.stringify(body.enabled) },
      });
      changes.push(`booking ${body.enabled ? 'enabled' : 'disabled'}`);
    }
    if (body.provider !== undefined) {
      if (typeof body.provider !== 'string' || !getProvider(body.provider)) return res.status(400).json({ error: 'Unknown courier provider' });
      await prisma.storeSetting.upsert({
        where: { key: 'courierProvider' },
        update: { value: JSON.stringify(body.provider) },
        create: { key: 'courierProvider', value: JSON.stringify(body.provider) },
      });
      changes.push(`provider → ${body.provider}`);
    }
    if (changes.length) {
      await logAudit({ admin: currentAdmin(req), action: 'courier.config.updated', entity: 'settings', details: changes.join(', ') });
    }
    res.json(await configView());
  })
);

/** Verify the credentials with a harmless read (account balance). Never books anything. */
router.post(
  '/admin/courier/test',
  requirePermission(PERM.SETTINGS_MANAGE),
  asyncHandler(async (_req, res) => {
    const s = await courierState();
    if (!s.configured) return res.status(409).json({ ok: false, error: `${s.provider.label} API credentials are not set` });
    try {
      const balance = await s.provider.getBalance();
      res.json({ ok: true, provider: s.provider.label, balance });
    } catch (e) {
      // Never 401 here: the admin client treats 401 as "your session expired" and logs out.
      const status = e instanceof CourierError && e.kind === 'auth' ? 400 : 502;
      res.status(status).json({ ok: false, error: e instanceof Error ? e.message : 'Connection test failed' });
    }
  })
);

/** Run the status sync now instead of waiting for the scheduled job. */
router.post(
  '/admin/courier/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await hasPermission(req, PERM.SETTINGS_MANAGE)) && !(await canBook(req))) {
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    }
    const result = await syncCourierStatuses();
    await logAudit({ admin: currentAdmin(req), action: 'courier.sync', entity: 'order', details: `manual sync: ${result}` });
    res.json({ result });
  })
);

/** গাড়ি: send the order to the configured courier and store the consignment. */
router.post(
  '/admin/orders/:id/courier/book',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await canBook(req))) return res.status(403).json({ error: "You don't have permission to perform this action" });
    try {
      const { order, outcome } = await bookOrder(req.params.id, currentAdmin(req));
      res.json({ order: orderToApi(order), outcome });
    } catch (err) {
      return sendCourierError(res, err);
    }
  })
);

/** Refresh one booked order's courier status now. */
router.post(
  '/admin/orders/:id/courier/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await canBook(req))) return res.status(403).json({ error: "You don't have permission to perform this action" });
    try {
      const { order, result } = await syncOneOrder(req.params.id, currentAdmin(req));
      res.json({ order: orderToApi(order), result });
    } catch (err) {
      return sendCourierError(res, err);
    }
  })
);

/** Public: courier status webhook (authenticated by the courier's bearer token). */
router.post(
  '/webhooks/courier/:provider',
  asyncHandler(async (req, res) => {
    try {
      const out = await handleCourierWebhook(String(req.params.provider), req.headers, req.body);
      res.status(out.http).json(out.body);
    } catch (e) {
      // 5xx makes the courier retry later.
      console.warn('[courier] webhook processing failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ status: 'error', message: 'Could not process the webhook' });
    }
  })
);

export default router;
