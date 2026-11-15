// Reports → Products: units, refund allocation (targeted + pro-rata), net
// revenue, cost/profit only where cost is known, return rate, channel split,
// GA4 item funnel joined on SKU, permission gating and the daily trend.
import crypto from 'node:crypto';
import http from 'node:http';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';

// Fake Google token + Data API: answers the per-item report only.
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/token') return res.end(JSON.stringify({ access_token: 'ya29.fake', expires_in: 3600 }));
    const body = JSON.parse(raw || '{}');
    const v = (...n: number[]) => n.map((x) => ({ value: String(x) }));
    if (body.dimensions?.[0]?.name !== 'itemId') return res.end(JSON.stringify({ rows: [] }));
    res.end(
      JSON.stringify({
        rows: [
          { dimensionValues: [{ value: 'TEST-RICE-5KG' }], metricValues: v(200, 50, 10) },
          { dimensionValues: [{ value: 'NOT-IN-CATALOG' }], metricValues: v(5, 1, 0) },
        ],
      })
    );
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();
const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
process.env.GA4_OAUTH_TOKEN_URL = `${base}/token`;
process.env.GA4_DATA_API_BASE = base;
process.env.GA4_PROPERTY_ID = '123456789';
process.env.GA4_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  client_email: 'reports@aks-test.iam.gserviceaccount.com',
});
process.env.INTEGRATION_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.DISABLE_JOBS = 'true';

const server = useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;

const AT = new Date('2026-11-10T06:00:00Z'); // 12:00 in Dhaka
const WINDOW = `from=${encodeURIComponent('2026-11-10T00:00:00+06:00')}&to=${encodeURIComponent('2026-11-10T23:59:59+06:00')}`;
const P: Record<string, string> = {};

before(async () => {
  admin = api(await login('super'));
  const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
  try {
    await db.refund.deleteMany();
    await db.returnRequest.deleteMany();
    await db.order.deleteMany();
    for (const p of await db.product.findMany({ select: { id: true, sku: true } })) P[p.sku] = p.id;
    // Basket has no cost price → its profit is unknown, not 0.
    await db.product.update({ where: { id: P['TEST-BASKET'] }, data: { costPrice: null } });

    const item = (sku: string, name: string, qty: number, price: number) => ({ productId: P[sku], productName: name, productSku: sku, size: '', color: '', quantity: qty, price });
    const RICE = (q: number) => item('TEST-RICE-5KG', 'Rice', q, 450);
    const OIL = (q: number) => item('TEST-OIL-1L', 'Oil', q, 280);
    const BASKET = (q: number) => item('TEST-BASKET', 'Basket', q, 650);
    const mk = async (key: string, source: string, status: string, items: ReturnType<typeof item>[], channel?: string) => {
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      return db.order.create({
        data: {
          orderNumber: `PP-${key}`,
          trackingCode: `TRK-PP-${key}`,
          source,
          status,
          customerName: 'PP',
          customerPhone: '01710000010',
          customerEmail: '',
          subtotal: total,
          total,
          createdAt: AT,
          items: { create: items },
          ...(channel ? { attributions: { create: [{ touch: 'last', channel, touchedAt: AT }, { touch: 'first', channel: 'email', touchedAt: AT }] } } : {}),
        },
      });
    };
    const A = await mk('A', 'online', 'pending', [RICE(2), OIL(1)], 'paid_social');
    await db.refund.create({ data: { orderId: A.id, amount: 118 } }); // untargeted → 90 rice, 28 oil
    const B = await mk('B', 'online', 'delivered', [RICE(1)]);
    const ret = await db.returnRequest.create({ data: { orderId: B.id, productId: P['TEST-RICE-5KG'], productName: 'Rice', quantity: 1, reason: 'damaged', status: 'refunded' } });
    await db.refund.create({ data: { orderId: B.id, returnId: ret.id, amount: 450 } });
    await mk('C', 'online', 'cancelled', [OIL(5)]);
    await mk('D', 'online', 'returned', [BASKET(1)]);
    await mk('E', 'pos', 'confirmed', [BASKET(2)]);
    const F = await mk('F', 'online', 'delivered', [OIL(1)]);
    await db.returnRequest.create({ data: { orderId: F.id, productId: P['TEST-OIL-1L'], productName: 'Oil', quantity: 1, reason: 'size', status: 'requested' } });

    const staffRole = await db.role.findUniqueOrThrow({ where: { name: 'Staff' } });
    await db.rolePermission.create({ data: { roleId: staffRole.id, permission: 'reports.view' } });
  } finally {
    await db.$disconnect();
  }
  staff = api(await login('staff'));
});

const row = (body: any, sku: string) => body.rows.find((r: any) => r.sku === sku);

describe('product performance report', () => {
  it('computes units, allocated refunds, net revenue, profit and return rate', async () => {
    const res = await admin.get(`/api/admin/reports/products?${WINDOW}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const b = res.body;

    const rice = row(b, 'TEST-RICE-5KG');
    assert.deepEqual(
      [rice.unitsSold, rice.orders, rice.revenue, rice.refunds, rice.netRevenue, rice.cost, rice.profit],
      [3, 2, 1350, 540, 810, 1140, -330],
      'targeted return refund (450) + pro-rata share (90)'
    );
    assert.deepEqual([rice.unitsOrdered, rice.unitsReturned], [3, 1]);
    assert.equal(rice.returnRate, 1 / 3);

    const oil = row(b, 'TEST-OIL-1L');
    assert.deepEqual([oil.unitsSold, oil.revenue, oil.refunds, oil.netRevenue, oil.profit], [2, 560, 28, 532, 72], 'cancelled order excluded');
    assert.deepEqual([oil.unitsOrdered, oil.unitsReturned, oil.returnRate], [2, 0, 0], 'a requested (not approved) return does not count');

    const basket = row(b, 'TEST-BASKET');
    assert.deepEqual([basket.unitsSold, basket.netRevenue, basket.cost, basket.profit, basket.margin], [2, 1300, null, null, null], 'unknown cost → null, never 0');
    assert.deepEqual([basket.unitsOrdered, basket.unitsReturned], [3, 1], 'a returned order counts all its units as returned');

    assert.equal(b.totals.netRevenue, 2642);
    assert.equal(b.totals.profit, 1342 - 1600);
    assert.equal(b.totals.costCoverage, 1342 / 2642);
    assert.equal(b.totals.orders, 4);
  });

  it('splits net revenue by channel for admins who may see attribution', async () => {
    const b = (await admin.get(`/api/admin/reports/products?${WINDOW}`)).body;
    assert.equal(b.channelsIncluded, true);
    assert.deepEqual(row(b, 'TEST-RICE-5KG').channels, { paid_social: 810, direct: 0 });
    assert.deepEqual(row(b, 'TEST-OIL-1L').channels, { paid_social: 252, direct: 280 });
    assert.deepEqual(row(b, 'TEST-BASKET').channels, { pos: 1300 }, 'POS sales are not "direct"');
    const first = (await admin.get(`/api/admin/reports/products?${WINDOW}&model=first`)).body;
    assert.deepEqual(row(first, 'TEST-OIL-1L').channels, { email: 252, direct: 280 });
  });

  it('joins the GA4 item funnel on SKU, labelled with its fetch time', async () => {
    const b = (await admin.get(`/api/admin/reports/products?${WINDOW}`)).body;
    assert.equal(b.ga4.connected, true);
    assert.ok(b.ga4.fetchedAt);
    assert.equal(b.ga4.unmatchedItems, 1);
    assert.deepEqual(row(b, 'TEST-RICE-5KG').ga4, { viewed: 200, addedToCart: 50, purchased: 10, addToCartRate: 0.25, viewToPurchaseRate: 0.05 });
    assert.equal(row(b, 'TEST-OIL-1L').ga4, undefined, 'no GA4 data → no numbers');
  });

  it('respects basis and source filters', async () => {
    const delivered = (await admin.get(`/api/admin/reports/products?${WINDOW}&basis=delivered`)).body;
    const rice = row(delivered, 'TEST-RICE-5KG');
    assert.deepEqual([rice.unitsSold, rice.revenue, rice.netRevenue], [1, 450, 0]);

    const online = (await admin.get(`/api/admin/reports/products?${WINDOW}&source=online`)).body;
    const basket = row(online, 'TEST-BASKET');
    assert.deepEqual([basket.unitsSold, basket.netRevenue, basket.cost, basket.unitsReturned, basket.returnRate], [0, 0, null, 1, 1]);
  });

  it('hides channel and GA4 columns without advertising permissions', async () => {
    const res = await staff.get(`/api/admin/reports/products?${WINDOW}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.channelsIncluded, false);
    assert.equal(res.body.ga4, null);
    assert.equal(row(res.body, 'TEST-RICE-5KG').channels, undefined);
    assert.equal(row(res.body, 'TEST-RICE-5KG').ga4, undefined);
  });

  it('returns a daily trend for one product and validates input', async () => {
    const res = await admin.get(`/api/admin/reports/products/${P['TEST-RICE-5KG']}/trend?${WINDOW}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.daily, [{ day: '2026-11-10', units: 3, revenue: 1350, netRevenue: 810 }]);
    assert.equal((await admin.get(`/api/admin/reports/products/nope/trend?${WINDOW}`)).status, 404);
    assert.equal((await admin.get('/api/admin/reports/products?from=2026-11-10&to=2026-11-01')).status, 400);
  });
});
