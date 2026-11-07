// Stock purchases from suppliers.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';

useTestServer();

describe('purchases', () => {
  it('parallel purchases all succeed with distinct numbers (#24)', async () => {
    const token = await login('super');
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        api(token).post('/api/admin/purchases', { items: [{ name: 'Test supply', quantity: 1, costPrice: 10 }] })
      )
    );
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const numbers = results.map((r) => r.body.purchase.purchaseNumber);
    assert.equal(new Set(numbers).size, numbers.length);
    for (const n of numbers) assert.match(n, /^PR-\d{13}$/);
  });
});
