import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { ADMINS, PRODUCTS } from './helpers/db.ts';

useTestServer();

describe('smoke', () => {
  it('GET /api/health answers ok', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('super admin can log in and gets full access', async () => {
    const token = await login('super');
    const me = await api(token).get('/api/admin/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.admin.email, ADMINS.super.email);
    assert.equal(me.body.admin.isSuper, true);
  });

  it('staff admin can log in with limited permissions', async () => {
    const token = await login('staff');
    const me = await api(token).get('/api/admin/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.admin.isSuper, false);
    assert.ok(me.body.admin.permissions.includes('products.view'));
    assert.ok(!me.body.admin.permissions.includes('settings.manage'));
  });

  it('rejects a wrong password', async () => {
    const res = await api().post('/api/admin/auth/login', { email: ADMINS.super.email, password: 'nope' });
    assert.equal(res.status, 401);
  });

  it('public product list returns the seeded catalog', async () => {
    const res = await api().get('/api/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, PRODUCTS.length);
    const bySku = new Map(res.body.products.map((p: any) => [p.sku, p]));
    for (const p of PRODUCTS) {
      const got: any = bySku.get(p.sku);
      assert.ok(got, `missing ${p.sku}`);
      assert.equal(got.price, p.price);
    }
  });

  it('admin product list requires auth and returns stock + cost', async () => {
    assert.equal((await api().get('/api/admin/products')).status, 401);

    const res = await api(await login('super')).get('/api/admin/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, PRODUCTS.length);
    for (const p of PRODUCTS) {
      const got = res.body.products.find((x: any) => x.sku === p.sku);
      assert.equal(got.costPrice, p.costPrice);
      assert.equal(got.stockQuantity, p.stock);
    }
  });
});
