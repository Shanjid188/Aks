/**
 * Diagnose why uploaded images are not visible in production.
 *
 * An uploaded image is written to <repo>/public/images/uploads and served by
 * Node at /images/uploads/<file>. The browser requests that same-origin path,
 * so the request can fail at three different layers:
 *
 *   1. FILE   – the file is not on disk (upload did not persist / wrong cwd)
 *   2. NODE   – the file is on disk but Node does not serve it
 *   3. WEB    – Node serves it fine, but the web server in front (nginx /
 *               LiteSpeed/CloudPanel) does not proxy /images, or caches the
 *               earlier 404
 *
 * This script tests each layer separately and prints the verdict.
 *
 *   cd server && npm run diag:images [-- https://www.aksmartbd.com]
 *
 * Read-only: it only reads files and issues HEAD requests.
 */
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 4000;
const DOMAIN = process.argv[2]?.startsWith('http') ? process.argv[2].replace(/\/$/, '') : null;

function imagesDir(): string | null {
  const c = [
    path.resolve(process.cwd(), '..', 'public', 'images'),
    path.resolve(process.cwd(), 'public', 'images'),
  ];
  return c.find((d) => fs.existsSync(d)) ?? null;
}

async function head(url: string) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return { status: r.status, type: r.headers.get('content-type'), cc: r.headers.get('cache-control'), server: r.headers.get('server') };
  } catch (e) {
    return { status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  AKS MART — PRODUCTION IMAGE DIAGNOSTIC');
  console.log('════════════════════════════════════════════════════════════\n');

  const dir = imagesDir();
  if (!dir) {
    console.log('❌ public/images not found. Run this from the server/ directory.');
    return;
  }
  console.log(`images dir : ${dir}`);

  const upDir = path.join(dir, 'uploads');
  if (!fs.existsSync(upDir)) {
    console.log('❌ uploads/ does not exist — nothing has ever been uploaded here.');
    console.log('   If you can upload in the admin panel but this folder is missing,');
    console.log('   the server process is writing somewhere else (wrong cwd).');
    return;
  }

  const files = fs
    .readdirSync(upDir)
    .filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(upDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 3);

  console.log(`uploads    : ${fs.readdirSync(upDir).length} file(s)\n`);
  if (files.length === 0) {
    console.log('⚠️  uploads/ exists but holds no images.');
    return;
  }

  for (const { f } of files) {
    console.log(`── ${f}`);
    const viaNode = await head(`http://127.0.0.1:${PORT}/images/uploads/${encodeURIComponent(f)}`);
    console.log(`   NODE  127.0.0.1:${PORT}  → ${viaNode.status || viaNode.error}  ${viaNode.type ?? ''}`);
    if (viaNode.cc) console.log(`         cache-control: ${viaNode.cc}`);

    let verdict = viaNode.status === 200 ? 'NODE OK' : '❌ FILE/NODE PROBLEM';
    if (DOMAIN) {
      const viaWeb = await head(`${DOMAIN}/images/uploads/${encodeURIComponent(f)}`);
      console.log(`   WEB   ${DOMAIN}  → ${viaWeb.status || viaWeb.error}  ${viaWeb.type ?? ''}`);
      if (viaWeb.server) console.log(`         server: ${viaWeb.server}`);
      if (viaWeb.cc) console.log(`         cache-control: ${viaWeb.cc}`);
      if (viaNode.status === 200 && viaWeb.status !== 200) verdict = '❌ WEB SERVER PROBLEM';
      else if (viaNode.status === 200 && viaWeb.status === 200) verdict = '✅ SERVED CORRECTLY';
    }
    console.log(`   VERDICT: ${verdict}\n`);
  }

  console.log('How to read this:');
  console.log('  FILE problem  → the upload is not in public/images/uploads on the server.');
  console.log('  NODE problem  → the file exists but Node 404s it (check the process cwd).');
  console.log('  WEB  problem  → Node is fine but nginx/LiteScreen is not proxying /images,');
  console.log('                  or is caching the earlier 404. Fix the vhost to proxy');
  console.log('                  /images to 127.0.0.1:4000, and disable caching for it.');
}

main().catch((e) => {
  console.error('❌ Diagnostic failed:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});