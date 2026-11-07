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

describe('POS held carts (#87)', () => {
  async function hold(productId: string, quantity: number, extra: Record<string, unknown> = {}) {
    const res = await api(await login('super')).post('/api/pos/holds', { items: [{ productId, quantity }], ...extra });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.order;
  }
  async function holdIds(): Promise<string[]> {
    const res = await api(await login('super')).get('/api/pos/holds');
    return res.body.holds.map((h: any) => h.id);
  }
  async function stats() {
    return (await api(await login('super')).get('/api/admin/stats')).body;
  }

  it('a sale completed from a resumed hold removes the hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const h = await hold(rice.id, 2);
    assert.ok((await holdIds()).includes(h.id));

    const before = await stats();
    const sale = await sell(rice.id, 2, { holdId: h.id });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    assert.ok(!(await holdIds()).includes(h.id));
    const after = await stats();
    // The hold (pending) is gone and the sale (confirmed) is the only new order.
    assert.equal(after.pendingOrdersCount, before.pendingOrdersCount - 1);
    assert.equal(after.ordersCount, before.ordersCount);
  });

  it('a sale never deletes a real order passed as holdId', async () => {
    const rice = await adminProduct(RICE.sku);
    const first = (await sell(rice.id, 1)).body.order;
    const res = await sell(rice.id, 1, { holdId: first.id });
    assert.equal(res.status, 201);
    const detail = await api(await login('super')).get(`/api/admin/orders/${first.id}`);
    assert.equal(detail.status, 200);
  });

  it('holding a resumed cart again replaces the earlier hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const first = await hold(rice.id, 1);
    const second = await hold(rice.id, 3, { holdId: first.id });
    const ids = await holdIds();
    assert.ok(!ids.includes(first.id));
    assert.ok(ids.includes(second.id));
  });

  it('a hold released by an older admin build can still be listed and discarded', async () => {
    const rice = await adminProduct(RICE.sku);
    const token = await login('super');
    const h = await hold(rice.id, 1);
    // Older admin builds clear heldAt when a hold is resumed.
    await api(token).patch(`/api/pos/holds/${h.id}`, { held: false });
    assert.ok((await holdIds()).includes(h.id));

    const del = await api(token).delete(`/api/pos/holds/${h.id}`);
    assert.equal(del.status, 200, JSON.stringify(del.body));
    assert.ok(!(await holdIds()).includes(h.id));
  });

  it('discarding refuses an order that is not a hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const sale = (await sell(rice.id, 1)).body.order;
    const del = await api(await login('super')).delete(`/api/pos/holds/${sale.id}`);
    assert.equal(del.status, 404);
  });
});
