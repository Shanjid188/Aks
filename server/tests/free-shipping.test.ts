// Free delivery by order amount (Store settings → freeShippingThreshold).
// Rule under test, mirroring the storefront checkout page: delivery is free when
// the pre-discount subtotal, priced from the catalog, is >= the threshold.
// Runs in its own file (own server + DB) because the last block edits settings.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { COUPONS, FREE_SHIPPING_THRESHOLD, SHIPPING_ZONES } from './helpers/db.ts';
import { checkoutBody, fixture, placeOrder, type CheckoutLine } from './helpers/orders.ts';

useTestServer();

const [INSIDE, OUTSIDE] = SHIPPING_ZONES;
const RICE = fixture('TEST-RICE-5KG'); // 450
const POT = fixture('TEST-POTTERY'); // 1200

// 1200 + 4 × 450 = 3000, exactly the fixture threshold.
const EXACT: CheckoutLine[] = [
  { sku: POT.sku, quantity: 1 },
  { sku: RICE.sku, quantity: 4 },
];
const ABOVE: CheckoutLine[] = [{ sku: RICE.sku, quantity: 7 }]; // 3150
const BELOW: CheckoutLine[] = [{ sku: RICE.sku, quantity: 6 }]; // 2700

async function order(lines: CheckoutLine[], extra?: Record<string, unknown>) {
  const res = await placeOrder(lines, extra);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.order;
}

describe('free shipping threshold', () => {
  it('fixtures straddle the threshold as intended', () => {
    assert.equal(POT.price + RICE.price * 4, FREE_SHIPPING_THRESHOLD);
    assert.ok(RICE.price * 7 > FREE_SHIPPING_THRESHOLD);
    assert.ok(RICE.price * 6 < FREE_SHIPPING_THRESHOLD);
  });

  it('subtotal exactly equal to the threshold ships free', async () => {
    const o = await order(EXACT);
    assert.equal(o.subtotal, FREE_SHIPPING_THRESHOLD);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.total, FREE_SHIPPING_THRESHOLD);
    assert.equal(o.dueAmount, o.total);
  });

  it('subtotal above the threshold ships free', async () => {
    const o = await order(ABOVE);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.total, RICE.price * 7);
  });

  it('subtotal below the threshold pays the zone fee', async () => {
    const o = await order(BELOW);
    assert.equal(o.shippingFee, INSIDE.fee);
    assert.equal(o.total, RICE.price * 6 + INSIDE.fee);
  });

  for (const zone of [INSIDE, OUTSIDE]) {
    it(`${zone.id}: fee below the threshold, free at or above it`, async () => {
      assert.equal((await order(BELOW, { deliveryMethod: zone.id })).shippingFee, zone.fee);
      assert.equal((await order(EXACT, { deliveryMethod: zone.id })).shippingFee, 0);
      assert.equal((await order(ABOVE, { deliveryMethod: zone.id })).shippingFee, 0);
    });
  }

  it('an unknown zone is still rejected above the threshold', async () => {
    const res = await placeOrder(ABOVE, { deliveryMethod: 'mars' });
    assert.equal(res.status, 400);
  });

  it('store pickup is free on either side of the threshold', async () => {
    for (const lines of [BELOW, ABOVE]) {
      const o = await order(lines, { deliveryMethod: 'pickup', pickupStore: 'Dhaka' });
      assert.equal(o.shippingFee, 0);
      assert.equal(o.total, o.subtotal);
    }
  });
});

describe('free shipping and coupons', () => {
  it('FREESHIP below the threshold still ships free and keeps the goods full price', async () => {
    const o = await order(BELOW, { couponCode: COUPONS.freeship.code, deliveryMethod: OUTSIDE.id });
    assert.equal(o.couponCode, COUPONS.freeship.code);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.discount, 0);
    assert.equal(o.total, RICE.price * 6);
  });

  it('FREESHIP above the threshold is accepted and changes nothing else', async () => {
    const o = await order(ABOVE, { couponCode: COUPONS.freeship.code });
    assert.equal(o.couponCode, COUPONS.freeship.code);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.discount, 0);
    assert.equal(o.total, RICE.price * 7);
  });

  it('the threshold is checked against the subtotal before a percent discount', async () => {
    // 3150 - 10% = 2835 after discount, below 3000 — still free, as the checkout page shows.
    const o = await order(ABOVE, { couponCode: COUPONS.percent.code });
    const discount = Math.round((RICE.price * 7 * COUPONS.percent.value) / 100);
    assert.equal(o.discount, discount);
    assert.ok(o.subtotal - discount < FREE_SHIPPING_THRESHOLD);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.total, RICE.price * 7 - discount);
  });

  it('a percent coupon below the threshold keeps the zone fee', async () => {
    const o = await order(BELOW, { couponCode: COUPONS.percent.code });
    assert.ok(o.discount > 0);
    assert.equal(o.shippingFee, INSIDE.fee);
  });
});

describe('tampered requests', () => {
  it('ignores a client shippingFee of 0 below the threshold', async () => {
    const o = await order(BELOW, { shippingFee: 0, deliveryMethod: OUTSIDE.id });
    assert.equal(o.shippingFee, OUTSIDE.fee);
  });

  it('ignores a client shippingFee above the threshold', async () => {
    const o = await order(ABOVE, { shippingFee: 999 });
    assert.equal(o.shippingFee, 0);
    assert.equal(o.total, RICE.price * 7);
  });

  it('inflated client prices cannot unlock free delivery', async () => {
    const body = checkoutBody(
      BELOW.map((l) => ({ ...l, price: 10_000 })),
      { subtotal: 60_000, total: 60_000, shippingFee: 0 }
    );
    body.items.forEach((i) => (i.product.price = 10_000));
    const res = await api().post('/api/orders', body);
    assert.equal(res.status, 201);
    assert.equal(res.body.order.subtotal, RICE.price * 6);
    assert.equal(res.body.order.shippingFee, INSIDE.fee);
  });

  it('deflated client prices do not cancel free delivery', async () => {
    const res = await api().post('/api/orders', checkoutBody(ABOVE.map((l) => ({ ...l, price: 1 }))));
    assert.equal(res.body.order.subtotal, RICE.price * 7);
    assert.equal(res.body.order.shippingFee, 0);
  });
});

describe('threshold setting', () => {
  // Runs last in this file: it changes the store setting.
  const setThreshold = async (value: unknown) => {
    const res = await api(await login('super')).put('/api/admin/settings', { freeShippingThreshold: value });
    assert.equal(res.status, 200);
  };

  it('a new threshold applies to the next order', async () => {
    await setThreshold(5000);
    assert.equal((await order(ABOVE)).shippingFee, INSIDE.fee); // 3150 < 5000
    await setThreshold(FREE_SHIPPING_THRESHOLD);
    assert.equal((await order(ABOVE)).shippingFee, 0);
  });

  it('an invalid value falls back to the storefront default (2500), like the checkout page', async () => {
    await setThreshold('not a number');
    try {
      assert.equal((await order([{ sku: RICE.sku, quantity: 5 }])).shippingFee, INSIDE.fee); // 2250
      assert.equal((await order([{ sku: RICE.sku, quantity: 6 }])).shippingFee, 0); // 2700
    } finally {
      await setThreshold(FREE_SHIPPING_THRESHOLD);
    }
  });
});
