// Boots the real API (src/index.ts via tsx) against a throwaway database.
// Call useTestServer() at the top of a test file: it registers before/after
// hooks and hands back the base URL once /api/health answers.
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { after, before } from 'node:test';
import { createTestDb, SERVER_DIR, type TestDb } from './db.ts';
import { setBaseUrl } from './http.ts';

const BOOT_TIMEOUT_MS = 60_000;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl: string, child: ChildProcess, logs: () => string): Promise<void> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API exited with code ${child.exitCode} before becoming healthy\n${logs()}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status === 200) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`API did not become healthy within ${BOOT_TIMEOUT_MS}ms\n${logs()}`);
}

/**
 * tsx's CLI runs the app in a child process, so killing only the PID we
 * spawned would orphan the real server (and its lock on test.db) on Windows.
 */
async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
  await exited;
}

export interface TestServer {
  baseUrl: string;
  db: TestDb;
}

export function useTestServer(): TestServer {
  const ctx = {} as TestServer;
  let child: ChildProcess | undefined;

  const start = async (): Promise<string> => {
    ctx.db = await createTestDb();
    const port = await freePort();
    ctx.baseUrl = `http://127.0.0.1:${port}`;

    let output = '';
    child = spawn(process.execPath, [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/index.ts'], {
      cwd: SERVER_DIR,
      // Explicit values win: dotenv/config never overrides an existing variable.
      env: { ...process.env, DATABASE_URL: ctx.db.url, PORT: String(port), JWT_SECRET: 'test-only' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.on('data', (d) => (output += d));
    child.stderr!.on('data', (d) => (output += d));

    await waitForHealth(ctx.baseUrl, child, () => output);
    return ctx.baseUrl;
  };

  let ready: Promise<string> | undefined;
  let resolveReady!: (url: Promise<string>) => void;
  setBaseUrl(new Promise<string>((resolve) => (resolveReady = resolve)));

  before(async () => {
    ready = start();
    resolveReady(ready);
    await ready;
  });

  after(async () => {
    await ready?.catch(() => {});
    try {
      if (child) await stopServer(child);
    } finally {
      ctx.db?.cleanup();
    }
  });

  return ctx;
}
