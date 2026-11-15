// GA4 Data API: service-account validation, signed JWT → token exchange,
// runReport requests, caching, error handling, permissions and audit —
// against a local fake of Google's token and Data API endpoints.
import crypto from 'node:crypto';
import http from 'node:http';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA_EMAIL = 'aks-reporting@aks-test.iam.gserviceaccount.com';
const KEY_FILE = JSON.stringify({
  type: 'service_account',
  project_id: 'aks-test',
  private_key_id: 'abc',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  client_email: SA_EMAIL,
});

const reportCalls: { property: string; body: any; auth?: string }[] = [];
let tokenCalls = 0;
let failReports: number | null = null;

const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/token') {
      tokenCalls++;
      const assertion = new URLSearchParams(raw).get('assertion') ?? '';
      const [h, c, sig] = assertion.split('.');
      const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(sig ?? '', 'base64url'));
      const claims = JSON.parse(Buffer.from(c ?? '', 'base64url').toString() || '{}');
      if (!ok || claims.iss !== SA_EMAIL || claims.scope !== 'https://www.googleapis.com/auth/analytics.readonly') {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid JWT signature.' }));
      }
      return res.end(JSON.stringify({ access_token: 'ya29.fake-access-token', expires_in: 3600 }));
    }
    const m = /^\/v1beta\/properties\/(\d+):runReport$/.exec(req.url ?? '');
    if (!m) {
      res.writeHead(404);
      return res.end('{}');
    }
    const body = JSON.parse(raw);
    reportCalls.push({ property: m[1], body, auth: req.headers.authorization });
    if (failReports) {
      res.writeHead(failReports);
      return res.end(JSON.stringify({ error: { message: 'User does not have sufficient permissions for this property.' } }));
    }
    const dim = body.dimensions[0]?.name;
    const v = (...n: number[]) => n.map((x) => ({ value: String(x) }));
    const rows: Record<string, unknown[]> = {
      undefined: body.metrics.length === 1 ? [{ metricValues: v(321) }] : [{ metricValues: v(1000, 800, 600, 450, 20, 40000) }],
      date: [
        { dimensionValues: [{ value: '20261102' }], metricValues: v(600, 500) },
        { dimensionValues: [{ value: '20261101' }], metricValues: v(400, 300) },
      ],
      sessionDefaultChannelGroup: [
        { dimensionValues: [{ value: 'Paid Social' }], metricValues: v(700, 300, 15, 30000) },
        { dimensionValues: [{ value: 'Direct' }], metricValues: v(300, 150, 5, 10000) },
      ],
      sessionSourceMedium: [{ dimensionValues: [{ value: 'facebook / paid_social' }], metricValues: v(700, 15, 30000) }],
      landingPage: [{ dimensionValues: [{ value: '/products/rice' }], metricValues: v(500, 300, 12) }],
      deviceCategory: [{ dimensionValues: [{ value: 'mobile' }], metricValues: v(900, 18) }],
    };
    res.end(JSON.stringify({ rows: rows[String(dim)] ?? [] }));
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();
const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;

for (const k of ['GA4_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID']) delete process.env[k];
process.env.INTEGRATION_ENCRYPTION_KEY = 'c'.repeat(64);
process.env.GA4_OAUTH_TOKEN_URL = `${base}/token`;
process.env.GA4_DATA_API_BASE = base;
process.env.DISABLE_JOBS = 'true';

const server = useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
  staff = api(await login('staff'));
});

const RANGE = 'from=2026-11-01&to=2026-11-02';

describe('GA4 Data API', () => {
  it('reports "not connected" without inventing numbers', async () => {
    const res = await admin.get(`/api/admin/advertising/traffic?${RANGE}`);
    assert.deepEqual(res.body, { connected: false });
    assert.equal(reportCalls.length, 0);
  });

  it('validates the property ID and the key file', async () => {
    assert.equal((await admin.put('/api/admin/advertising/integrations/ga4', { propertyId: 'G-ABC123' })).status, 400);
    assert.equal((await admin.put('/api/admin/advertising/secrets/GA4_SERVICE_ACCOUNT_JSON', { value: '{"type":"authorized_user"}' })).status, 400);
    assert.equal((await admin.put('/api/admin/advertising/secrets/GA4_SERVICE_ACCOUNT_JSON', { value: 'not json at all, definitely' })).status, 400);
    const bad = JSON.stringify({ ...JSON.parse(KEY_FILE), private_key: '-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----' });
    assert.equal((await admin.put('/api/admin/advertising/secrets/GA4_SERVICE_ACCOUNT_JSON', { value: bad })).status, 400);
  });

  it('connects with a signed JWT and builds the traffic report', async () => {
    assert.equal((await admin.put('/api/admin/advertising/integrations/ga4', { propertyId: 'properties/412345678' })).status, 200);
    const saved = await admin.put('/api/admin/advertising/secrets/GA4_SERVICE_ACCOUNT_JSON', { value: KEY_FILE });
    assert.equal(saved.status, 200);
    const status = saved.body.secrets.find((s: any) => s.key === 'GA4_SERVICE_ACCOUNT_JSON');
    assert.equal(status.source, 'admin');
    assert.equal(status.last4, '', 'no fragment of the key is kept as a hint');

    const view = (await admin.get('/api/admin/advertising/integrations')).body;
    assert.deepEqual(view.ga4, { propertyId: '412345678', propertySource: 'admin', serviceAccountEmail: SA_EMAIL, connected: true });
    assert.ok(!JSON.stringify(view).includes('PRIVATE KEY'));

    const test = await admin.post('/api/admin/advertising/integrations/ga4/test');
    assert.equal(test.status, 200);
    assert.equal(test.body.sessionsLast7Days, 321);

    reportCalls.length = 0;
    const res = await admin.get(`/api/admin/advertising/traffic?${RANGE}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(reportCalls.length, 6);
    assert.ok(reportCalls.every((c) => c.property === '412345678' && c.auth === 'Bearer ya29.fake-access-token'));
    assert.deepEqual(reportCalls[0].body.dateRanges, [{ startDate: '2026-11-01', endDate: '2026-11-02' }]);
    assert.equal(tokenCalls, 1, 'the access token is reused');

    const b = res.body;
    assert.deepEqual(b.totals, { sessions: 1000, users: 800, newUsers: 600, engagedSessions: 450, engagementRate: 0.45, purchases: 20, purchaseRevenue: 40000, conversionRate: 0.02 });
    assert.deepEqual(b.daily, [{ day: '2026-11-01', sessions: 400, users: 300 }, { day: '2026-11-02', sessions: 600, users: 500 }]);
    assert.deepEqual(b.channels[0], { channel: 'Paid Social', sessions: 700, engagedSessions: 300, purchases: 15, revenue: 30000 });
    assert.equal(b.landingPages[0].page, '/products/rice');
    assert.equal(b.devices[0].device, 'mobile');
  });

  it('serves repeat views from the cache; refresh=1 refetches', async () => {
    reportCalls.length = 0;
    await admin.get(`/api/admin/advertising/traffic?${RANGE}`);
    assert.equal(reportCalls.length, 0);
    await admin.get(`/api/admin/advertising/traffic?${RANGE}&refresh=1`);
    assert.equal(reportCalls.length, 6);
    const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
    try {
      const rows = await db.ga4ReportCache.findMany();
      assert.equal(rows.length, 6);
      assert.ok(rows.every((r) => r.expiresAt.getTime() - r.fetchedAt.getTime() === 24 * 3600_000), 'past ranges cache for a day');
    } finally {
      await db.$disconnect();
    }
  });

  it('passes GA4 errors through instead of showing numbers', async () => {
    failReports = 403;
    const res = await admin.get('/api/admin/advertising/traffic?from=2026-10-01&to=2026-10-02');
    failReports = null;
    assert.equal(res.status, 502, 'Google refusing is not the admin lacking permission');
    assert.match(res.body.error, /sufficient permissions.*Viewer/);
    assert.equal((await admin.get('/api/admin/advertising/traffic?from=2026-11-05&to=2026-11-01')).status, 400);
  });

  it('requires permissions and audits changes', async () => {
    assert.equal((await staff.get(`/api/admin/advertising/traffic?${RANGE}`)).status, 403);
    assert.equal((await staff.put('/api/admin/advertising/integrations/ga4', { propertyId: '1234567' })).status, 403);
    const logs = (await admin.get('/api/admin/activity?entity=integration')).body.logs;
    assert.ok(logs.some((l: any) => l.action === 'integration.updated' && l.entityId === 'ga4_data'));
    assert.ok(!JSON.stringify(logs).includes('PRIVATE KEY'));
  });
});
