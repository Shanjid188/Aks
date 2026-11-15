import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { isoDay, spendDay, storeDay } from '../lib/adSpend.ts';
import {
  GA4_PROPERTY_SETTING,
  Ga4Error,
  clearGa4Cache,
  ga4DataStatus,
  loadGa4Settings,
  testGa4Connection,
  trafficReport,
  validGa4PropertyId,
} from '../lib/ga4Data.ts';

/**
 * Admin → Advertising → Traffic (GA4 Data API, read-only, cached) and the
 * GA4 part of Integrations. Figures come from Google Analytics as reported —
 * the page labels them so, and nothing is filled in when GA4 is unavailable.
 */
const router = Router();

const todayLocal = () => isoDay(storeDay(new Date()));

function ga4Failure(res: import('express').Response, err: unknown) {
  if (err instanceof Ga4Error) return res.status(err.status).json({ error: err.message });
  throw err;
}

router.get(
  '/admin/advertising/traffic',
  requirePermission(PERM.ADVERTISING_TRAFFIC_VIEW),
  asyncHandler(async (req, res) => {
    const status = ga4DataStatus();
    if (!status.connected) return res.json({ connected: false });
    const today = todayLocal();
    const q = req.query as Record<string, string | undefined>;
    const end = q.to ? spendDay(q.to) : spendDay(today);
    const start = q.from ? spendDay(q.from) : new Date(spendDay(today)!.getTime() - 29 * 86_400_000);
    if (!start || !end) return res.status(400).json({ error: 'Dates must be YYYY-MM-DD' });
    if (start > end) return res.status(400).json({ error: 'The start date is after the end date' });
    if ((end.getTime() - start.getTime()) / 86_400_000 > 731) return res.status(400).json({ error: 'Choose a range of at most 2 years' });
    try {
      const report = await trafficReport(isoDay(start), isoDay(end), today, q.refresh === '1');
      res.json({ connected: true, propertyId: status.propertyId, ...report });
    } catch (err) {
      return ga4Failure(res, err);
    }
  })
);

router.put(
  '/admin/advertising/integrations/ga4',
  requirePermission(PERM.ADVERTISING_INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const value = typeof req.body?.propertyId === 'string' ? req.body.propertyId.trim().replace(/^properties\//, '') : '';
    if (value && !validGa4PropertyId(value)) {
      return res.status(400).json({ error: 'The GA4 property ID is a number, e.g. 412345678 (Admin → Property details) — not the G- measurement ID' });
    }
    await prisma.storeSetting.upsert({
      where: { key: GA4_PROPERTY_SETTING },
      update: { value: JSON.stringify(value) },
      create: { key: GA4_PROPERTY_SETTING, value: JSON.stringify(value) },
    });
    await loadGa4Settings();
    await clearGa4Cache();
    await logAudit({
      admin: currentAdmin(req),
      action: 'integration.updated',
      entity: 'integration',
      entityId: 'ga4_data',
      details: `GA4 property → ${value || '(cleared)'}`,
    });
    res.json({ ga4: ga4DataStatus() });
  })
);

router.post(
  '/admin/advertising/integrations/ga4/test',
  requirePermission(PERM.ADVERTISING_INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    if (!ga4DataStatus().connected) return res.status(400).json({ error: 'Add the property ID and the service-account key first' });
    try {
      const result = await testGa4Connection(todayLocal());
      await logAudit({ admin: currentAdmin(req), action: 'integration.tested', entity: 'integration', entityId: 'ga4_data', details: 'GA4 Data API connection OK' });
      res.json({ ok: true, ...result });
    } catch (err) {
      return ga4Failure(res, err);
    }
  })
);

export default router;
