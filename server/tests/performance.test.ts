// Campaign performance: attributed net revenue × ad spend, defaults (booked,
// last touch, online only), model/basis/source switches, null ratios on zero
// denominators, and spend hidden without advertising.spend_view.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';

process.env.DISABLE_JOBS = 'true';
const server = useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;

const AT = new Date('2026-11-10T06:00:00Z'); // 12:00 in Dhaka
const WINDOW = `from=${encodeURIComponent('2026-11-10T00:00:00+06:00')}&to=${encodeURIComponent('2026-11-10T23:59:59+06:00')}`;
let M = '';
let G = '';

before(async () => {
  admin = api(await login('super')); // waits for the server (and its database)
  const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
  try {
    await db.refund.deleteMany();
    await db.order.deleteMany();
    M = (await db.marketingCampaign.create({ data: { name: 'Meta Winter', channel: 'meta', platform: 'meta', platformCampaignId: 'M1' } })).id;
    G = (await db.marketingCampaign.create({ data: { name: 'Google Search', channel: 'google', platform: 'google', platformCampaignId: 'G1' } })).id;
    const touch = (t: 'first' | 'last', campaignId: string | null, channel: string) => ({ touch: t, campaignId, channel, touchedAt: AT });
    const orders = [
      { key: 'O1', source: 'online', status: 'pending', total: 1000, touches: [touch('last', M, 'paid_social'), touch('first', G, 'paid_search')] },
      { key: 'O2', source: 'online', status: 'delivered', total: 2000, refund: 500, touches: [touch('last', M, 'paid_social'), touch('first', M, 'paid_social')] },
      { key: 'O3', source: 'online', status: 'cancelled', total: 300, touches: [touch('last', M, 'paid_social'), touch('first', M, 'paid_social')] },
      { key: 'O4', source: 'online', status: 'confirmed', total: 600, touches: [] },
      { key: 'O5', source: 'pos', status: 'confirmed', total: 400, touches: [touch('last', G, 'paid_search'), touch('first', G, 'paid_search')] },
      { key: 'O6', source: 'online', status: 'refunded', total: 800, refund: 800, touches: [touch('last', G, 'paid_search'), touch('first', G, 'paid_search')] },
    ];
    for (const o of orders) {
      const created = await db.order.create({
        data: {
          orderNumber: `PERF-${o.key}`,
          trackingCode: `TRK-PERF-${o.key}`,
          source: o.source,
          status: o.status,
          customerName: 'Perf',
          customerPhone: '01710000009',
          customerEmail: '',
          subtotal: o.total,
          total: o.total,
          createdAt: AT,
          attributions: { create: o.touches },
        },
      });
      if (o.refund) await db.refund.create({ data: { orderId: created.id, amount: o.refund } });
    }
    const day = new Date('2026-11-10T00:00:00Z');
    await db.adSpendEntry.createMany({
      data: [
        { date: day, platform: 'meta', campaignId: M, campaignName: 'Meta Winter', currency: 'BDT', amount: 1000, impressions: 10000, clicks: 100, source: 'manual' },
        { date: day, platform: 'google', campaignId: G, campaignName: 'Google Search', currency: 'USD', amount: 10, impressions: 500, clicks: 0, source: 'csv' },
        { date: day, platform: 'other', campaignId: null, campaignName: 'Old flyer', currency: 'BDT', amount: 200, source: 'manual' },
        { date: new Date('2026-11-20T00:00:00Z'), platform: 'meta', campaignId: M, campaignName: 'Meta Winter', currency: 'BDT', amount: 9999, source: 'manual' },
      ],
    });
    await db.fxRate.create({ data: { currency: 'USD', rateToBdt: 120, effectiveFrom: new Date('2026-11-01T00:00:00Z') } });
    // Staff may see campaigns but not spend.
    const staffRole = await db.role.findUniqueOrThrow({ where: { name: 'Staff' } });
    await db.rolePermission.create({ data: { roleId: staffRole.id, permission: 'advertising.campaigns_view' } });
  } finally {
    await db.$disconnect();
  }
  staff = api(await login('staff'));
});

const row = (body: any, id: string | null) => body.campaigns.find((c: any) => c.campaignId === id);

describe('campaign performance', () => {
  it('defaults: booked net revenue, last touch, online only', async () => {
    const res = await admin.get(`/api/admin/advertising/performance?${WINDOW}`);
    assert.equal(res.status, 200);
    const b = res.body;
    assert.deepEqual(b.filter.basis + b.filter.model + b.filter.source, 'bookedlastonline');

    const m = row(b, M);
    assert.deepEqual([m.orders, m.revenue, m.spend], [2, 2500, 1000], 'cancelled excluded, refund subtracted, outside-window spend excluded');
    assert.equal(m.roas, 2.5);
    assert.equal(m.cpa, 500);
    assert.equal(m.ctr, 0.01);
    assert.equal(m.cpc, 10);
    assert.equal(m.aov, 1250);

    const g = row(b, G);
    assert.deepEqual([g.orders, g.revenue, g.spend], [0, 0, 1200], 'POS and refunded orders excluded; USD converted at 120');
    assert.equal(g.roas, 0);
    assert.equal(g.cpa, null, 'no orders → CPA unknown');
    assert.equal(g.cpc, null, 'no clicks → CPC unknown');
    assert.equal(g.aov, null);

    const unassigned = row(b, null);
    assert.deepEqual([unassigned.name, unassigned.spend], ['Spend without a campaign', 200]);

    assert.equal(b.totals.revenue, 2500);
    assert.equal(b.totals.spend, 2400);
    assert.equal(b.totals.directOrders, 1);
    assert.equal(b.totals.directRevenue, 600);
    assert.equal(b.totals.totalRevenue, 3100);
    assert.equal(b.totals.roas, 2500 / 2400);
    assert.equal(b.totals.blendedRoas, 3100 / 2400);
    assert.deepEqual(b.channels.map((c: any) => [c.channel, c.orders, c.revenue]), [['paid_social', 2, 2500], ['direct', 1, 600]]);
    assert.deepEqual(b.daily, [{ day: '2026-11-10', revenue: 3100, attributedRevenue: 2500, spend: 2400 }]);
  });

  it('first-touch model, delivered basis and source switches', async () => {
    const first = (await admin.get(`/api/admin/advertising/performance?${WINDOW}&model=first`)).body;
    assert.deepEqual([row(first, M).orders, row(first, M).revenue], [1, 1500]);
    assert.deepEqual([row(first, G).orders, row(first, G).revenue], [1, 1000]);

    const delivered = (await admin.get(`/api/admin/advertising/performance?${WINDOW}&basis=delivered`)).body;
    assert.deepEqual([row(delivered, M).orders, row(delivered, M).revenue], [1, 1500]);
    assert.equal(delivered.totals.directOrders, 0);

    const all = (await admin.get(`/api/admin/advertising/performance?${WINDOW}&source=all`)).body;
    assert.deepEqual([row(all, G).orders, row(all, G).revenue], [1, 400], 'POS included only on request');
  });

  it('hides spend from admins without spend permission', async () => {
    const res = await staff.get(`/api/admin/advertising/performance?${WINDOW}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.spendIncluded, false);
    assert.equal(row(res.body, M).spend, null);
    assert.equal(row(res.body, M).roas, null);
    assert.equal(row(res.body, null), undefined, 'no spend-only rows');
    assert.equal(res.body.totals.blendedRoas, null);
    assert.equal(res.body.daily[0].spend, null);
  });

  it('validates the window', async () => {
    assert.equal((await admin.get('/api/admin/advertising/performance?from=2026-11-10&to=2026-11-01')).status, 400);
    assert.equal((await admin.get('/api/admin/advertising/performance?from=2020-01-01&to=2026-11-01')).status, 400);
  });
});
