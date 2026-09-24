import type { PrismaClient } from '@prisma/client';
import { AKS_MART } from '../../src/data/aksMart.ts';
import { DEFAULT_PAYMENT_METHOD_IDS, DEFAULT_SHIPPING_ZONES } from '../src/lib/checkout.ts';

/**
 * Storefront identity/content baseline — the storefront reads these through
 * GET /api/settings/public with `DEFAULT_STORE_INFO` (bundled AKS_MART) as
 * the per-field fallback, and the admin edits them in Settings. Seeded once
 * so a fresh install shows the right branding without any admin action.
 *
 * Kept in its own module (like seed-categories.ts) so the migration scripts can
 * seed settings without running the whole `seed.ts`.
 */
export const DEFAULT_STORE_SETTINGS: Record<string, unknown> = {
  storeName: AKS_MART.name,
  storeTagline: AKS_MART.tagline,
  storeLogo: '/images/AKS.logo.jpg',
  favicon: '/AKS.logo.jpg',
  phone: AKS_MART.phone,
  email: AKS_MART.email,
  website: AKS_MART.site,
  address: AKS_MART.address,
  addressBn: AKS_MART.addressBn,
  mottoEn: AKS_MART.mottoEn,
  mottoBn: AKS_MART.mottoBn,
  currency: 'BDT',
  currencySymbol: '৳',
  // Delivery & payment (Admin → Settings → Delivery & Payment). These are the
  // zones/payment method the checkout used before they became configurable:
  // the API charges the configured zone fee, so this preserves that behaviour
  // while giving the merchant control. Manual methods stay hidden until their
  // pay-to details are filled in below.
  shippingZones: DEFAULT_SHIPPING_ZONES,
  paymentMethods: DEFAULT_PAYMENT_METHOD_IDS,
  bkashNumber: '',
  nagadNumber: '',
  bankDetails: '',
};

/** Seed store settings idempotently; admin edits are never overwritten. */
export async function seedStoreSettings(prisma: PrismaClient): Promise<number> {
  for (const [key, value] of Object.entries(DEFAULT_STORE_SETTINGS)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }
  return prisma.storeSetting.count({
    where: { key: { in: Object.keys(DEFAULT_STORE_SETTINGS) } },
  });
}
