// POS counter sales and held carts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { adminProduct, fixture } from './helpers/orders.ts';

useTestServer();

const RICE = fixture('TEST-RICE-5KG'); // 450

async function sell(productId: string, quantity: number, extra: Record<string, unknown> = {}) {
  return api(await login('super')).post('/api/pos/sales', {
    items: [{ productId, quantity }],
    payments: [{ method: 'cash', amount: RICE.price * quantity }],
    ...extra,
  });
}

describe('POS sales', () => {
  it('records a cash sale and deducts stock', async () => {
    const rice = await adminProduct(RICE.sku);
    const res = await sell(rice.id, 2);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const o = res.body.order;
    assert.equal(o.source, 'pos');
    assert.equal(o.total, RICE.price * 2);
    assert.equal(o.paymentStatus, 'paid');
    assert.match(o.orderNumber, /^POS-\d{13}$/);
    assert.match(o.invoiceNumber, /^POS-INV-\d{13}$/);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, rice.stockQuantity - 2);
  });

  it('parallel sales all succeed with distinct numbers (#24)', async () => {
    const rice = await adminProduct(RICE.sku);
    const results = await Promise.all(Array.from({ length: 10 }, () => sell(rice.id, 1)));
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const numbers = results.map((r) => r.body.order.invoiceNumber);
    assert.equal(new Set(numbers).size, numbers.length);
  });

  it('parallel holds all succeed with distinct numbers (#24)', async () => {
    const rice = await adminProduct(RICE.sku);
    const token = await login('super');
    const results = await Promise.all(
      Array.from({ length: 10 }, () => api(token).post('/api/pos/holds', { items: [{ productId: rice.id, quantity: 1 }] }))
    );
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const numbers = results.map((r) => r.body.order.orderNumber);
    assert.equal(new Set(numbers).size, numbers.length);
    for (const n of numbers) assert.match(n, /^HOLD-\d{13}$/);
  });
});
