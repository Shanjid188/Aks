/**
 * Commerce numbers the storefront must agree with the admin panel on
 * (Admin → Settings → Commerce). The values below are only the bundled
 * defaults used when the API is unreachable or a setting is unset.
 */

export interface CommerceSettings {
  /** Orders at or above this subtotal ship free. */
  freeShippingThreshold: number;
  /** Standard delivery charge applied when shipping is not free. */
  defaultShippingCharge: number;
}

export const DEFAULT_COMMERCE: CommerceSettings = {
  freeShippingThreshold: 2500,
  defaultShippingCharge: 120,
};
