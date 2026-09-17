import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/** Read all store settings as a flat object (public values only for storefront). */
async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await prisma.storeSetting.findMany();
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = r.value;
    }
  }
  return out;
}

/** Public: storefront settings snapshot (safe keys used by the frontend). */
router.get(
  '/settings/public',
  asyncHandler(async (_req, res) => {
    const all = await getSettingsMap();
    const safe = [
      'storeName',
      'storeLogo',
      'phone',
      'email',
      'website',
      'address',
      'facebook',
      'whatsapp',
      'currency',
      'currencySymbol',
      'freeShippingThreshold',
      'defaultShippingCharge',
      'announcement',
      'announcementBn',
      'announcementBg',
      'announcementText',
      'announcementLink',
      'lowStockThreshold',
    ].filter((k) => Object.prototype.hasOwnProperty.call(all, k));
    const picked: Record<string, unknown> = {};
    for (const k of safe) picked[k] = all[k];
    res.json({ settings: picked });
  })
);

/** Admin: full settings map. */
router.get(
  '/admin/settings',
  requirePermission(PERM.SETTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettingsMap() });
  })
);

/** Admin: upsert store settings (object of key → JSON-able value). */
router.put(
  '/admin/settings',
  requirePermission(PERM.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body as Record<string, unknown> | undefined) ?? {};
    const allowed = [
      'storeName', 'storeTagline', 'storeLogo', 'favicon', 'phone', 'email', 'website',
      'address', 'facebook', 'whatsapp', 'currency', 'currencySymbol',
      'defaultShippingCharge', 'freeShippingThreshold', 'taxPercent',
      'invoiceFooter', 'returnPolicy', 'packagingNote', 'thankYouMessage',
      'invoicePaperSize', 'thermalWidth', 'lowStockThreshold',
      'orderPrefix', 'posPrefix', 'timezone', 'language',
    ];
    let count = 0;
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const value = body[key];
      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      });
      count++;
    }
    await logAudit({
      admin: currentAdmin(req),
      action: 'settings.updated',
      entity: 'settings',
      entityId: null,
      details: `${count} settings updated`,
    }).catch(() => undefined);
    res.json({ settings: await getSettingsMap(), updated: count });
  })
);

export default router;
