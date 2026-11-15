// Campaign attribution: parsing/cleaning, channel rules, consent for click IDs,
// campaign matching order, re-matching, filters and the click-ID purge.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';
import { deriveChannel, parseAttribution, purgeExpiredClickIds } from '../src/lib/attribution.ts';

const server = useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
  staff = api(await login('staff'));
});

const now = Date.now();
const touch = (over: Record<string, unknown> = {}) => ({
  source: 'facebook',
  medium: 'paid_social',
  campaign: 'Winter Rice Push',
  content: 'ad-42',
  id: 'C123',
  clickIdType: 'fbclid',
  clickId: 'IwAR-click-123',
  referrerHost: 'm.facebook.com',
  landingPath: '/products/rice',
  at: now - 3 * 86_400_000,
  ...over,
});
const consent = (marketing: boolean) => ({ consent: { analytics: false, marketing } });

describe('parseAttribution', () => {
  it('keeps campaign tags for everyone but click IDs only with consent', () => {
    const withConsent = parseAttribution({ first: touch(), last: touch() }, true);
    assert.equal(withConsent.last?.clickId, 'IwAR-click-123');
    assert.equal(withConsent.last?.channel, 'paid_social');
    const without = parseAttribution({ first: touch(), last: touch() }, false);
    assert.equal(without.last?.clickId, null);
    assert.equal(without.last?.clickIdType, 'fbclid', 'only the type is kept');
    assert.equal(without.last?.utmCampaign, 'Winter Rice Push');
  });

  it('rejects junk, full URLs, query strings and touches outside the window', () => {
    const p = parseAttribution(
      { last: touch({ referrerHost: 'https://evil.example/path?email=a@b.c', landingPath: '/x?phone=017', campaign: '<script>', source: 'x'.repeat(500) }) },
      true
    );
    assert.equal(p.last?.referrerHost, null);
    assert.equal(p.last?.landingPath, null);
    assert.equal(p.last?.utmCampaign, null);
    assert.equal(p.last?.utmSource, null);
    assert.equal(parseAttribution({ last: touch({ at: now - 31 * 86_400_000 }) }, true).last, null);
    assert.equal(parseAttribution({ last: touch({ at: now + 86_400_000 }) }, true).last, null);
    assert.deepEqual(parseAttribution('nonsense', true), { first: null, last: null });
  });

  it('uses the single touch for both models', () => {
    const p = parseAttribution({ last: touch() }, false);
    assert.equal(p.first?.utmId, 'C123');
  });
});

describe('deriveChannel', () => {
  const base = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, utmId: null, clickIdType: null, clickId: null, referrerHost: null, landingPath: null };
  const cases: [Partial<typeof base>, string][] = [
    [{ utmSource: 'facebook', utmMedium: 'paid_social' }, 'paid_social'],
    [{ utmSource: 'google', utmMedium: 'cpc' }, 'paid_search'],
    [{ clickIdType: 'gclid' as never }, 'paid_search'],
    [{ clickIdType: 'fbclid' as never }, 'social'],
    [{ utmSource: 'newsletter', utmMedium: 'email' }, 'email'],
    [{ referrerHost: 'google.com' }, 'organic_search'],
    [{ referrerHost: 'l.facebook.com' }, 'social'],
    [{ referrerHost: 'blog.example.com' }, 'referral'],
    [{ utmSource: 'partner' }, 'other'],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => assert.equal(deriveChannel({ ...base, ...input } as never), expected));
  }
});

describe('orders and campaigns', () => {
  let paidOrderId = '';
  let noConsentOrderId = '';
  let directOrderId = '';

  it('stores first/last touches with the order and never exposes the raw click ID', async () => {
    const res = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], {
      tracking: consent(true),
      attribution: { first: touch({ medium: 'social', campaign: 'Organic Post', id: null, at: now - 10 * 86_400_000 }), last: touch() },
    });
    assert.equal(res.status, 201);
    paidOrderId = res.body.order.id;
    assert.equal(JSON.stringify(res.body).includes('attribution'), false, 'public order response unchanged');

    const detail = await admin.get(`/api/admin/orders/${paidOrderId}`);
    const byTouch = Object.fromEntries(detail.body.order.attribution.map((a: any) => [a.touch, a]));
    assert.equal(byTouch.last.channel, 'paid_social');
    assert.equal(byTouch.first.channel, 'social');
    assert.equal(byTouch.last.hasClickId, true);
    assert.ok(!JSON.stringify(detail.body).includes('IwAR-click-123'), 'raw click id not returned');
    assert.equal(byTouch.last.campaignId, null, 'no campaign exists yet');
  });

  it('drops the click ID without advertising consent; orders without attribution still work', async () => {
    noConsentOrderId = (await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], { tracking: consent(false), attribution: { last: touch({ id: null, campaign: 'Eid Sale' }) } })).body.order.id;
    directOrderId = (await placeOrder([{ sku: 'TEST-OIL-1L', quantity: 1 }])).body.order.id;
    const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
    try {
      const rows = await db.orderAttribution.findMany({ where: { orderId: noConsentOrderId } });
      assert.equal(rows.length, 2);
      assert.ok(rows.every((r) => r.clickId === null));
      assert.equal(await db.orderAttribution.count({ where: { orderId: directOrderId } }), 0);
    } finally {
      await db.$disconnect();
    }
  });

  it('lists unmatched UTM campaigns, then links them when a campaign is created', async () => {
    const unmatched = (await admin.get('/api/admin/advertising/attribution/unmatched')).body.unmatched;
    assert.ok(unmatched.some((u: any) => u.utmCampaign === 'Eid Sale' && u.orders === 1));

    // utm_id match beats utm_campaign; both touches of the paid order link.
    const byId = await admin.post('/api/admin/advertising/campaigns', { name: 'Meta – Winter', channel: 'meta', platform: 'meta', platformCampaignId: 'C123' });
    assert.equal(byId.status, 201);
    assert.equal(byId.body.campaign.lastTouchOrders, 1);
    const byKey = await admin.post('/api/admin/advertising/campaigns', { name: 'Eid', channel: 'meta', matchKeys: ['EID SALE'] });
    assert.equal(byKey.body.relinked, 2, 'first + last touch of the Eid order');
    assert.deepEqual(byKey.body.campaign.matchKeys, ['eid sale']);

    const filtered = await admin.get(`/api/admin/orders?campaignId=${byId.body.campaign.id}`);
    assert.deepEqual(filtered.body.orders.map((o: any) => o.id), [paidOrderId]);
    const paidSocial = (await admin.get('/api/admin/orders?channel=paid_social')).body.orders.map((o: any) => o.id);
    assert.ok(paidSocial.includes(paidOrderId) && paidSocial.includes(noConsentOrderId));
    assert.ok((await admin.get('/api/admin/orders?channel=direct')).body.orders.some((o: any) => o.id === directOrderId));

    // Changing match keys re-links: the Eid order is no longer matched.
    const edited = await admin.patch(`/api/admin/advertising/campaigns/${byKey.body.campaign.id}`, { matchKeys: ['eid-2027'] });
    assert.equal(edited.body.relinked, 2);
    assert.equal(edited.body.campaign.lastTouchOrders, 0);

    assert.equal((await admin.delete(`/api/admin/advertising/campaigns/${byId.body.campaign.id}`)).status, 409, 'linked campaigns are archived, not deleted');
    assert.equal((await admin.delete(`/api/admin/advertising/campaigns/${byKey.body.campaign.id}`)).status, 200);
    const dup = await admin.post('/api/admin/advertising/campaigns', { name: 'Dup', platform: 'meta', platformCampaignId: 'C123' });
    assert.equal(dup.status, 409);
    assert.equal((await admin.post('/api/admin/advertising/campaigns', { name: '' })).status, 400);

    const audit = (await admin.get('/api/admin/activity?entity=campaign')).body.logs.map((l: any) => l.action);
    assert.ok(audit.includes('campaign.created') && audit.includes('campaign.updated') && audit.includes('campaign.deleted'));
  });

  it('requires campaign permissions', async () => {
    assert.equal((await staff.get('/api/admin/advertising/campaigns')).status, 403);
    assert.equal((await staff.post('/api/admin/advertising/campaigns', { name: 'x' })).status, 403);
  });

  it('erases click IDs after 90 days', async () => {
    const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
    try {
      await db.orderAttribution.updateMany({ where: { orderId: paidOrderId }, data: { createdAt: new Date(now - 91 * 86_400_000) } });
      assert.equal(await purgeExpiredClickIds(Date.now(), db), 2);
      const rows = await db.orderAttribution.findMany({ where: { orderId: paidOrderId } });
      assert.ok(rows.every((r) => r.clickId === null && r.utmCampaign !== null), 'campaign tags are kept');
    } finally {
      await db.$disconnect();
    }
  });
});
