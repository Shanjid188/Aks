import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/**
 * Site-wide SEO defaults (Admin → Settings → SEO) — read by the storefront's
 * runtime <head> manager (src/lib/seo.ts).
 */
const SEO_KEYS = ['seoTitle', 'seoDescription', 'ogImage'];


/**
 * Admin-editable storefront copy (Admin → Storefront → Homepage). Keys are
 * namespaced `content.*`; the storefront maps each one onto its bundled default
 * copy (see src/data/siteContent.ts), so an unset key simply keeps the default.
 */
const CONTENT_KEYS = [
  'content.featured.eyebrow', 'content.featured.title', 'content.featured.subtitle', 'content.featured.action',
  'content.newArrivals.eyebrow', 'content.newArrivals.title', 'content.newArrivals.subtitle', 'content.newArrivals.action',
  'content.bestSellers.eyebrow', 'content.bestSellers.title', 'content.bestSellers.subtitle', 'content.bestSellers.action',
  'content.divisions.eyebrow', 'content.divisions.title', 'content.divisions.subtitle', 'content.divisions.action',
  'content.offers.eyebrow', 'content.offers.title', 'content.offers.subtitle',
  'content.showcase.eyebrow', 'content.showcase.title', 'content.showcase.subtitle',
  'content.trust.item1Title', 'content.trust.item1Sub',
  'content.trust.item2Title', 'content.trust.item2Sub',
  'content.trust.item3Title', 'content.trust.item3Sub',
  'content.header.saleChip', 'content.header.saleChipShort',
  'content.header.allDepartments', 'content.header.divisions', 'content.header.otherDivisions',
  'content.header.categoriesSuffix', 'content.header.shopPrefix', 'content.header.trendingLabel',
  'content.header.mobileShopBy', 'content.header.quickTrack', 'content.header.quickClub',
  'content.header.outfitMatcher',
  'content.header.trendingSearches',
];

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
      'address', 'addressBn', 'mottoEn', 'mottoBn', 'facebook', 'whatsapp',
      'instagram', 'youtube', 'tiktok', 'currency', 'currencySymbol',
      'defaultShippingCharge', 'freeShippingThreshold', 'taxPercent',
      'invoiceFooter', 'returnPolicy', 'packagingNote', 'thankYouMessage',
      'invoicePaperSize', 'thermalWidth', 'lowStockThreshold',
      'orderPrefix', 'posPrefix', 'timezone', 'language',
      ...CONTENT_KEYS,
      ...SEO_KEYS,
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
