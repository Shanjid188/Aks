// Admin sessions end when the password changes or the account is disabled.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { STAFF_PERMISSIONS } from './helpers/db.ts';

useTestServer();

let superToken: string;
let staffRoleId: string;
let counter = 0;

before(async () => {
  superToken = await login('super');
  const roles = (await api(superToken).get('/api/admin/roles')).body.roles;
  staffRoleId = roles.find((r: any) => !r.isSuper && r.permissions.length === STAFF_PERMISSIONS.length).id;
});

/** A new staff admin, signed in. */
async function staffSession() {
  counter += 1;
  const email = `session${counter}@test.local`;
  const password = `session-pass-${counter}`;
  const created = await api(superToken).post('/api/admin/admins', { name: 'Session', email, password, roleId: staffRoleId });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const res = await api().post('/api/admin/auth/login', { email, password });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { id: created.body.admin.id as string, email, token: res.body.token as string };
}

/** Status of a route behind requireAuth and of one behind requirePermission. */
async function access(token: string) {
  const me = await api(token).get('/api/admin/auth/me');
  const orders = await api(token).get('/api/admin/orders');
  return [me.status, orders.status];
}

describe('admin sessions (#19)', () => {
  it('a working session reaches both kinds of route', async () => {
    const s = await staffSession();
    assert.deepEqual(await access(s.token), [200, 200]);
  });

  it('a password reset ends existing sessions', async () => {
    const s = await staffSession();
    const reset = await api(superToken).put(`/api/admin/admins/${s.id}/password`, { password: 'brand-new-pass-1' });
    assert.equal(reset.status, 200, JSON.stringify(reset.body));
    assert.deepEqual(await access(s.token), [401, 401]);

    const again = await api().post('/api/admin/auth/login', { email: s.email, password: 'brand-new-pass-1' });
    assert.equal(again.status, 200);
    assert.deepEqual(await access(again.body.token), [200, 200]);
  });

  it('disabling an account ends its sessions everywhere', async () => {
    const s = await staffSession();
    const off = await api(superToken).patch(`/api/admin/admins/${s.id}/status`, { isActive: false });
    assert.equal(off.status, 200, JSON.stringify(off.body));
    assert.deepEqual(await access(s.token), [401, 401]);
    // requireAuth-only routes too, which used to trust the token alone.
    assert.equal((await api(s.token).get('/api/admin/roles/catalog')).status, 401);
  });

  it('a token without the password fingerprint is refused', async () => {
    const s = await staffSession();
    const claims = jwt.decode(s.token) as Record<string, unknown>;
    const { pv, iat, exp, ...rest } = claims;
    void pv; void iat; void exp;
    const legacy = jwt.sign(rest, 'test-only', { expiresIn: '1h' });
    assert.deepEqual(await access(legacy), [401, 401]);
  });

  it('changing your own password keeps you signed in with the new token only', async () => {
    const res = await api(superToken).post('/api/admin/admins', {
      name: 'Self', email: 'self@test.local', password: 'self-pass-123', roleId: (await api(superToken).get('/api/admin/roles')).body.roles.find((r: any) => r.isSuper).id,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const old = (await api().post('/api/admin/auth/login', { email: 'self@test.local', password: 'self-pass-123' })).body.token;
    const changed = await api(old).put(`/api/admin/admins/${res.body.admin.id}/password`, { password: 'self-pass-456' });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.ok(changed.body.token);
    assert.deepEqual(await access(changed.body.token), [200, 200]);
    assert.deepEqual(await access(old), [401, 401]);
  });

  it('other admins stay signed in', async () => {
    const a = await staffSession();
    const b = await staffSession();
    await api(superToken).put(`/api/admin/admins/${a.id}/password`, { password: 'another-pass-12' });
    assert.deepEqual(await access(b.token), [200, 200]);
    assert.deepEqual(await access(superToken), [200, 200]);
  });
});
