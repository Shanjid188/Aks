// Safety net: the suite must never run against prisma/dev.db.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api } from './helpers/http.ts';
import { assertNotDevDb, DEV_DB_PATH, PRODUCTS, resolveSqlitePath } from './helpers/db.ts';

// Stat only (never opened): a missing dev.db (clean checkout / CI) is fine.
const devDbMtime = () => (fs.existsSync(DEV_DB_PATH) ? fs.statSync(DEV_DB_PATH).mtimeMs : null);
let mtimeBefore: number | null;
before(() => {
  mtimeBefore = devDbMtime();
});

const server = useTestServer();

describe('database guard', () => {
  it('assertNotDevDb rejects every spelling of prisma/dev.db', () => {
    for (const url of ['file:./dev.db', 'file:dev.db', `file:${DEV_DB_PATH}`, `file:${DEV_DB_PATH.replace(/\\/g, '/')}`]) {
      assert.throws(() => assertNotDevDb(url), /Refusing/, url);
    }
  });

  it('the server DATABASE_URL does not resolve to prisma/dev.db', () => {
    const resolved = resolveSqlitePath(server.db.url);
    assert.notEqual(resolved.toLowerCase(), DEV_DB_PATH.toLowerCase());
    assert.doesNotThrow(() => assertNotDevDb(server.db.url));
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())), `${resolved} is not under the OS temp dir`);
    assert.ok(fs.existsSync(resolved), 'test database file was not created');
  });

  it('the running server reads the fixture database', async () => {
    const res = await api().get('/api/products');
    assert.deepEqual(
      res.body.products.map((p: any) => p.sku).sort(),
      PRODUCTS.map((p) => p.sku).sort()
    );
  });
});

// Registered after useTestServer(), so this runs once the server is stopped.
after(() => {
  assert.equal(devDbMtime(), mtimeBefore, 'prisma/dev.db was modified during the test run');
});
