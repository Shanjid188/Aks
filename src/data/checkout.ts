/**
 * Checkout configuration (delivery zones + payment methods) rendered by the
 * checkout page. The API is the authority for the charge — this module only
 * mirrors what Admin → Settings → Delivery & Payment exposes, with the values
 * that used to be hardcoded in the checkout as the bundled fallback.
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
  /** Manual transfer: the customer sends money first and enters the TrxID. */
  manual: boolean;
  /** Pay-to details to display (empty for cash on delivery). */
  instructions: string;
}

export interface CheckoutConfig {
  zones: ShippingZone[];
  paymentMethods: PaymentMethodOption[];
}

export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  zones: [
    { id: 'inside_dhaka', label: 'Inside Dhaka', labelBn: 'ঢাকার ভিতরে', fee: 120 },
    { id: 'sub_dhaka', label: 'Sub-Dhaka Area', labelBn: 'ঢাকার আশপাশে', fee: 150 },
    { id: 'outside_dhaka', label: 'Outside Dhaka', labelBn: 'ঢাকার বাইরে', fee: 200 },
  ],
  paymentMethods: [
    { id: 'cod', label: 'Cash on Delivery', labelBn: 'ক্যাশ অন ডেলিভারি', manual: false, instructions: '' },
  ],
};

function parseZones(value: unknown): ShippingZone[] {
  if (!Array.isArray(value)) return DEFAULT_CHECKOUT_CONFIG.zones;
  const zones = value
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      const fee = Number(r.fee);
      if (!id || !Number.isFinite(fee) || fee < 0) return null;
      return { id, label: String(r.label ?? id), labelBn: String(r.labelBn ?? ''), fee } as ShippingZone;
    })
    .filter((z): z is ShippingZone => z !== null);
  return zones.length > 0 ? zones : DEFAULT_CHECKOUT_CONFIG.zones;
}

function parsePaymentMethods(value: unknown): PaymentMethodOption[] {
  if (!Array.isArray(value)) return DEFAULT_CHECKOUT_CONFIG.paymentMethods;
  const methods = value
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      if (!id) return null;
      return {
        id,
        label: String(r.label ?? id),
        labelBn: String(r.labelBn ?? ''),
        manual: Boolean(r.manual),
        instructions: String(r.instructions ?? ''),
      } as PaymentMethodOption;
    })
    .filter((m): m is PaymentMethodOption => m !== null);
  return methods.length > 0 ? methods : DEFAULT_CHECKOUT_CONFIG.paymentMethods;
}

/** Build the checkout config from the public settings payload. */
export const checkoutConfigFromSettings = (raw: Record<string, unknown>): CheckoutConfig => ({
  zones: parseZones(raw.shippingZones),
  paymentMethods: parsePaymentMethods(raw.paymentMethods),
});
