// Abandoned carts: anonymous sessions priced from the catalog, opt-in contact
// only with consent, conversion on order (contact erased), abandonment and
// privacy purges, restore link, admin list without contact details, audited
// reveal and permission checks.
import crypto from 'node:crypto';
import { afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';
import { PRODUCTS } from './helpers/db.ts';

process.env.DISABLE_JOBS = 'true';
const server = useTestServer();
const pub = api();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
let db: PrismaClient;
let maintenance: (now?: number) => Promise<string>;
let libPrisma: PrismaClient | undefined;

// Windows keeps the SQLite file locked while a client is connected, which
// would block the temp-database cleanup — Prisma reconnects on the next query.
afterEach(async () => {
  await db?.$disconnect();
  await libPrisma?.$disconnect();
});

const RICE = PRODUCTS[0];
const OIL = PRODUCTS[1];
const newToken = () => crypto.randomBytes(24).toString('base64url');
const hash = (t: string) => crypto.createHash('sha256').update(`checkout-session:${t}`).digest('hex');
const session = (t: string) => db.checkoutSession.findUniqueOrThrow({ where: { tokenHash: hash(t) } });
const consent = { consent: true, phone: '01712345678', email: 'Shopper@Example.com' };

before(async () => {
  admin = api(await login('super'));
  db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
  // The job runs inside the API; call it directly against the same database.
  process.env.DATABASE_URL = server.db.url;
  maintenance = (await import('../src/lib/checkoutSessions.ts')).runCartMaintenance;
  libPrisma = (await import('../src/lib/prisma.ts')).prisma;
  const staffRole = await db.role.findUniqueOrThrow({ where: { name: 'Staff' } });
  await db.rolePermission.create({ data: { roleId: staffRole.id, permission: 'advertising.carts_view' } });
  staff = api(await login('staff'));
});

describe('public checkout sessions', () => {
  it('prices items from the catalog and stores no contact without consent', async () => {
    const t = newToken();
    const res = await pub.put(`/api/checkout-sessions/${t}`, {
      items: [
        { sku: RICE.sku, quantity: 2, price: 1, size: 'L' },
        { sku: 'NO-SUCH-SKU', quantity: 1 },
      ],
      attribution: { last: { source: 'facebook', medium: 'paid_social', campaign: 'winter', clickIdType: 'fbclid', clickId: 'abcd1234', at: Date.now() } },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body, { status: 'active', value: RICE.price * 2, contact: false });
    const s = await session(t);
    assert.equal(s.channel, 'paid_social');
    assert.equal(s.contactPhone, null);
    assert.ok(!s.items.includes('NO-SUCH-SKU'), 'unknown SKUs dropped');
    assert.ok(!JSON.stringify(s).includes('abcd1234'), 'no click id stored');
  });

  it('rejects bad input', async () => {
    assert.equal((await pub.put('/api/checkout-sessions/short', { items: [] })).status, 400);
    assert.equal((await pub.put(`/api/checkout-sessions/${newToken()}`, { items: [{ sku: RICE.sku, quantity: 0 }] })).status, 400);
    assert.equal((await pub.put(`/api/checkout-sessions/${newToken()}`, { items: [], contact: { phone: '01712345678' } })).status, 400, 'contact without consent');
    assert.equal((await pub.put(`/api/checkout-sessions/${newToken()}`, { items: [], contact: { consent: true, phone: '12345' } })).status, 400);
  });

  it('stores opt-in contact and erases it when the shopper unticks', async () => {
    const t = newToken();
    const res = await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: OIL.sku, quantity: 1 }], contact: consent });
    assert.equal(res.body.contact, true);
    let s = await session(t);
    assert.deepEqual([s.contactPhone, s.contactEmail], ['01712345678', 'shopper@example.com']);
    assert.ok(s.contactConsentAt && s.restoreCode);
    await pub.delete(`/api/checkout-sessions/${t}/contact`);
    s = await session(t);
    assert.deepEqual([s.contactPhone, s.contactEmail, s.restoreCode, s.contactConsentAt], [null, null, null, null]);
    assert.ok(s.contactErasedAt);
  });

  it('marks the session converted on order and erases contact', async () => {
    const t = newToken();
    await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: RICE.sku, quantity: 1 }], contact: consent });
    const order = await placeOrder([{ sku: RICE.sku, quantity: 1 }], { checkoutSession: t });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    const s = await session(t);
    assert.equal(s.status, 'converted');
    assert.equal(s.orderId, order.body.order.id);
    assert.equal(s.contactPhone, null);
    // A finished session ignores further writes.
    const again = await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: OIL.sku, quantity: 3 }] });
    assert.equal(again.body.status, 'converted');
  });

  it('an order without a session (or with a bad token) still succeeds', async () => {
    assert.equal((await placeOrder([{ sku: RICE.sku, quantity: 1 }], { checkoutSession: 'nope' })).status, 201);
  });
});

describe('abandonment, recovery and privacy jobs', () => {
  it('abandons idle carts, then counts a later order as recovered', async () => {
    const t = newToken();
    await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: OIL.sku, quantity: 2 }], contact: consent });
    await db.checkoutSession.update({ where: { tokenHash: hash(t) }, data: { lastActivityAt: new Date(Date.now() - 2 * 3600_000) } });
    await maintenance();
    let s = await session(t);
    assert.equal(s.status, 'abandoned');
    assert.ok(s.abandonedAt);

    const restore = await pub.get(`/api/checkout-sessions/restore/${s.restoreCode}`);
    assert.equal(restore.status, 200);
    assert.deepEqual(restore.body.items, [{ sku: OIL.sku, quantity: 2, size: '', color: '' }]);
    assert.ok(!JSON.stringify(restore.body).includes('01712345678'), 'restore never returns contact');

    await placeOrder([{ sku: OIL.sku, quantity: 2 }], { checkoutSession: t });
    s = await session(t);
    assert.equal(s.status, 'recovered');
    assert.ok(s.recoveredAt && s.restoredAt);
  });

  it('erases contact after the retention period and deletes old sessions', async () => {
    const old = newToken();
    const ancient = newToken();
    await pub.put(`/api/checkout-sessions/${old}`, { items: [{ sku: RICE.sku, quantity: 1 }], contact: consent });
    await pub.put(`/api/checkout-sessions/${ancient}`, { items: [{ sku: RICE.sku, quantity: 1 }] });
    await db.checkoutSession.update({ where: { tokenHash: hash(old) }, data: { status: 'abandoned', abandonedAt: new Date(Date.now() - 31 * 86_400_000) } });
    await db.checkoutSession.update({ where: { tokenHash: hash(ancient) }, data: { createdAt: new Date(Date.now() - 181 * 86_400_000) } });
    await maintenance();
    const s = await session(old);
    assert.equal(s.contactPhone, null);
    assert.ok(s.contactErasedAt);
    assert.equal(await db.checkoutSession.findUnique({ where: { tokenHash: hash(ancient) } }), null);
  });

  it('the restore link can erase contact details, and unknown codes 404', async () => {
    const t = newToken();
    await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: RICE.sku, quantity: 1 }], contact: consent });
    const code = (await session(t)).restoreCode!;
    await pub.delete(`/api/checkout-sessions/restore/${code}/contact`);
    assert.equal((await session(t)).contactPhone, null);
    assert.equal((await pub.get(`/api/checkout-sessions/restore/${code}`)).status, 404, 'code is gone with the consent');
    assert.equal((await pub.get('/api/checkout-sessions/restore/doesnotexist0000000000')).status, 404);
  });
});

describe('admin abandoned carts', () => {
  let cartId = '';
  before(async () => {
    const t = newToken();
    await pub.put(`/api/checkout-sessions/${t}`, { items: [{ sku: RICE.sku, quantity: 3 }], contact: consent });
    await db.checkoutSession.update({ where: { tokenHash: hash(t) }, data: { lastActivityAt: new Date(Date.now() - 2 * 3600_000) } });
    await maintenance();
    cartId = (await session(t)).id;
  });

  it('lists abandoned carts with a summary but never contact details', async () => {
    const res = await admin.get('/api/admin/advertising/carts');
    assert.equal(res.status, 200);
    const b = res.body;
    assert.ok(b.summary.abandoned >= 1);
    assert.ok(b.summary.recovered >= 1);
    assert.ok(b.summary.abandonmentRate > 0 && b.summary.abandonmentRate < 1);
    assert.ok(b.summary.topAbandonedProducts.some((p: any) => p.sku === RICE.sku));
    const row = b.carts.find((c: any) => c.id === cartId);
    assert.equal(row.hasContact, true);
    assert.equal(row.value, RICE.price * 3);
    assert.ok(!JSON.stringify(b).includes('01712345678'));
    assert.ok(!JSON.stringify(b).includes('shopper@example.com'));
    assert.equal(b.settings.consentText, 'I agree to receive a reminder about my abandoned cart via WhatsApp or SMS.');
  });

  it('reveals contact only with carts_contact, and audits it', async () => {
    const denied = await staff.get(`/api/admin/advertising/carts/${cartId}/contact`);
    assert.equal(denied.status, 403);
    assert.equal((await staff.get('/api/admin/advertising/carts')).body.canRevealContact, false);

    const res = await admin.get(`/api/admin/advertising/carts/${cartId}/contact`);
    assert.equal(res.status, 200);
    assert.equal(res.body.phone, '01712345678');
    assert.match(res.body.whatsappUrl, /^https:\/\/wa\.me\/8801712345678\?text=/);
    assert.match(res.body.restoreUrl, /\/cart\?restore=[A-Za-z0-9_-]+$/);
    const audit = await db.auditLog.findFirst({ where: { action: 'cart.contact_viewed', entityId: cartId } });
    assert.ok(audit);
    assert.ok(!audit.details.includes('01712345678'), 'the audit entry does not copy the number');
  });

  it('marks contacted / recovered (audited) and blocks staff', async () => {
    assert.equal((await staff.patch(`/api/admin/advertising/carts/${cartId}`, { action: 'contacted' })).status, 403);
    const c = await admin.patch(`/api/admin/advertising/carts/${cartId}`, { action: 'contacted' });
    assert.equal(c.status, 200);
    assert.ok(c.body.contactedAt);
    const r = await admin.patch(`/api/admin/advertising/carts/${cartId}`, { action: 'recovered' });
    assert.equal(r.body.status, 'recovered');
    assert.equal((await admin.patch(`/api/admin/advertising/carts/${cartId}`, { action: 'recovered' })).status, 409);
    assert.ok(await db.auditLog.findFirst({ where: { action: 'cart.recovered', entityId: cartId } }));
  });
});
