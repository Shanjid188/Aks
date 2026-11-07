// Storefront checkout: totals, delivery fees, coupons and validation.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { COUPONS, FREE_SHIPPING_THRESHOLD, SHIPPING_ZONES } from './helpers/db.ts';
import { adminProduct, checkoutBody, fixture, placeOrder } from './helpers/orders.ts';

useTestServer();

const INSIDE = SHIPPING_ZONES[0];
const OUTSIDE = SHIPPING_ZONES[1];
const RICE = fixture('TEST-RICE-5KG'); // 450
const OIL = fixture('TEST-OIL-1L'); // 280

async function couponUsage(code: string): Promise<number> {
  const res = await api(await login('super')).get('/api/admin/coupons');
  return res.body.coupons.find((c: any) => c.code === code).usedCount;
}

describe('checkout totals', () => {
  it('charges the configured fee for the chosen zone', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 1 }], { deliveryMethod: OUTSIDE.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const o = res.body.order;
    assert.equal(o.subtotal, RICE.price);
    assert.equal(o.shippingFee, OUTSIDE.fee);
    assert.equal(o.discount, 0);
    assert.equal(o.total, RICE.price + OUTSIDE.fee);
  });

  it('starts new orders as pending, unpaid and fully due', async () => {
    const o = (await placeOrder([{ sku: RICE.sku, quantity: 2 }])).body.order;
    assert.equal(o.status, 'pending');
    assert.equal(o.source, 'online');
    assert.equal(o.paymentStatus, 'unpaid');
    assert.equal(o.paidAmount, 0);
    assert.equal(o.dueAmount, o.total);
    assert.match(o.trackingCode, /^AKS-BD-\d{6}$/);
  });

  it('ignores a shippingFee sent by the client', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 1 }], { shippingFee: 0 });
    assert.equal(res.body.order.shippingFee, INSIDE.fee);
  });

  it('charges no delivery for store pickup', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 1 }], { deliveryMethod: 'pickup', pickupStore: 'Dhaka' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.shippingFee, 0);
    assert.equal(res.body.order.total, RICE.price);
  });

  it('adds up several lines', async () => {
    const res = await placeOrder([
      { sku: RICE.sku, quantity: 2 },
      { sku: OIL.sku, quantity: 3 },
    ]);
    const subtotal = RICE.price * 2 + OIL.price * 3;
    assert.equal(res.body.order.subtotal, subtotal);
    assert.equal(res.body.order.total, subtotal + INSIDE.fee);
    assert.equal(res.body.order.items.length, 2);
  });

  it('gives free delivery once the subtotal reaches freeShippingThreshold', async () => {
    const qty = Math.ceil(FREE_SHIPPING_THRESHOLD / RICE.price);
    const res = await placeOrder([{ sku: RICE.sku, quantity: qty }]);
    assert.ok(res.body.order.subtotal >= FREE_SHIPPING_THRESHOLD);
    assert.equal(res.body.order.shippingFee, 0);
    assert.equal(res.body.order.total, res.body.order.subtotal);
  });

  it('prices items from the catalog, not from the client', async () => {
    const body = checkoutBody([
      { sku: RICE.sku, quantity: 2, price: 1 },
      { sku: OIL.sku, quantity: 1, price: 0 },
    ]);
    // Tamper with every price-like field the client could send.
    body.items[0].product.price = 1;
    Object.assign(body.items[0], { total: 2, lineTotal: 2, subtotal: 2 });
    Object.assign(body, { subtotal: 3, total: 3, discount: 0 });

    const res = await api().post('/api/orders', body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const o = res.body.order;
    const subtotal = RICE.price * 2 + OIL.price;
    assert.equal(o.subtotal, subtotal);
    assert.equal(o.total, subtotal + INSIDE.fee);
    assert.equal(o.dueAmount, o.total);
    assert.deepEqual(
      o.items.map((i: any) => [i.productSku, i.price]).sort(),
      [[OIL.sku, OIL.price], [RICE.sku, RICE.price]].sort()
    );
  });

  it('applies coupon discounts to the catalog price, not the client price', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 2, price: 1 }], { couponCode: COUPONS.percent.code });
    const subtotal = RICE.price * 2;
    assert.equal(res.body.order.couponCode, COUPONS.percent.code);
    assert.equal(res.body.order.discount, Math.round((subtotal * COUPONS.percent.value) / 100));
  });

  it('rejects an item that does not match a catalog product', async () => {
    const body = checkoutBody([{ sku: RICE.sku, quantity: 1 }]);
    body.items.push({
      product: { sku: 'NOT-A-REAL-SKU', name: 'Free TV', price: 1 },
      price: 1,
      quantity: 1,
      selectedSize: { size: '' },
      selectedColor: { name: 'Default' },
    });
    const res = await api().post('/api/orders', body);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /no longer available/);
  });

  it('rejects an item with no product reference at all', async () => {
    const res = await api().post('/api/orders', {
      ...checkoutBody([]),
      items: [{ productName: 'Mystery', price: 1, quantity: 1 }],
    });
    assert.equal(res.status, 400);
  });
});

describe('checkout coupons', () => {
  it('applies a percent coupon once minSpend is met', async () => {
    const before = await couponUsage(COUPONS.percent.code);
    const res = await placeOrder([{ sku: RICE.sku, quantity: 2 }], { couponCode: COUPONS.percent.code });
    const subtotal = RICE.price * 2;
    const discount = Math.round((subtotal * COUPONS.percent.value) / 100);
    assert.equal(res.body.order.couponCode, COUPONS.percent.code);
    assert.equal(res.body.order.discount, discount);
    assert.equal(res.body.order.total, subtotal - discount + INSIDE.fee);
    assert.equal(await couponUsage(COUPONS.percent.code), before + 1);
  });

  it('accepts coupon codes in any case', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 2 }], { couponCode: ` ${COUPONS.percent.code.toLowerCase()} ` });
    assert.equal(res.body.order.couponCode, COUPONS.percent.code);
  });

  it('ignores a percent coupon below minSpend', async () => {
    assert.ok(OIL.price < COUPONS.percent.minSpend);
    const res = await placeOrder([{ sku: OIL.sku, quantity: 1 }], { couponCode: COUPONS.percent.code });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.couponCode, null);
    assert.equal(res.body.order.discount, 0);
  });

  it('ignores an unknown coupon', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 1 }], { couponCode: 'NOPE' });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.couponCode, null);
  });

  it('FREESHIP removes the delivery fee but never discounts the goods', async () => {
    const res = await placeOrder([{ sku: RICE.sku, quantity: 1 }], {
      couponCode: COUPONS.freeship.code,
      deliveryMethod: OUTSIDE.id,
    });
    assert.equal(res.body.order.couponCode, COUPONS.freeship.code);
    assert.equal(res.body.order.shippingFee, 0);
    assert.equal(res.body.order.discount, 0);
    assert.equal(res.body.order.total, RICE.price);
  });

  it('/coupons/validate reports valid and invalid codes', async () => {
    const ok = await api().post('/api/coupons/validate', { code: 'freeship' });
    assert.equal(ok.body.valid, true);
    const bad = await api().post('/api/coupons/validate', { code: 'NOPE' });
    assert.equal(bad.body.valid, false);
  });

  it('does not count coupon usage when the order is rejected (#39)', async () => {
    const before = await couponUsage(COUPONS.percent.code);
    const rejected = [
      await placeOrder([{ sku: RICE.sku, quantity: 2 }], { couponCode: COUPONS.percent.code, deliveryMethod: 'mars' }),
      await placeOrder([{ sku: RICE.sku, quantity: 2 }], { couponCode: COUPONS.percent.code, paymentMethod: 'bkash' }),
      await placeOrder([{ sku: 'TEST-POTTERY', quantity: 100_000 }], { couponCode: COUPONS.percent.code }),
    ];
    assert.deepEqual(rejected.map((r) => r.status), [400, 400, 400]);
    assert.equal(await couponUsage(COUPONS.percent.code), before);
  });
});

describe('checkout validation', () => {
  const rejects = async (body: Promise<{ status: number; body: any }>, pattern: RegExp) => {
    const res = await body;
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, pattern);
  };

  it('rejects an empty cart', () =>
    rejects(api().post('/api/orders', { items: [], customerAddress: { fullName: 'A', phone: '1' } }), /at least one item/));

  it('rejects a missing name or phone', () =>
    rejects(placeOrder([{ sku: RICE.sku, quantity: 1 }], { customerAddress: { fullName: 'A' } }), /name and phone/));

  for (const quantity of [0, -1, 1.5]) {
    it(`rejects quantity ${quantity}`, () => rejects(placeOrder([{ sku: RICE.sku, quantity }]), /Invalid quantity/));
  }

  it('rejects an unknown delivery area', () =>
    rejects(placeOrder([{ sku: RICE.sku, quantity: 1 }], { deliveryMethod: 'mars' }), /delivery area/));

  it('rejects a payment method the store has not enabled', () =>
    rejects(placeOrder([{ sku: RICE.sku, quantity: 1 }], { paymentMethod: 'bkash' }), /payment method/));

  it('rejects more than the available stock and leaves stock untouched', async () => {
    const pot = await adminProduct('TEST-POTTERY');
    await rejects(placeOrder([{ sku: 'TEST-POTTERY', quantity: pot.stockQuantity + 1 }]), /enough stock/);
    assert.equal((await adminProduct('TEST-POTTERY')).stockQuantity, pot.stockQuantity);
  });

  it('deducts stock for tracked products', async () => {
    const before = (await adminProduct('TEST-BASKET')).stockQuantity;
    const res = await placeOrder([{ sku: 'TEST-BASKET', quantity: 2 }]);
    assert.equal(res.status, 201);
    assert.equal((await adminProduct('TEST-BASKET')).stockQuantity, before - 2);
  });
});

describe('checkout stock', () => {
  it('checks the total of a product split across cart lines (#23)', async () => {
    const pot = await adminProduct('TEST-POTTERY');
    const half = Math.floor(pot.stockQuantity / 2) + 1; // two lines together exceed stock
    const res = await placeOrder([
      { sku: 'TEST-POTTERY', quantity: half },
      { sku: 'TEST-POTTERY', quantity: half },
    ]);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, /enough stock/);
    assert.equal((await adminProduct('TEST-POTTERY')).stockQuantity, pot.stockQuantity);
  });

  it('deducts the combined quantity of split lines', async () => {
    const before = (await adminProduct('TEST-POTTERY')).stockQuantity;
    const res = await placeOrder([
      { sku: 'TEST-POTTERY', quantity: 2 },
      { sku: 'TEST-POTTERY', quantity: 3 },
    ]);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await adminProduct('TEST-POTTERY')).stockQuantity, before - 5);
  });

  it('parallel checkouts never oversell (#22)', async () => {
    const before = (await adminProduct('TEST-BASKET')).stockQuantity;
    const qty = 2;
    const attempts = before; // asks for twice what is on the shelf
    const results = await Promise.all(
      Array.from({ length: attempts }, () => placeOrder([{ sku: 'TEST-BASKET', quantity: qty }]))
    );
    const placed = results.filter((r) => r.status === 201).length;
    const after = (await adminProduct('TEST-BASKET')).stockQuantity;

    assert.ok(placed * qty <= before, `${placed} orders of ${qty} placed from a stock of ${before}`);
    assert.ok(after >= 0, `stock went negative: ${after}`);
    // Every accepted order took its stock and no rejected one did.
    assert.equal(after, before - placed * qty);
    assert.ok(placed > 0, `no order went through: ${results.map((r) => r.status).join(',')}`);
  });

  it('a burst of parallel checkouts all succeed with distinct numbers (#24)', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => placeOrder([{ sku: RICE.sku, quantity: 1 }]))
    );
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const orders = results.map((r) => r.body.order);
    assert.equal(new Set(orders.map((o) => o.orderNumber)).size, orders.length);
    assert.equal(new Set(orders.map((o) => o.invoiceNumber)).size, orders.length);
    for (const o of orders) {
      assert.match(o.orderNumber, /^ORD-\d{13}$/);
      assert.match(o.invoiceNumber, /^INV-\d{13}$/);
    }
  });
});
