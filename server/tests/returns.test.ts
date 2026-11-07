// Returns: validation against the order, status moves and restocking.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { adminProduct, fixture, placeOrder } from './helpers/orders.ts';

useTestServer();

const RICE = fixture('TEST-RICE-5KG'); // 450
const OIL = fixture('TEST-OIL-1L');

async function admin() {
  return api(await login('super'));
}

/** A paid POS sale of `quantity` rice; POS orders are immediately returnable. */
async function riceSale(quantity: number) {
  const rice = await adminProduct(RICE.sku);
  const res = await (await admin()).post('/api/pos/sales', {
    items: [{ productId: rice.id, quantity }],
    payments: [{ method: 'cash', amount: RICE.price * quantity }],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { order: res.body.order, productId: rice.id as string };
}

async function createReturn(body: Record<string, unknown>) {
  return (await admin()).post('/api/admin/returns', { reason: 'Damaged', ...body });
}

async function setStatus(id: string, status: string) {
  return (await admin()).patch(`/api/admin/returns/${id}`, { status });
}

/** Create a return of `quantity` rice on the order and move it to approved. */
async function approvedReturn(orderId: string, productId: string, quantity = 1) {
  const res = await createReturn({ orderId, productId, quantity });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const id = res.body.returnRequest.id;
  assert.equal((await setStatus(id, 'approved')).status, 200);
  return id as string;
}

describe('creating a return (#101)', () => {
  it('rejects a product that is not on the order', async () => {
    const { order } = await riceSale(1);
    const oil = await adminProduct(OIL.sku);
    const res = await createReturn({ orderId: order.id, productId: oil.id, quantity: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not part of this order/);
  });

  it('rejects more than was sold', async () => {
    const { order, productId } = await riceSale(1);
    const res = await createReturn({ orderId: order.id, productId, quantity: 1000 });
    assert.equal(res.status, 400);
  });

  it('counts earlier returns against what can still be returned', async () => {
    const { order, productId } = await riceSale(2);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 1 })).status, 201);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 2 })).status, 400);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 1 })).status, 201);
    const full = await createReturn({ orderId: order.id, productId, quantity: 1 });
    assert.equal(full.status, 400);
    assert.match(full.body.error, /fully returned/);
  });

  it('frees the quantity of a rejected return', async () => {
    const { order, productId } = await riceSale(1);
    const first = await createReturn({ orderId: order.id, productId, quantity: 1 });
    assert.equal((await setStatus(first.body.returnRequest.id, 'rejected')).status, 200);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 1 })).status, 201);
  });

  it('rejects a fractional or zero quantity', async () => {
    const { order, productId } = await riceSale(2);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 1.5 })).status, 400);
    assert.equal((await createReturn({ orderId: order.id, productId, quantity: 0 })).status, 400);
  });

  it('rejects a return on an order that has not been fulfilled', async () => {
    const placed = await placeOrder([{ sku: RICE.sku, quantity: 1 }]);
    const rice = await adminProduct(RICE.sku);
    const res = await createReturn({ orderId: placed.body.order.id, productId: rice.id, quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('fills in the product name from the order line', async () => {
    const { order, productId } = await riceSale(1);
    const res = await createReturn({ orderId: order.id, productId, quantity: 1 });
    assert.equal(res.body.returnRequest.productName, RICE.name);
  });
});

describe('return status and restocking (#101)', () => {
  it('receiving restocks the returned quantity once', async () => {
    const { order, productId } = await riceSale(2);
    const id = await approvedReturn(order.id, productId, 2);
    const before = (await adminProduct(RICE.sku)).stockQuantity;
    assert.equal((await setStatus(id, 'received')).status, 200);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, before + 2);

    // Receiving again, or going back to approved and re-receiving, does nothing.
    assert.equal((await setStatus(id, 'received')).status, 200);
    assert.equal((await setStatus(id, 'approved')).status, 400);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, before + 2);
  });

  it('parallel "received" requests restock only once', async () => {
    const { order, productId } = await riceSale(1);
    const id = await approvedReturn(order.id, productId, 1);
    const before = (await adminProduct(RICE.sku)).stockQuantity;
    const results = await Promise.all(Array.from({ length: 4 }, () => setStatus(id, 'received')));
    // Late requests either see it already received (no-op) or lose the race (409).
    for (const r of results) assert.ok([200, 409].includes(r.status), String(r.status));
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, before + 1);
  });

  it('cannot skip approval', async () => {
    const { order, productId } = await riceSale(1);
    const res = await createReturn({ orderId: order.id, productId, quantity: 1 });
    const moved = await setStatus(res.body.returnRequest.id, 'received');
    assert.equal(moved.status, 400);
    assert.match(moved.body.error, /cannot move from requested to received/);
  });

  it('a rejected return stays rejected', async () => {
    const { order, productId } = await riceSale(1);
    const res = await createReturn({ orderId: order.id, productId, quantity: 1 });
    const id = res.body.returnRequest.id;
    assert.equal((await setStatus(id, 'rejected')).status, 200);
    assert.equal((await setStatus(id, 'approved')).status, 400);
  });

  it('still updates the note without changing the status', async () => {
    const { order, productId } = await riceSale(1);
    const res = await createReturn({ orderId: order.id, productId, quantity: 1 });
    const id = res.body.returnRequest.id;
    const noted = await (await admin()).patch(`/api/admin/returns/${id}`, { status: 'requested', adminNote: 'Called customer' });
    assert.equal(noted.status, 200);
    assert.equal(noted.body.returnRequest.adminNote, 'Called customer');
  });
});

describe('admin Returns form (#102)', () => {
  it('a return created the way the form sends it restocks when received', async () => {
    const { order, productId } = await riceSale(2);
    const line = order.items[0];
    const created = await (await admin()).post('/api/admin/returns', {
      orderId: order.id,
      productId: line.productId,
      productName: line.productName,
      variant: undefined,
      reason: 'Wrong item',
      quantity: 2,
      refundAmount: undefined,
      refundMethod: 'cash',
      customerNote: undefined,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.returnRequest.productId, productId);

    const id = created.body.returnRequest.id;
    assert.equal((await setStatus(id, 'approved')).status, 200);
    const before = (await adminProduct(RICE.sku)).stockQuantity;
    assert.equal((await setStatus(id, 'received')).status, 200);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, before + 2);
  });
});

describe('refunds (#103)', () => {
  async function refund(id: string, body: Record<string, unknown>) {
    return (await admin()).post(`/api/admin/returns/${id}/refund`, body);
  }
  async function order(id: string) {
    return (await (await admin()).get(`/api/admin/orders/${id}`)).body.order;
  }
  /** A received return of `quantity` rice from a sale of `sold`. */
  async function receivedReturn(sold: number, quantity: number, extra: Record<string, unknown> = {}) {
    const { order: o, productId } = await riceSale(sold);
    const res = await createReturn({ orderId: o.id, productId, quantity, ...extra });
    const id = res.body.returnRequest.id;
    assert.equal((await setStatus(id, 'approved')).status, 200);
    assert.equal((await setStatus(id, 'received')).status, 200);
    return { id, order: o };
  }

  it('cannot refund a return that has not been received', async () => {
    const { order: o, productId } = await riceSale(1);
    const res = await createReturn({ orderId: o.id, productId, quantity: 1 });
    const r = await refund(res.body.returnRequest.id, { amount: 100 });
    assert.equal(r.status, 400);
  });

  it('falls back to the return amount when none is sent', async () => {
    const { id } = await receivedReturn(1, 1, { refundAmount: 100 });
    const r = await refund(id, {});
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.refund.amount, 100);
  });

  it('rejects a missing, zero or non-numeric amount', async () => {
    const { id } = await receivedReturn(1, 1);
    assert.equal((await refund(id, {})).status, 400); // refundAmount defaults to 0
    assert.equal((await refund(id, { amount: 0 })).status, 400);
    assert.equal((await refund(id, { amount: 'abc' })).status, 400);
  });

  it('caps the refund at the value of the returned goods', async () => {
    const { id } = await receivedReturn(2, 1);
    const r = await refund(id, { amount: RICE.price + 1 });
    assert.equal(r.status, 400);
    assert.match(r.body.error, new RegExp(`most that can be refunded for this return is ${RICE.price}`));
  });

  it('refunds a return only once', async () => {
    const { id } = await receivedReturn(1, 1);
    assert.equal((await refund(id, { amount: 100 })).status, 201);
    const again = await refund(id, { amount: 100 });
    assert.equal(again.status, 400);
    assert.match(again.body.error, /already been refunded/);
  });

  it('parallel refunds of one return pay out once', async () => {
    const { id } = await receivedReturn(1, 1);
    const results = await Promise.all(Array.from({ length: 4 }, () => refund(id, { amount: 100 })));
    assert.equal(results.filter((r) => r.status === 201).length, 1, results.map((r) => r.status).join(','));
    for (const r of results) assert.ok([201, 400, 409].includes(r.status), String(r.status));
  });

  it('a partial refund leaves the order as it was', async () => {
    const { id, order: o } = await receivedReturn(2, 1);
    assert.equal((await refund(id, { amount: RICE.price })).status, 201);
    const after = await order(o.id);
    assert.equal(after.status, o.status);
    assert.equal(after.paymentStatus, 'paid');
  });

  it('refunding everything collected marks the order refunded', async () => {
    const { id, order: o } = await receivedReturn(1, 1);
    assert.equal((await refund(id, { amount: RICE.price })).status, 201);
    const after = await order(o.id);
    assert.equal(after.status, 'refunded');
    assert.equal(after.paymentStatus, 'refunded');
  });

  it('a status change cannot mark a return refunded', async () => {
    const { id } = await receivedReturn(1, 1);
    assert.equal((await setStatus(id, 'refunded')).status, 400);
  });
});
