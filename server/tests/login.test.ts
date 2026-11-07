// Admin sign-in throttling. Its own file: the limit is per client address and
// every test runs from 127.0.0.1, so other suites must not share this server.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api } from './helpers/http.ts';
import { ADMINS } from './helpers/db.ts';

useTestServer();

const signIn = (password: string) => api().post('/api/admin/auth/login', { email: ADMINS.super.email, password });

describe('admin sign-in throttle (#9)', () => {
  it('successful sign-ins are never limited', async () => {
    for (let i = 0; i < 15; i++) assert.equal((await signIn(ADMINS.super.password)).status, 200);
  });

  it('blocks the address after repeated failures, even with the right password', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await signIn(`wrong-${i}`)).status, 401);
    assert.equal((await signIn('wrong-again')).status, 429);
    const right = await signIn(ADMINS.super.password);
    assert.equal(right.status, 429);
    assert.match(right.body.error, /Too many failed sign-in attempts/);
  });
});
