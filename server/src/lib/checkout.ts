import { prisma } from './prisma.ts';

/**
 * Checkout configuration the merchant controls (Admin → Settings → Delivery &
 * Payment): delivery zones with their fees, and which payment methods are
 * offered. The API is the authority — the storefront only renders this.
 */

export interface ShippingZone {
  id: string;
  label: string;
  labelBn: string;
  fee: number;
}

export interface PaymentMethodOption {
  id: string;
  label: string;
  labelBn: string;
  /** Manual transfer: the customer sends money first and declares the TrxID. */
  manual: boolean;
  /** Pay-to details shown at checkout (empty for cash on delivery). */
  instructions: string;
}

/** Bundled defaults — exactly the zones/payment method the checkout used before. */
export const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  { id: 'inside_dhaka', label: 'Inside Dhaka', labelBn: 'ঢাকার ভিতরে', fee: 120 },
  { id: 'sub_dhaka', label: 'Sub-Dhaka Area', labelBn: 'ঢাকার আশপাশে', fee: 150 },
  { id: 'outside_dhaka', label: 'Outside Dhaka', labelBn: 'ঢাকার বাইরে', fee: 200 },
];

/**
 * Methods the API can actually handle. `cod` is complete; the manual ones are
 * only offered when their pay-to details are filled in, and they never mark an
 * order as paid — an admin verifies the transaction first.
 */
const SUPPORTED_PAYMENT_METHODS: { id: string; label: string; labelBn: string; manual: boolean; detailKey: string }[] = [
  { id: 'cod', label: 'Cash on Delivery', labelBn: 'ক্যাশ অন ডেলিভারি', manual: false, detailKey: '' },
  { id: 'bkash', label: 'bKash', labelBn: 'বিকাশ', manual: true, detailKey: 'bkashNumber' },
  { id: 'nagad', label: 'Nagad', labelBn: 'নগদ', manual: true, detailKey: 'nagadNumber' },
  { id: 'bank', label: 'Bank transfer', labelBn: 'ব্যাংক ট্রান্সফার', manual: true, detailKey: 'bankDetails' },
];

/** Payment methods offered before the merchant enables any others (the old behaviour). */
export const DEFAULT_PAYMENT_METHOD_IDS = ['cod'];

/**
 * Store-setting keys that hold the delivery/payment configuration — exported so
 * the settings routes can whitelist exactly the same keys this module reads.
 */
export const CHECKOUT_KEYS = ['shippingZones', 'paymentMethods', 'bkashNumber', 'nagadNumber', 'bankDetails'];

export interface CheckoutConfig {
  zones: ShippingZone[];
  paymentMethods: PaymentMethodOption[];
}

function parseValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseZones(value: unknown): ShippingZone[] {
  if (!Array.isArray(value)) return DEFAULT_SHIPPING_ZONES;
  const zones = value
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      const fee = Number(r.fee);
      if (!id || !Number.isFinite(fee) || fee < 0) return null;
      return {
        id,
        label: String(r.label ?? id),
        labelBn: String(r.labelBn ?? ''),
        fee,
      } as ShippingZone;
    })
    .filter((z): z is ShippingZone => z !== null);
  return zones.length > 0 ? zones : DEFAULT_SHIPPING_ZONES;
}

function parsePaymentMethods(value: unknown, settings: Map<string, unknown>): PaymentMethodOption[] {
  const enabledIds = Array.isArray(value)
    ? value.map((v) => String(v).trim())
    : ['cod'];
  const methods = SUPPORTED_PAYMENT_METHODS.filter((m) => enabledIds.includes(m.id))
    .map((m) => {
      const details = m.detailKey ? String(settings.get(m.detailKey) ?? '').trim() : '';
      // A manual method without pay-to details cannot be offered — the customer
      // would have nowhere to send the money.
      if (m.manual && !details) return null;
      return { id: m.id, label: m.label, labelBn: m.labelBn, manual: m.manual, instructions: details };
    })
    .filter((m): m is PaymentMethodOption => m !== null);
  return methods;
}

/** Read the delivery zones + enabled payment methods from store settings. */
export async function loadCheckoutConfig(): Promise<CheckoutConfig> {
  const rows = await prisma.storeSetting.findMany({ where: { key: { in: CHECKOUT_KEYS } } });
  const settings = new Map(rows.map((r) => [r.key, parseValue(r.value)]));
  return {
    zones: parseZones(settings.get('shippingZones')),
    paymentMethods: parsePaymentMethods(settings.get('paymentMethods'), settings),
  };
}
