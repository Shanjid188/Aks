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

  it('changing status between non-cancelled states leaves stock alone', async () => {
    const id = (await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 2 }])).body.order.id;
    const before = await stockOf('TEST-OIL-1L');
    for (const status of ['confirmed', 'processing', 'pending', 'shipped', 'delivered']) {
      assert.equal((await admin.patch(`/api/admin/orders/${id}`, { status })).status, 200, status);
      assert.equal(await stockOf('TEST-OIL-1L'), before, status);
    }
  });
});

describe('reopening a cancelled order', () => {
  const setStatus = (id: string, status: string) => admin.patch(`/api/admin/orders/${id}`, { status });

  it('reopening and re-cancelling an order does not restock twice', async () => {
    const before = await stockOf('TEST-BASKET');
    const id = (await placeOrder([{ sku: 'TEST-BASKET', quantity: 1 }])).body.order.id;
    assert.equal(await stockOf('TEST-BASKET'), before - 1);

    assert.equal((await setStatus(id, 'cancelled')).status, 200);
    assert.equal(await stockOf('TEST-BASKET'), before);
    assert.equal((await setStatus(id, 'pending')).status, 200);
    assert.equal(await stockOf('TEST-BASKET'), before - 1);
    assert.equal((await setStatus(id, 'cancelled')).status, 200);
    assert.equal(await stockOf('TEST-BASKET'), before);
  });

  it('several cancel/reopen cycles always end where they started', async () => {
    const before = await stockOf('TEST-BASKET');
    const id = (await placeOrder([{ sku: 'TEST-BASKET', quantity: 2 }])).body.order.id;
    for (let i = 0; i < 3; i++) {
      await setStatus(id, 'cancelled');
      assert.equal(await stockOf('TEST-BASKET'), before);
      await setStatus(id, 'pending');
      assert.equal(await stockOf('TEST-BASKET'), before - 2);
    }
    await setStatus(id, 'cancelled');
    assert.equal(await stockOf('TEST-BASKET'), before);
  });

  it('reopening straight to a later status also takes the stock back', async () => {
    const before = await stockOf('TEST-OIL-1L');
    const id = (await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 2 }])).body.order.id;
    await setStatus(id, 'cancelled');
    const res = await setStatus(id, 'confirmed');
    assert.equal(res.status, 200);
    assert.equal(res.body.order.status, 'confirmed');
    assert.equal(await stockOf('TEST-OIL-1L'), before - 2);
    await setStatus(id, 'cancelled');
    assert.equal(await stockOf('TEST-OIL-1L'), before);
  });

  it('refuses to reopen when the stock has since been sold, and changes nothing', async () => {
    const start = await stockOf('TEST-POTTERY');
    const first = (await placeOrder([{ sku: 'TEST-POTTERY', quantity: start - 5 }])).body.order.id;
    await setStatus(first, 'cancelled');
    const second = (await placeOrder([{ sku: 'TEST-POTTERY', quantity: 10 }])).body.order.id;
    assert.equal(await stockOf('TEST-POTTERY'), start - 10);

    const res = await setStatus(first, 'pending');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /enough stock/);
    assert.equal(await stockOf('TEST-POTTERY'), start - 10);
    assert.equal((await admin.get(`/api/admin/orders/${first}`)).body.order.status, 'cancelled');

    // Once the stock is back, the reopen goes through.
    await setStatus(second, 'cancelled');
    assert.equal((await setStatus(first, 'pending')).status, 200);
    assert.equal(await stockOf('TEST-POTTERY'), 5);
    await setStatus(first, 'cancelled');
    assert.equal(await stockOf('TEST-POTTERY'), start);
  });

  it('two simultaneous cancels restock only once', async () => {
    const before = await stockOf('TEST-BASKET');
    const id = (await placeOrder([{ sku: 'TEST-BASKET', quantity: 3 }])).body.order.id;
    const results = await Promise.all([setStatus(id, 'cancelled'), setStatus(id, 'cancelled')]);
    for (const r of results) assert.ok([200, 409].includes(r.status), JSON.stringify(r.body));
    assert.equal(await stockOf('TEST-BASKET'), before);
  });

  for (const status of ['refunded', 'returned']) {
    it(`moving a cancelled order to ${status} leaves stock alone (#107)`, async () => {
      const before = await stockOf('TEST-OIL-1L');
      const id = (await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 1 }])).body.order.id;
      await setStatus(id, 'cancelled');
      assert.equal(await stockOf('TEST-OIL-1L'), before);
      const res = await setStatus(id, status);
      assert.equal(res.status, 200);
      assert.equal(res.body.order.status, status);
      assert.equal(await stockOf('TEST-OIL-1L'), before);
    });
  }

  it('a refused reopen rolls back every product, not just the short one', async () => {
    const basket = await stockOf('TEST-BASKET');
    const pottery = await stockOf('TEST-POTTERY');
    const first = (await placeOrder([
      { sku: 'TEST-BASKET', quantity: 1 },
      { sku: 'TEST-POTTERY', quantity: pottery },
    ])).body.order.id;
    await setStatus(first, 'cancelled');
    const second = (await placeOrder([{ sku: 'TEST-POTTERY', quantity: 1 }])).body.order.id;

    const res = await setStatus(first, 'pending');
    assert.equal(res.status, 400);
    assert.equal(await stockOf('TEST-BASKET'), basket, 'basket deduction must be rolled back');
    assert.equal(await stockOf('TEST-POTTERY'), pottery - 1);
    assert.equal((await admin.get(`/api/admin/orders/${first}`)).body.order.status, 'cancelled');
    await setStatus(second, 'cancelled');
  });
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

describe('public order lookups hide personal and internal data (#7)', () => {
  const ADDRESS = {
    fullName: 'Rahim Uddin',
    phone: '01798765432',
    email: 'rahim@test.local',
    division: 'Dhaka',
    district: 'Dhaka',
    thana: 'Gulshan',
    streetAddress: 'House 12, Road 34',
    postalCode: '1212',
    deliveryInstructions: 'Ring the gate bell',
  };
  const INTERNAL = ['adminNote', 'customerEmail', 'customerNote', 'customerId', 'cashierId', 'assignedAdminId', 'paymentReference', 'packedBy', 'heldAt'];

  async function placeWithAddress() {
    const res = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], { customerAddress: ADDRESS });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.order;
  }

  function assertPublic(order: Record<string, any>) {
    for (const key of INTERNAL) assert.ok(!(key in order), `${key} must not be public`);
    const json = JSON.stringify(order);
    for (const secret of [ADDRESS.phone, ADDRESS.email, ADDRESS.streetAddress, ADDRESS.deliveryInstructions, 'Uddin']) {
      assert.ok(!json.includes(secret), `${secret} must not be public`);
    }
    for (const it of order.items) assert.ok(!('unitCost' in it), 'unitCost must not be public');
    assert.deepEqual(order.customerAddress, {
      thana: 'Gulshan',
      district: 'Dhaka',
      division: 'Dhaka',
      fullName: 'Rahim U.',
      phone: '017******32',
    });
  }

  it('tracking returns the masked public shape', async () => {
    const placed = await placeWithAddress();
    const res = await api().get(`/api/orders/track/${placed.trackingCode}`);
    assert.equal(res.status, 200);
    assertPublic(res.body.order);
    assert.equal(res.body.order.status, placed.status);
    assert.equal(res.body.order.total, placed.total);
    assert.equal(res.body.order.items[0].productName, placed.items[0].productName);
  });

  it('the confirmation lookup by id returns the same masked shape', async () => {
    const placed = await placeWithAddress();
    const res = await api().get(`/api/orders/${placed.id}`);
    assert.equal(res.status, 200);
    assertPublic(res.body.order);
    assert.equal(res.body.order.items.length, 1);
  });

  it('placing an order returns the customer their own details, without internal fields', async () => {
    const placed = await placeWithAddress();
    assert.equal(placed.customerPhone, ADDRESS.phone);
    assert.equal(placed.customerAddress.streetAddress, ADDRESS.streetAddress);
    for (const it of placed.items) assert.ok(!('unitCost' in it));
    assert.ok(!('adminNote' in placed));
  });

  it('throttles a client that keeps missing', async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) {
      last = (await api().get(`/api/orders/track/AKS-BD-${String(100000 + i)}`)).status;
    }
    assert.equal(last, 429);
    // A real code is refused too while the client is blocked.
    assert.equal((await api().get(`/api/orders/track/${ORDERS[0].trackingCode}`)).status, 429);
  });
});
