// Advertising tracking: Meta Conversions API Purchase on order placement,
// consent gating, hashing, dedup ids, the browser-event relay, retries and
// GA4 refunds — verified against a local fake of the Meta/GA4 endpoints.
import http from 'node:http';
import crypto from 'node:crypto';
import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';

interface Captured {
  path: string;
  query: string;
  body: any;
  raw: string;
}

const captured: Captured[] = [];
/** Status codes to answer with before falling back to 200 (for retry tests). */
let failNext: number[] = [];

const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://fake');
    captured.push({ path: url.pathname, query: url.search, body: raw ? JSON.parse(raw) : null, raw });
    const status = failNext.shift() ?? 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status === 200 ? { events_received: 1 } : { error: { message: 'temporary', code: 2 } }));
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();
const fakeBase = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;

// Read by useTestServer() when it spawns the API.
process.env.NEXT_PUBLIC_META_PIXEL_ID = '1234567890';
process.env.META_CAPI_ACCESS_TOKEN = 'test-capi-token';
process.env.META_TEST_EVENT_CODE = 'TEST123';
process.env.META_GRAPH_API_BASE = fakeBase;
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST';
process.env.GA4_API_SECRET = 'test-ga-secret';
process.env.GA4_MP_ENDPOINT = `${fakeBase}/mp/collect`;

useTestServer();

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const metaCalls = () => captured.filter((c) => c.path.endsWith('/events'));
const gaCalls = () => captured.filter((c) => c.path === '/mp/collect');

async function waitFor<T>(fn: () => T | undefined | false, ms = 8000): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error('timed out waiting for tracking request');
    await new Promise((r) => setTimeout(r, 50));
  }
}
const settle = (ms = 1500) => new Promise((r) => setTimeout(r, ms));

const CONSENTED = {
  consent: { analytics: true, marketing: true },
  fbp: 'fb.1.1700000000000.1234567890',
  fbc: 'fb.1.1700000000000.AbCdEf',
  eventSourceUrl: 'https://www.aksmartbd.com/checkout',
};

let admin: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
});
beforeEach(() => {
  captured.length = 0;
  failNext = [];
});

describe('Meta CAPI Purchase', () => {
  it('sends one hashed, deduplicable Purchase for a consented order', async () => {
    const res = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 2 }], { tracking: CONSENTED });
    assert.equal(res.status, 201);
    const order = res.body.order;

    const call = await waitFor(() => metaCalls()[0]);
    await settle();
    assert.equal(metaCalls().length, 1, 'exactly one CAPI request');

    assert.equal(call.path, '/v26.0/1234567890/events');
    assert.equal(call.query, '', 'access token must not be in the URL');
    assert.equal(call.body.access_token, 'test-capi-token');
    assert.equal(call.body.test_event_code, 'TEST123');

    const ev = call.body.data[0];
    assert.equal(ev.event_name, 'Purchase');
    assert.equal(ev.event_id, `purchase_${order.id}`);
    assert.equal(ev.action_source, 'website');
    assert.equal(ev.event_source_url, CONSENTED.eventSourceUrl);
    assert.equal(ev.custom_data.currency, 'BDT');
    assert.equal(ev.custom_data.value, order.total);
    assert.equal(ev.custom_data.order_id, order.id);
    assert.deepEqual(ev.custom_data.content_ids, ['TEST-RICE-5KG']);
    assert.deepEqual(ev.custom_data.contents, [{ id: 'TEST-RICE-5KG', quantity: 2, item_price: 450 }]);

    const ud = ev.user_data;
    assert.deepEqual(ud.em, [sha('buyer@test.local')]);
    assert.deepEqual(ud.ph, [sha('8801711111111')]);
    assert.deepEqual(ud.fn, [sha('checkout')]);
    assert.deepEqual(ud.ln, [sha('tester')]);
    assert.equal(ud.fbp, CONSENTED.fbp);
    assert.equal(ud.fbc, CONSENTED.fbc);
    assert.ok(ud.client_user_agent, 'user agent forwarded');
    // Loopback test traffic is not a customer IP.
    assert.equal(ud.client_ip_address, undefined);

    // No raw personal data anywhere in the request.
    for (const secret of ['buyer@test.local', '01711111111', 'Checkout Tester']) {
      assert.ok(!call.raw.includes(secret), `raw "${secret}" leaked`);
    }
  });

  it('sends nothing to Meta without marketing consent', async () => {
    const noBlock = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }]);
    const analyticsOnly = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], {
      tracking: { consent: { analytics: true, marketing: false } },
    });
    assert.equal(noBlock.status, 201);
    assert.equal(analyticsOnly.status, 201);
    await settle();
    assert.equal(metaCalls().length, 0);
  });

  it('retries a transient CAPI failure and still sends once', async () => {
    failNext = [500];
    const res = await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 1 }], { tracking: CONSENTED });
    assert.equal(res.status, 201);
    await waitFor(() => metaCalls().length >= 2 && metaCalls());
    await settle(2500);
    const calls = metaCalls();
    assert.equal(calls.length, 2, 'one failure + one successful retry');
    assert.equal(calls[0].body.data[0].event_id, calls[1].body.data[0].event_id);
  });
});

describe('browser event relay (/api/tracking/meta)', () => {
  const relayBody = {
    eventName: 'AddToCart',
    eventId: 'addtocart_abc-123',
    eventSourceUrl: 'https://www.aksmartbd.com/products/test',
    customData: {
      value: 450,
      currency: 'USD',
      contents: [{ id: 'TEST-RICE-5KG', quantity: 1, item_price: 450 }],
      email: 'should-be-dropped@test.local',
    },
    fbp: 'fb.1.1700000000000.1234567890',
    consent: { marketing: true },
  };

  it('forwards an allowed event with the browser event_id', async () => {
    const res = await api().post('/api/tracking/meta', relayBody);
    assert.equal(res.status, 202);
    assert.equal(res.body.accepted, true);
    const call = await waitFor(() => metaCalls()[0]);
    const ev = call.body.data[0];
    assert.equal(ev.event_name, 'AddToCart');
    assert.equal(ev.event_id, 'addtocart_abc-123');
    assert.equal(ev.custom_data.currency, 'BDT', 'currency is always BDT');
    assert.deepEqual(ev.custom_data.content_ids, ['TEST-RICE-5KG']);
    assert.equal(ev.custom_data.email, undefined, 'unknown fields are dropped');
    assert.equal(ev.user_data.em, undefined, 'relay never sends customer identity');
  });

  it('refuses Purchase and unknown events, and anything without consent', async () => {
    assert.equal((await api().post('/api/tracking/meta', { ...relayBody, eventName: 'Purchase' })).status, 400);
    assert.equal((await api().post('/api/tracking/meta', { ...relayBody, eventName: 'Lead' })).status, 400);
    const noConsent = await api().post('/api/tracking/meta', { ...relayBody, consent: { marketing: false } });
    assert.equal(noConsent.body.accepted, false);
    await settle(500);
    assert.equal(metaCalls().length, 0);
  });
});

describe('GA4 refunds', () => {
  it('sends one refund when a consented order is cancelled, even if cancelled again', async () => {
    const res = await placeOrder([{ sku: 'TEST-BASKET', quantity: 1 }], { tracking: CONSENTED });
    const order = res.body.order;
    await waitFor(() => metaCalls()[0]);

    assert.equal((await admin.patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' })).status, 200);
    const call = await waitFor(() => gaCalls()[0]);
    assert.match(call.query, /measurement_id=G-TEST/);
    const ev = call.body.events[0];
    assert.equal(ev.name, 'refund');
    assert.equal(ev.params.transaction_id, order.id);
    assert.equal(ev.params.currency, 'BDT');
    assert.equal(ev.params.value, order.total);

    await admin.patch(`/api/admin/orders/${order.id}`, { status: 'pending' });
    await admin.patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' });
    await settle();
    assert.equal(gaCalls().length, 1, 'refund is sent once per order');
  });

  it('sends no refund for an order GA4 never saw (no analytics consent)', async () => {
    const res = await placeOrder([{ sku: 'TEST-BASKET', quantity: 1 }]);
    assert.equal((await admin.patch(`/api/admin/orders/${res.body.order.id}`, { status: 'cancelled' })).status, 200);
    await settle();
    assert.equal(gaCalls().length, 0);
  });
});
