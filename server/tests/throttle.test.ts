// Rate limits key on the real client address, not on headers the client sets.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';

const server = useTestServer();

function subscribe(i: number, forwardedFor: string) {
  return fetch(`${server.baseUrl}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor },
    body: JSON.stringify({ email: `throttle-${i}@test.local` }),
  });
}

describe('client address for rate limits (#11)', () => {
  it('a forged X-Forwarded-For entry does not reset the limit', async () => {
    // As behind nginx: the client forges the first entry, the proxy appends the real one.
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      statuses.push((await subscribe(i, `10.9.${i}.1, 203.0.113.7`)).status);
    }
    assert.ok(statuses.includes(429), `never limited: ${statuses.join(',')}`);
  });

  it('different real clients are limited separately', async () => {
    const res = await subscribe(100, '198.51.100.20');
    assert.notEqual(res.status, 429);
  });
});
