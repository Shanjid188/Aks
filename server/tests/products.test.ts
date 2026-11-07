// Public product catalog vs the admin view.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api } from './helpers/http.ts';
import { adminProduct, fixture } from './helpers/orders.ts';

useTestServer();

const RICE = fixture('TEST-RICE-5KG'); // stock 500
const BASKET = fixture('TEST-BASKET'); // stock 10

describe('public product fields (#10)', () => {
  it('the catalog never includes cost price or the reorder level', async () => {
    const res = await api().get('/api/products');
    assert.equal(res.status, 200);
    assert.ok(res.body.products.length > 0);
    for (const p of res.body.products) {
      assert.ok(!('costPrice' in p), `${p.sku} exposes costPrice`);
      assert.ok(!('lowStockThreshold' in p), `${p.sku} exposes lowStockThreshold`);
    }
  });

  it('reports stock only up to a ceiling', async () => {
    const res = await api().get('/api/products');
    const rice = res.body.products.find((p: any) => p.sku === RICE.sku);
    const basket = res.body.products.find((p: any) => p.sku === BASKET.sku);
    assert.equal(rice.stockQuantity, 100);
    assert.equal(basket.stockQuantity, (await adminProduct(BASKET.sku)).stockQuantity);
    assert.equal(rice.trackStock, true);
  });

  it('the product page is filtered the same way', async () => {
    const res = await api().get(`/api/products/${RICE.slug}`);
    assert.equal(res.status, 200);
    assert.ok(!('costPrice' in res.body));
    assert.equal(res.body.stockQuantity, 100);
  });

  it('admins still see cost price and exact stock', async () => {
    const rice = await adminProduct(RICE.sku);
    assert.equal(rice.costPrice, RICE.costPrice);
    assert.ok(rice.stockQuantity > 100);
  });
});
