// Admin order management: listing, status changes, cancellation restock, tracking.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { ORDERS } from './helpers/db.ts';
import { adminProduct, placeOrder } from './helpers/orders.ts';

useTestServer();

let admin: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
});

async function stockOf(sku: Parameters<typeof adminProduct>[0]): Promise<number> {
  return (await adminProduct(sku)).stockQuantity;
}

describe('admin order list', () => {
  it('lists the seeded orders', async () => {
    const res = await admin.get('/api/admin/orders');
    assert.equal(res.status, 200);
    const numbers = res.body.orders.map((o: any) => o.orderNumber);
    for (const o of ORDERS) assert.ok(numbers.includes(o.orderNumber), o.orderNumber);
  });

  for (const o of ORDERS) {
    it(`filters by status=${o.status}`, async () => {
      const res = await admin.get(`/api/admin/orders?status=${o.status}`);
      assert.ok(res.body.orders.length >= 1);
      assert.ok(res.body.orders.every((x: any) => x.status === o.status));
    });
  }

  it('returns parsed address and items on the detail view', async () => {
    const list = await admin.get(`/api/admin/orders?search=${ORDERS[1].orderNumber}`);
    const res = await admin.get(`/api/admin/orders/${list.body.orders[0].id}`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.order.customerAddress, 'object');
    assert.equal(res.body.order.items.length, 2);
  });

  it('404s an unknown order', async () => {
    assert.equal((await admin.get('/api/admin/orders/does-not-exist')).status, 404);
  });
});

describe('order status', () => {
  it('moves an order along the lifecycle', async () => {
    const id = (await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }])).body.order.id;
    for (const status of ['confirmed', 'processing', 'packed', 'shipped', 'delivered']) {
      const res = await admin.patch(`/api/admin/orders/${id}`, { status });
      assert.equal(res.status, 200, status);
      assert.equal(res.body.order.status, status);
    }
  });

  it('rejects an unknown status', async () => {
    const id = (await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }])).body.order.id;
    const res = await admin.patch(`/api/admin/orders/${id}`, { status: 'teleported' });
    assert.equal(res.status, 400);
  });

  it('404s a status change on an unknown order', async () => {
    assert.equal((await admin.patch('/api/admin/orders/nope', { status: 'confirmed' })).status, 404);
  });

  it('cancelling restores stock for tracked products', async () => {
    const before = await stockOf('TEST-OIL-1L');
    const id = (await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 3 }])).body.order.id;
    assert.equal(await stockOf('TEST-OIL-1L'), before - 3);

    const res = await admin.patch(`/api/admin/orders/${id}`, { status: 'cancelled' });
    assert.equal(res.status, 200);
    assert.equal(await stockOf('TEST-OIL-1L'), before);

    // Re-sending "cancelled" is not a second cancellation.
    await admin.patch(`/api/admin/orders/${id}`, { status: 'cancelled' });
    assert.equal(await stockOf('TEST-OIL-1L'), before);
  });

  it(
    'reopening and re-cancelling an order does not restock twice',
    { todo: 'BUG: moving a cancelled order back to pending does not re-deduct stock, so a second cancel adds the items again' },
    async () => {
      const before = await stockOf('TEST-BASKET');
      const id = (await placeOrder([{ sku: 'TEST-BASKET', quantity: 1 }])).body.order.id;
      await admin.patch(`/api/admin/orders/${id}`, { status: 'cancelled' });
      await admin.patch(`/api/admin/orders/${id}`, { status: 'pending' });
      await admin.patch(`/api/admin/orders/${id}`, { status: 'cancelled' });
      assert.equal(await stockOf('TEST-BASKET'), before);
    }
  );
});

describe('public order lookup', () => {
  it('tracks an order by code, case-insensitively', async () => {
    const res = await api().get(`/api/orders/track/${ORDERS[0].trackingCode.toLowerCase()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.order.orderNumber, ORDERS[0].orderNumber);
  });

  it('404s an unknown tracking code', async () => {
    assert.equal((await api().get('/api/orders/track/AKS-BD-000000')).status, 404);
  });

  it('re-fetches a placed order by id', async () => {
    const placed = (await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }])).body.order;
    const res = await api().get(`/api/orders/${placed.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.order.total, placed.total);
  });
});
