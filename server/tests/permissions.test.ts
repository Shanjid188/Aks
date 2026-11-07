// RBAC: what the limited Staff role can and cannot reach, and token checks.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { ORDERS } from './helpers/db.ts';

useTestServer();

let staff: string;
let superToken: string;
let pendingId: string;

before(async () => {
  staff = await login('staff');
  superToken = await login('super');
  const res = await api(superToken).get(`/api/admin/orders?search=${ORDERS[0].orderNumber}`);
  pendingId = res.body.orders[0].id;
});

describe('staff role', () => {
  for (const path of ['/api/admin/orders', '/api/admin/products']) {
    it(`can read ${path}`, async () => {
      assert.equal((await api(staff).get(path)).status, 200);
    });
  }

  it('can open an order (orders.details)', async () => {
    assert.equal((await api(staff).get(`/api/admin/orders/${pendingId}`)).status, 200);
  });

  for (const path of ['/api/admin/settings', '/api/admin/coupons']) {
    it(`is refused ${path}`, async () => {
      const res = await api(staff).get(path);
      assert.equal(res.status, 403);
      // Super Admin bypasses every check.
      assert.equal((await api(superToken).get(path)).status, 200);
    });
  }

  it('cannot create products', async () => {
    const res = await api(staff).post('/api/admin/products', { name: 'Nope', sku: 'NOPE-1', price: 1 });
    assert.equal(res.status, 403);
  });

  it('cannot change settings', async () => {
    const res = await api(staff).put('/api/admin/settings', { freeShippingThreshold: 1 });
    assert.equal(res.status, 403);
  });

  it('cannot change order status or cancel', async () => {
    for (const status of ['confirmed', 'cancelled']) {
      const res = await api(staff).patch(`/api/admin/orders/${pendingId}`, { status });
      assert.equal(res.status, 403, status);
    }
    const order = await api(superToken).get(`/api/admin/orders/${pendingId}`);
    assert.equal(order.body.order.status, 'pending');
  });
});

describe('tokens', () => {
  it('rejects a missing token', async () => {
    assert.equal((await api().get('/api/admin/orders')).status, 401);
  });

  it('rejects a malformed token', async () => {
    assert.equal((await api('not-a-jwt').get('/api/admin/orders')).status, 401);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({ id: 'x', isSuper: true, permissions: [] }, 'some-other-secret');
    assert.equal((await api(forged).get('/api/admin/orders')).status, 401);
  });

  it('re-reads permissions from the DB rather than trusting the token payload', async () => {
    // Valid signature (the test secret) but forged claims for the staff account.
    // Built from the real token so the session itself is valid (#19).
    const { iat, exp, ...claims } = jwt.decode(staff) as Record<string, unknown>;
    void iat; void exp;
    const forged = jwt.sign({ ...claims, isSuper: true, permissions: ['settings.view'] }, 'test-only');
    assert.equal((await api(forged).get('/api/admin/settings')).status, 403);
    // Without the password fingerprint the token is not a session at all.
    const { pv, ...noFingerprint } = claims;
    void pv;
    assert.equal((await api(jwt.sign({ ...noFingerprint, isSuper: true }, 'test-only')).get('/api/admin/settings')).status, 401);
  });
});
