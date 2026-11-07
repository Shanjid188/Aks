// Reports: revenue, refunds and net revenue.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { adminProduct, fixture } from './helpers/orders.ts';

useTestServer();

const RICE = fixture('TEST-RICE-5KG'); // 450

async function admin() {
  return api(await login('super'));
}

async function report() {
  const res = await (await admin()).get('/api/admin/reports?range=7d');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body as { revenue: number; totalRefunds: number; netRevenue: number };
}

/** Sell `sold` rice at the counter, return `returned` of it and refund `amount`. */
async function saleWithRefund(sold: number, returned: number, amount: number) {
  const rice = await adminProduct(RICE.sku);
  const a = await admin();
  const sale = await a.post('/api/pos/sales', {
    items: [{ productId: rice.id, quantity: sold }],
    payments: [{ method: 'cash', amount: RICE.price * sold }],
  });
  assert.equal(sale.status, 201, JSON.stringify(sale.body));
  const ret = await a.post('/api/admin/returns', { orderId: sale.body.order.id, productId: rice.id, quantity: returned, reason: 'Damaged' });
  const id = ret.body.returnRequest.id;
  await a.patch(`/api/admin/returns/${id}`, { status: 'approved' });
  await a.patch(`/api/admin/returns/${id}`, { status: 'received' });
  const refund = await a.post(`/api/admin/returns/${id}/refund`, { amount });
  assert.equal(refund.status, 201, JSON.stringify(refund.body));
}

describe('report refunds (#104)', () => {
  it('a partial refund keeps the sale in revenue and is subtracted once', async () => {
    const before = await report();
    await saleWithRefund(2, 1, RICE.price);
    const after = await report();
    assert.equal(after.revenue, before.revenue + RICE.price * 2);
    assert.equal(after.totalRefunds, before.totalRefunds + RICE.price);
    assert.equal(after.netRevenue, before.netRevenue + RICE.price * 2 - RICE.price);
  });

  it('a full refund drops the sale from revenue without subtracting the refund again', async () => {
    const before = await report();
    await saleWithRefund(1, 1, RICE.price);
    const after = await report();
    assert.equal(after.revenue, before.revenue);
    assert.equal(after.totalRefunds, before.totalRefunds + RICE.price);
    assert.equal(after.netRevenue, before.netRevenue);
  });
});
