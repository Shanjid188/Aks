import type { Coupon } from '../types';

/**
 * Coupon rules shared by the cart drawer, cart page, checkout and offers section.
 *
 * A "free delivery" coupon is any coupon that grants 100% off. This used to be
 * detected by the literal code `FREESHIP`, which meant a free-delivery coupon
 * created in Admin → Coupons under any other code had no effect — and, worse, a
 * hand-made 100% coupon zeroed the entire cart instead of just the delivery fee.
 * Coupons are now judged purely by their own data, never by their code name.
 */
export const isFreeDeliveryCoupon = (
  coupon: { discountType: string; value: number } | null | undefined
): boolean => !!coupon && coupon.discountType === 'percent' && coupon.value >= 100;

/** Item-level savings for a coupon — free-delivery coupons never discount items. */
export const couponItemDiscount = (subtotal: number, coupon: Coupon | null): number => {
  if (!coupon || isFreeDeliveryCoupon(coupon)) return 0;
  if (coupon.discountType === 'percent') return Math.round((subtotal * coupon.value) / 100);
  return coupon.value;
};
