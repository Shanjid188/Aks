// Courier booking (Steadfast): the গাড়ি button's booking endpoint, duplicate
// protection, COD amounts, failure handling, webhook auth + status moves, the
// status sync, and the manual-handoff fallback — against a local fake of the
// Steadfast merchant API.
import http from 'node:http';
import { afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';

const API_KEY = 'sf-test-api-key-123456';
const SECRET_KEY = 'sf-test-secret-key-654321';
const WEBHOOK_TOKEN = 'webhook-token-0123456789abcdef';

interface Call { method: string; path: string; headers: http.IncomingHttpHeaders; body: any }
const calls: Call[] = [];
/** invoice → consignment id, for everything the fake has "booked". */
const booked = new Map<string, number>();
/** consignment id → delivery_status reported by status_by_cid. */
const statuses = new Map<string, string>();
let nextCid = 5000;
let createMode: 'ok' | 'error500-after-booking' | 'slow' = 'ok';

const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', async () => {
    const body = raw ? JSON.parse(raw) : null;
    const path = (req.url ?? '').replace(/^\/api\/v1/, '');
    calls.push({ method: req.method!, path, headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers['api-key'] !== API_KEY || req.headers['secret-key'] !== SECRET_KEY) {
      res.writeHead(401);
      return res.end(JSON.stringify({ status: 401, message: 'Unauthorized' }));
    }
    if (req.method === 'POST' && path === '/create_order') {
      if (booked.has(body.invoice)) {
        res.writeHead(422);
        return res.end(JSON.stringify({ status: 422, message: 'The given data was invalid.', errors: { invoice: ['The invoice has already been taken.'] } }));
      }
      const cid = nextCid++;
      booked.set(body.invoice, cid);
      statuses.set(String(cid), 'in_review');
      if (createMode === 'error500-after-booking') {
        res.writeHead(500);
        return res.end('<html>Server Error</html>');
      }
      if (createMode === 'slow') await new Promise((r) => setTimeout(r, 400));
      return res.end(
        JSON.stringify({
          status: 200,
          message: 'Consignment has been created successfully.',
          consignment: {
            consignment_id: cid,
            invoice: body.invoice,
            tracking_code: `TRK${cid}`,
            tracking_link: `https://steadfast.com.bd/t/link${cid}`,
            recipient_name: body.recipient_name,
            cod_amount: body.cod_amount,
            status: 'in_review',
          },
        })
      );
    }
    let m = /^\/status_by_cid\/(\w+)$/.exec(path);
    if (m) return res.end(JSON.stringify({ status: 200, delivery_status: statuses.get(m[1]) ?? 'unknown' }));
    m = /^\/trackings_by_invoice\/(.+)$/.exec(path);
    if (m) {
      const cid = booked.get(decodeURIComponent(m[1]));
      return res.end(JSON.stringify({ status: 200, tracking: cid ? [{ id: 1, consignment_id: cid, text: 'Booked' }] : [] }));
    }
    if (path === '/get_balance') return res.end(JSON.stringify({ status: 200, current_balance: 1234.5 }));
    res.writeHead(404);
    res.end('{}');
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();

process.env.STEADFAST_BASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/api/v1`;
process.env.STEADFAST_API_KEY = API_KEY;
process.env.STEADFAST_SECRET_KEY = SECRET_KEY;
process.env.STEADFAST_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
process.env.DISABLE_JOBS = 'true';

const server = useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
let db: PrismaClient;
before(async () => {
  admin = api(await login('super'));
  staff = api(await login('staff'));
  db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
});
// Windows keeps the SQLite file locked while a client is connected, which
// would block the temp-database cleanup — Prisma reconnects on the next query.
afterEach(async () => {
  await db?.$disconnect();
});

const creates = () => calls.filter((c) => c.path === '/create_order');

/** Place a storefront order and pack it so it sits on the Shipped page. */
async function shippedOrder(extra?: Record<string, unknown>): Promise<any> {
  const placed = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 2 }], extra);
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const id = placed.body.order.id;
  const packed = await admin.patch(`/api/admin/packaging/${id}`, { packedStatus: 'packed' });
  assert.equal(packed.status, 200);
  assert.equal(packed.body.order.status, 'shipped');
  return packed.body.order;
}

function webhook(body: unknown, token: string | null = WEBHOOK_TOKEN) {
  return fetch(`${server.baseUrl}/api/webhooks/courier/steadfast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

describe('courier disabled (default)', () => {
  it('reports inactive and refuses to book', async () => {
    const s = await admin.get('/api/admin/courier/status');
    assert.equal(s.status, 200);
    assert.equal(s.body.active, false);
    assert.equal(s.body.configured, true);
    const order = await shippedOrder();
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'courier_inactive');
    assert.equal(creates().length, 0);
  });

  it('keeps the manual handoff working exactly as before', async () => {
    const order = await shippedOrder();
    const res = await admin.patch(`/api/admin/packaging/${order.id}`, { packedStatus: 'shipped', dispatched: true });
    assert.equal(res.status, 200);
    assert.ok(res.body.order.dispatchedAt);
    assert.equal(res.body.order.courierConsignmentId, null);
    const done = await admin.patch(`/api/admin/orders/${order.id}`, { status: 'delivered' });
    assert.equal(done.status, 200);
    assert.equal(creates().length, 0);
  });
});

describe('courier configuration', () => {
  it('staff without settings permission cannot read or change it', async () => {
    assert.equal((await staff.get('/api/admin/courier/config')).status, 403);
    assert.equal((await staff.put('/api/admin/courier/config', { enabled: true })).status, 403);
  });

  it('rejects an unknown provider and a non-boolean flag', async () => {
    assert.equal((await admin.put('/api/admin/courier/config', { provider: 'nope' })).status, 400);
    assert.equal((await admin.put('/api/admin/courier/config', { enabled: 'yes' })).status, 400);
  });

  it('enables booking and never returns secret values', async () => {
    const res = await admin.put('/api/admin/courier/config', { enabled: true, provider: 'steadfast' });
    assert.equal(res.status, 200);
    assert.equal(res.body.active, true);
    assert.equal(res.body.webhookPath, '/api/webhooks/courier/steadfast');
    assert.deepEqual(res.body.secrets.map((s: any) => s.key).sort(), ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY', 'STEADFAST_WEBHOOK_TOKEN']);
    assert.ok(res.body.secrets.every((s: any) => s.source === 'env'));
    const text = JSON.stringify(res.body);
    for (const v of [API_KEY, SECRET_KEY, WEBHOOK_TOKEN]) assert.ok(!text.includes(v));
    assert.equal((await admin.get('/api/admin/courier/status')).body.active, true);
  });

  it('tests the connection with a read-only balance call', async () => {
    const res = await admin.post('/api/admin/courier/test');
    assert.equal(res.status, 200);
    assert.equal(res.body.balance, 1234.5);
    assert.equal(creates().length, 0);
  });
});

describe('booking (গাড়ি)', () => {
  it('sends the order to Steadfast and stores the consignment', async () => {
    const order = await shippedOrder({
      customerAddress: { fullName: 'Rahim Uddin', phone: '+880 1712-345678', email: 'r@test.local', streetAddress: 'House 5, Road 3', thana: 'Dhanmondi', district: 'Dhaka', deliveryInstructions: 'Call first' },
    });
    const before = creates().length;
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.outcome, 'booked');
    assert.equal(creates().length, before + 1);

    const sent = creates().at(-1)!;
    assert.equal(sent.headers['content-type'], 'application/json');
    assert.equal(sent.body.invoice, order.orderNumber);
    assert.equal(sent.body.recipient_phone, '01712345678');
    assert.equal(sent.body.recipient_address, 'House 5, Road 3, Dhanmondi, Dhaka');
    assert.equal(sent.body.cod_amount, Math.round(order.total)); // COD: the full due
    assert.equal(typeof sent.body.cod_amount, 'number');
    assert.match(sent.body.note, /Call first/);
    assert.match(sent.body.item_description, /Test Miniket Rice 5kg x2/);

    const o = res.body.order;
    assert.equal(o.courierProvider, 'steadfast');
    assert.ok(o.courierConsignmentId);
    assert.equal(o.courierTrackingCode, `TRK${o.courierConsignmentId}`);
    assert.equal(o.courierStatus, 'in_review');
    assert.equal(o.courierCodAmount, Math.round(order.total));
    assert.ok(o.courierBookedAt);
    assert.ok(o.dispatchedAt, 'booking is the courier handoff');
    assert.equal(o.status, 'shipped');
    assert.equal(o.paymentStatus, 'unpaid');
  });

  it('never books the same order twice', async () => {
    const order = await shippedOrder();
    await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    const before = creates().length;
    const again = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(again.status, 200);
    assert.equal(again.body.outcome, 'already_booked');
    assert.equal(creates().length, before);
  });

  it('lets only one of several concurrent clicks reach the courier', async () => {
    const order = await shippedOrder();
    createMode = 'slow';
    try {
      const before = creates().length;
      const results = await Promise.all([1, 2, 3, 4].map(() => admin.post(`/api/admin/orders/${order.id}/courier/book`)));
      assert.equal(creates().length, before + 1);
      const statusesSeen = results.map((r) => r.status).sort();
      assert.equal(results.filter((r) => r.status === 200 && r.body.outcome === 'booked').length, 1);
      assert.ok(statusesSeen.every((s) => s === 200 || s === 409), String(statusesSeen));
    } finally {
      createMode = 'ok';
    }
  });

  it('sends cod_amount 0 for prepaid (bKash) orders', async () => {
    const order = await shippedOrder();
    await db.order.update({ where: { id: order.id }, data: { paymentMethod: 'bkash', paymentReference: 'TRX123' } });
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 200);
    assert.equal(creates().at(-1)!.body.cod_amount, 0);
    assert.equal(res.body.order.courierCodAmount, 0);
  });

  it('sends only the outstanding due for a partly paid COD order', async () => {
    const order = await shippedOrder();
    await db.order.update({ where: { id: order.id }, data: { paidAmount: 200, dueAmount: order.total - 200, paymentStatus: 'partial' } });
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 200);
    assert.equal(creates().at(-1)!.body.cod_amount, Math.round(order.total - 200));
  });

  it('validates the phone before calling the courier', async () => {
    const order = await shippedOrder();
    await db.order.update({ where: { id: order.id }, data: { customerPhone: '12345' } });
    const before = creates().length;
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 422);
    assert.match(res.body.error, /phone/);
    assert.equal(creates().length, before);
  });

  it('refuses orders that are not shipped, and store pickups', async () => {
    const placed = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }]);
    const res = await admin.post(`/api/admin/orders/${placed.body.order.id}/courier/book`);
    assert.equal(res.status, 400);
    const pickup = await shippedOrder();
    await db.order.update({ where: { id: pickup.id }, data: { deliveryMethod: 'pickup' } });
    assert.equal((await admin.post(`/api/admin/orders/${pickup.id}/courier/book`)).status, 400);
  });

  it('marks an ambiguous failure as unconfirmed and recovers it on retry without a second parcel', async () => {
    const order = await shippedOrder();
    createMode = 'error500-after-booking';
    let res;
    try {
      res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    } finally {
      createMode = 'ok';
    }
    assert.equal(res.status, 502);
    let row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.courierStatus, 'unconfirmed');
    assert.ok(row.courierError);
    assert.equal(row.dispatchedAt, null, 'handoff not recorded until the booking is confirmed');

    const retry = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(retry.status, 200, JSON.stringify(retry.body));
    assert.equal(retry.body.outcome, 'recovered');
    row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.courierConsignmentId, String(booked.get(order.orderNumber)));
    assert.equal(row.courierError, null);
    assert.ok(row.dispatchedAt);
    assert.equal([...booked.keys()].filter((k) => k === order.orderNumber).length, 1);
  });

  it('requires shipping or packing permission', async () => {
    const order = await shippedOrder();
    assert.equal((await staff.post(`/api/admin/orders/${order.id}/courier/book`)).status, 403);
  });

  it('records the booking in the audit log', async () => {
    const res = await admin.get('/api/admin/activity?limit=200');
    const logs = (res.body.logs ?? res.body.activity ?? res.body.items ?? []) as any[];
    assert.ok(logs.some((l) => l.action === 'courier.booked'), 'courier.booked audit entry');
  });
});

describe('status updates', () => {
  async function bookedOrder(): Promise<any> {
    const order = await shippedOrder();
    const res = await admin.post(`/api/admin/orders/${order.id}/courier/book`);
    assert.equal(res.status, 200);
    return res.body.order;
  }

  it('rejects webhooks without the right bearer token', async () => {
    const o = await bookedOrder();
    const payload = { notification_type: 'delivery_status', consignment_id: Number(o.courierConsignmentId), invoice: o.orderNumber, status: 'delivered' };
    assert.equal((await webhook(payload, null)).status, 401);
    assert.equal((await webhook(payload, 'wrong-token-wrong-token')).status, 401);
    const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(row.status, 'shipped');
  });

  it('a delivered webhook marks the order delivered but leaves payment alone', async () => {
    const o = await bookedOrder();
    const res = await webhook({
      notification_type: 'delivery_status',
      consignment_id: Number(o.courierConsignmentId),
      invoice: o.orderNumber,
      cod_amount: o.total,
      status: 'delivered',
      delivery_charge: 60,
      tracking_message: 'Delivered to customer',
      updated_at: '2026-11-15 12:45:30',
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'success', message: 'Webhook received successfully.' });
    const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(row.status, 'delivered');
    assert.equal(row.courierStatus, 'delivered');
    assert.equal(row.paymentStatus, 'unpaid');
    assert.equal(row.paidAmount, 0);
    const audit = await db.auditLog.findFirst({ where: { entityId: o.id, action: 'order.status.changed' } });
    assert.ok(audit);
    assert.match(audit!.adminName ?? '', /Steadfast Courier \(webhook\)/);
  });

  it('a cancelled webhook marks the order returned (stock untouched, like the manual Return)', async () => {
    const o = await bookedOrder();
    const stockBefore = (await db.product.findFirstOrThrow({ where: { sku: 'TEST-RICE-5KG' } })).stockQuantity;
    await webhook({ notification_type: 'delivery_status', consignment_id: o.courierConsignmentId, invoice: o.orderNumber, status: 'cancelled' });
    const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(row.status, 'returned');
    const stockAfter = (await db.product.findFirstOrThrow({ where: { sku: 'TEST-RICE-5KG' } })).stockQuantity;
    assert.equal(stockAfter, stockBefore);
  });

  it('in-transit statuses and tracking updates only update the courier status', async () => {
    const o = await bookedOrder();
    await webhook({ notification_type: 'delivery_status', consignment_id: o.courierConsignmentId, invoice: o.orderNumber, status: 'delivered_approval_pending' });
    let row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(row.status, 'shipped');
    assert.equal(row.courierStatus, 'delivered_approval_pending');
    const t = await webhook({ notification_type: 'tracking_update', consignment_id: o.courierConsignmentId, invoice: o.orderNumber, tracking_message: 'At hub' });
    assert.equal(t.status, 200);
    row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(row.courierStatus, 'delivered_approval_pending');
  });

  it('acknowledges unknown consignments and rejects malformed payloads', async () => {
    assert.equal((await webhook({ consignment_id: 999999, status: 'delivered' })).status, 200);
    assert.equal((await webhook({ hello: 'world' })).status, 400);
  });

  it('a repeated webhook is harmless', async () => {
    const o = await bookedOrder();
    const p = { notification_type: 'delivery_status', consignment_id: o.courierConsignmentId, invoice: o.orderNumber, status: 'delivered' };
    assert.equal((await webhook(p)).status, 200);
    assert.equal((await webhook(p)).status, 200);
    const changes = await db.auditLog.count({ where: { entityId: o.id, action: 'order.status.changed' } });
    assert.equal(changes, 1);
  });

  it('the status sync moves orders the courier finished and skips ones an admin already moved', async () => {
    const a = await bookedOrder();
    const b = await bookedOrder();
    statuses.set(a.courierConsignmentId, 'partial_delivered');
    statuses.set(b.courierConsignmentId, 'cancelled');
    // Admin marks b delivered by hand before the sync runs — that wins.
    assert.equal((await admin.patch(`/api/admin/orders/${b.id}`, { status: 'delivered' })).status, 200);
    const res = await admin.post('/api/admin/courier/sync');
    assert.equal(res.status, 200);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: a.id } })).status, 'delivered');
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: b.id } })).status, 'delivered');
  });

  it('refreshes a single order on demand', async () => {
    const o = await bookedOrder();
    statuses.set(o.courierConsignmentId, 'hold');
    const res = await admin.post(`/api/admin/orders/${o.id}/courier/sync`);
    assert.equal(res.status, 200);
    assert.equal(res.body.order.courierStatus, 'hold');
    assert.equal(res.body.order.status, 'shipped');
  });

  it('manual Delivery and Return still work on booked orders', async () => {
    const a = await bookedOrder();
    const b = await bookedOrder();
    assert.equal((await admin.patch(`/api/admin/orders/${a.id}`, { status: 'delivered' })).body.order.status, 'delivered');
    assert.equal((await admin.patch(`/api/admin/orders/${b.id}`, { status: 'returned' })).body.order.status, 'returned');
  });

  it('public tracking shows the courier tracking code but never internal errors', async () => {
    const o = await bookedOrder();
    await db.order.update({ where: { id: o.id }, data: { courierError: 'internal detail' } });
    const res = await api().get(`/api/orders/track/${o.trackingCode}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.order.courierTrackingCode, o.courierTrackingCode);
    assert.equal('courierError' in res.body.order, false);
  });
});
