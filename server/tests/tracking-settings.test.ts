// Admin → Advertising → Tracking Settings: runtime IDs, encrypted write-only
// secrets, precedence (env → admin → off), switches, health, retry, test event.
import http from 'node:http';
import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';

interface Captured {
  path: string;
  body: any;
}
const captured: Captured[] = [];
let failNext: number[] = [];

const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    captured.push({ path: new URL(req.url ?? '/', 'http://fake').pathname, body: raw ? JSON.parse(raw) : null });
    const status = failNext.shift() ?? 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    // 400 with a non-transient code: the send fails without retries.
    res.end(JSON.stringify(status === 200 ? { events_received: 1 } : { error: { message: 'Invalid parameter', code: 100 } }));
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();
const fakeBase = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;

// No tracking IDs in the environment: everything below is admin-configured,
// except the test event code, which proves the environment wins.
for (const k of ['NEXT_PUBLIC_META_PIXEL_ID', 'META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN', 'NEXT_PUBLIC_GA_MEASUREMENT_ID', 'GA_MEASUREMENT_ID', 'GA4_API_SECRET']) {
  delete process.env[k];
}
process.env.INTEGRATION_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.META_GRAPH_API_BASE = fakeBase;
process.env.META_TEST_EVENT_CODE = 'ENVCODE';

const server = useTestServer();
const TOKEN = 'EAAB-admin-stored-capi-token-9876';
const CONSENTED = { consent: { analytics: true, marketing: true } };

let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
  staff = api(await login('staff'));
});
beforeEach(() => {
  captured.length = 0;
  failNext = [];
});

const metaCalls = () => captured.filter((c) => c.path.endsWith('/events'));
async function waitFor<T>(fn: () => T | undefined | false, ms = 8000): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}
const settle = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

describe('tracking settings', () => {
  it('is off until configured, and requires permissions', async () => {
    assert.deepEqual((await api().get('/api/tracking/config')).body, { metaPixelId: null, ga4MeasurementId: null, metaEnabled: true, ga4Enabled: true });
    assert.equal((await staff.get('/api/admin/advertising/tracking')).status, 403);
    assert.equal((await staff.put('/api/admin/advertising/tracking', { metaPixelId: '1234567890' })).status, 403);
    assert.equal((await staff.put(`/api/admin/advertising/secrets/META_CAPI_ACCESS_TOKEN`, { value: 'x'.repeat(20) })).status, 403);
  });

  it('validates and saves public IDs, which the storefront reads at runtime', async () => {
    assert.equal((await admin.put('/api/admin/advertising/tracking', { metaPixelId: 'abc' })).status, 400);
    assert.equal((await admin.put('/api/admin/advertising/tracking', { ga4MeasurementId: 'UA-1' })).status, 400);
    const res = await admin.put('/api/admin/advertising/tracking', { metaPixelId: '1234567890', ga4MeasurementId: 'g-abc123', metaTestEventCode: 'ADMINCODE' });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pixelIdSource, 'admin');
    assert.equal(res.body.ga4.measurementId, 'G-ABC123');
    assert.equal(res.body.meta.testEventCode, 'ENVCODE', 'environment wins over admin');
    assert.equal(res.body.meta.testEventCodeSource, 'env');
    assert.equal(res.body.meta.capiActive, false, 'no token yet');
    assert.deepEqual((await api().get('/api/tracking/config')).body, { metaPixelId: '1234567890', ga4MeasurementId: 'G-ABC123', metaEnabled: true, ga4Enabled: true });
  });

  it('stores secrets encrypted and never returns them', async () => {
    const put = await admin.put('/api/admin/advertising/secrets/META_CAPI_ACCESS_TOKEN', { value: TOKEN });
    assert.equal(put.status, 200);
    const view = await admin.get('/api/admin/advertising/tracking');
    assert.equal(view.body.meta.capiActive, true);
    const status = view.body.secrets.find((s: any) => s.key === 'META_CAPI_ACCESS_TOKEN');
    assert.equal(status.source, 'admin');
    assert.equal(status.last4, '9876');

    const everything = JSON.stringify([put.body, view.body, (await admin.get('/api/admin/activity')).body, (await admin.get('/api/admin/settings')).body, (await api().get('/api/settings/public')).body, (await api().get('/api/tracking/config')).body]);
    assert.ok(!everything.includes(TOKEN), 'plaintext secret leaked in a response or the audit log');

    const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
    try {
      const row = await db.integrationSecret.findUniqueOrThrow({ where: { key: 'META_CAPI_ACCESS_TOKEN' } });
      assert.ok(!JSON.stringify(row).includes(TOKEN), 'secret stored in plaintext');
    } finally {
      await db.$disconnect();
    }
    assert.equal((await admin.put('/api/admin/advertising/secrets/NOT_A_SECRET', { value: 'x' })).status, 404);
  });

  it('uses the stored token for the Conversions API', async () => {
    const res = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], { tracking: CONSENTED });
    assert.equal(res.status, 201);
    const call = await waitFor(() => metaCalls()[0]);
    assert.equal(call.body.access_token, TOKEN);
    assert.equal(call.body.test_event_code, 'ENVCODE');
  });

  it('switching Meta off stops the Pixel ID and CAPI', async () => {
    await admin.put('/api/admin/advertising/tracking', { metaEnabled: false });
    assert.equal((await api().get('/api/tracking/config')).body.metaPixelId, null);
    await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], { tracking: CONSENTED });
    await settle();
    assert.equal(metaCalls().length, 0);
    await admin.put('/api/admin/advertising/tracking', { metaEnabled: true });
  });

  it('reports failures and retries each failed send exactly once', async () => {
    failNext = [400];
    const res = await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 1 }], { tracking: CONSENTED });
    const orderId = res.body.order.id;
    await waitFor(() => metaCalls()[0]);
    await settle(500);

    const health = await admin.get('/api/admin/advertising/tracking/health');
    const failure = health.body.failures.find((f: any) => f.orderId === orderId);
    assert.ok(failure, 'failure listed');
    assert.equal(failure.retryable, true);
    assert.match(failure.lastError, /HTTP 400/);
    assert.ok(health.body.channels.find((c: any) => c.channel === 'meta_capi').last24h.failed >= 1);

    captured.length = 0;
    const [a, b] = await Promise.all([
      admin.post('/api/admin/advertising/tracking/retry', { ids: [failure.id] }),
      admin.post('/api/admin/advertising/tracking/retry', { ids: [failure.id] }),
    ]);
    assert.equal(a.body.sent + b.body.sent, 1, 'concurrent retries send once');
    assert.equal(metaCalls().length, 1);
    assert.equal(metaCalls()[0].body.data[0].event_id, `purchase_${orderId}`);
    assert.equal((await admin.post('/api/admin/advertising/tracking/retry', { ids: [failure.id] })).body.sent, 0);
  });

  it('sends a test event with the test event code', async () => {
    const res = await admin.post('/api/admin/advertising/tracking/test-event');
    assert.equal(res.status, 200);
    const call = await waitFor(() => metaCalls()[0]);
    assert.equal(call.body.test_event_code, 'ENVCODE');
    assert.match(call.body.data[0].event_id, /^admintest_/);
    assert.equal(call.body.data[0].user_data.em, undefined, 'no personal data in test events');
  });

  it('clearing the secret turns CAPI off', async () => {
    assert.equal((await admin.delete('/api/admin/advertising/secrets/META_CAPI_ACCESS_TOKEN')).status, 200);
    assert.equal((await admin.get('/api/admin/advertising/tracking')).body.meta.capiActive, false);
    const log = (await admin.get('/api/admin/activity?entity=integration_secret')).body.logs;
    assert.deepEqual(log.map((l: any) => l.action).sort(), ['secret.cleared', 'secret.updated']);
  });
});
