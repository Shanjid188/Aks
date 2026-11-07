// Request body size limits.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { login } from './helpers/http.ts';

const server = useTestServer();

const big = (mb: number) => 'a'.repeat(mb * 1024 * 1024);

function post(path: string, body: string, token?: string) {
  return fetch(`${server.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
  });
}

describe('request body limits (#18)', () => {
  it('public routes refuse multi-megabyte bodies', async () => {
    const res = await post('/api/newsletter', JSON.stringify({ email: 'big@test.local', padding: big(2) }));
    assert.equal(res.status, 413);
  });

  it('malformed JSON is a 400, not a server error', async () => {
    const res = await post('/api/newsletter', '{"email":');
    assert.equal(res.status, 400);
  });

  it('the upload endpoint refuses anonymous bodies before reading them', async () => {
    const res = await post('/api/admin/upload', JSON.stringify({ data: big(2) }));
    assert.equal(res.status, 401);
  });

  it('a signed-in admin can still send a large image', async () => {
    const res = await post('/api/admin/upload', JSON.stringify({ data: `data:image/png;base64,${big(2)}` }), await login('super'));
    // Not a real image, so it is rejected by the image check rather than the size limit.
    assert.notEqual(res.status, 413);
    assert.notEqual(res.status, 401);
  });
});
