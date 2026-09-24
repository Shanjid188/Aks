import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { CHECKOUT_KEYS, loadCheckoutConfig } from '../lib/checkout.ts';
import { logAudit } from '../lib/audit.ts';
import { CONTENT_SETTING_KEYS } from '../../../src/data/siteContent.ts';

const router = Router();

/**
 * Site-wide SEO defaults (Admin → Settings → SEO) — read by the storefront's
 * runtime <head> manager (src/lib/seo.ts).
 */
const SEO_KEYS = ['seoTitle', 'seoDescription', 'ogImage'];

/**
 * Admin-editable storefront copy (Admin → Storefront → Homepage), in both
 * languages. The list is derived from the storefront's own key map so a field
 * added there is editable here without touching this file.
 */
const CONTENT_KEYS = CONTENT_SETTING_KEYS;

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
      'storeName', 'storeTagline', 'storeLogo', 'favicon', 'phone', 'email',
      'website', 'address', 'addressBn', 'mottoEn', 'mottoBn', 'facebook', 'whatsapp',
      'instagram', 'youtube', 'tiktok', 'currency', 'currencySymbol',
      'defaultShippingCharge', 'freeShippingThreshold', 'taxPercent',
      'announcement',
      'announcementBn',
      'announcementBg',
      'announcementText',
      'announcementLink',
      'lowStockThreshold',
      ...CONTENT_KEYS,
      ...SEO_KEYS,
      ...CHECKOUT_KEYS,
    ].filter((k) => Object.prototype.hasOwnProperty.call(all, k));
    const picked: Record<string, unknown> = {};
    for (const k of safe) picked[k] = all[k];
    // Delivery zones and payment methods are resolved server-side: `paymentMethods`
    // is stored as the ids the merchant enabled, so the public payload replaces it
    // with the usable options (label + pay-to instructions), dropping manual
    // methods whose details are still empty. The storefront only renders this.
    const checkout = await loadCheckoutConfig();
    picked.shippingZones = checkout.zones;
    picked.paymentMethods = checkout.paymentMethods;
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
      'address', 'addressBn', 'mottoEn', 'mottoBn', 'facebook', 'whatsapp',
      'instagram', 'youtube', 'tiktok', 'currency', 'currencySymbol',
      'defaultShippingCharge', 'freeShippingThreshold', 'taxPercent',
      'invoiceFooter', 'returnPolicy', 'packagingNote', 'thankYouMessage',
      'invoicePaperSize', 'thermalWidth', 'lowStockThreshold',
      'orderPrefix', 'posPrefix', 'timezone', 'language',
      ...CONTENT_KEYS,
      ...SEO_KEYS,
      ...CHECKOUT_KEYS,
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
