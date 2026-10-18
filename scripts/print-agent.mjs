#!/usr/bin/env node
// AKS Mart — local POS print agent (Windows, no dependencies).
//
// Browsers cannot print without showing the print dialog, so "Direct Print" in
// the admin panel posts the receipt HTML here, and this agent prints it through
// Chrome's silent kiosk printing — the same rendering path as a normal print.
//
// It uses its OWN Chrome profile, pinned to the receipt printer with Chrome's
// default margins and 100% scale, so settings saved in the cashier's everyday
// Chrome profile (custom margins, 80% scale…) can never affect receipts.
//
// Run on the POS PC:   node scripts/print-agent.mjs   (or scripts/start-print-agent.cmd)
// Env (optional):
//   PRINT_AGENT_PORT     default 17777 (listens on 127.0.0.1 only)
//   PRINTER_NAME         default "Xprinter XP-T361U"
//   CHROME_PATH          default: auto-detected Chrome install
//   PRINT_AGENT_ORIGINS  extra allowed admin origins, comma-separated
//   STICKER_REF_X_MM     courier sticker horizontal nudge in mm (default 0)
//   STICKER_REF_Y_MM     courier sticker vertical nudge in mm (default 0)
//   STICKER_SHIFT_MM     courier sticker vertical shift in mm, negative = up (default -4)
//   STICKER_CALIBRATE    0 = skip the label-sensor calibration (GAPDETECT) on the first sticker job
//
// Courier stickers (POST /sticker) do NOT go through the Windows driver: the
// Seagull driver forces its own stock (SIZE 76 x 101.6 mm, GAP 0) into every job,
// which put the 50 x 70 mm label off-centre and across two labels. Instead the
// sticker is rendered by headless Chrome at the printer's 203 dpi, thresholded
// to 1-bit and sent as raw TSPL (SIZE 50 x 70 mm, GAP 2 mm) through the spooler.
import { createServer } from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const PORT = Number(process.env.PRINT_AGENT_PORT) || 17777;
const PRINTER = process.env.PRINTER_NAME || 'Xprinter XP-T361U';
const HOME = join(process.env.LOCALAPPDATA || tmpdir(), 'AKS-Print-Agent');
const PROFILE = join(HOME, 'chrome-profile');
const JOBS = join(HOME, 'jobs');
const MAX_BODY = 5 * 1024 * 1024;
const KILL_AFTER_MS = 30_000;

// Only these pages may send print jobs (any other website is refused).
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'https://aksmartbd.com',
  'https://www.aksmartbd.com',
  'https://admin.aksmartbd.com',
  ...(process.env.PRINT_AGENT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
]);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

const CHROME = findChrome();

/**
 * Pin the agent profile's print settings: the receipt printer, Chrome default
 * margins (so the receipt's own @page margin:0 applies), 100% scale, no
 * headers/footers. Only written while that profile's Chrome is not running.
 */
function pinPrintSettings() {
  const running = existsSync(join(PROFILE, 'lockfile'));
  if (running) return;
  const prefsDir = join(PROFILE, 'Default');
  mkdirSync(prefsDir, { recursive: true });
  const prefsPath = join(prefsDir, 'Preferences');
  let prefs = {};
  try { prefs = JSON.parse(readFileSync(prefsPath, 'utf8')); } catch { /* first run */ }
  const appState = {
    version: 2,
    recentDestinations: [{ id: PRINTER, origin: 'local', account: '', displayName: PRINTER }],
    marginsType: 0,
    scalingType: 0,
    scaling: '100',
    isHeaderFooterEnabled: false,
    isCssBackgroundEnabled: true,
    isLandscapeEnabled: false,
    copies: 1,
  };
  prefs.printing = { ...(prefs.printing || {}), print_preview_sticky_settings: { appState: JSON.stringify(appState) } };
  writeFileSync(prefsPath, JSON.stringify(prefs));
}

/** Print once images are decoded, then close the window (Chrome exits with it). */
const AUTO_PRINT = `<script>
window.addEventListener('load', function () {
  var imgs = [].slice.call(document.images).map(function (i) { return i.decode ? i.decode().catch(function(){}) : null; });
  Promise.all(imgs).then(function () {
    setTimeout(function () { window.print(); setTimeout(function () { window.close(); }, 4000); }, 300);
  });
});
</script>`;

function cleanupOldJobs() {
  try {
    const cutoff = Date.now() - 10 * 60_000;
    for (const f of readdirSync(JOBS)) {
      const p = join(JOBS, f);
      if (statSync(p).mtimeMs < cutoff) unlinkSync(p);
    }
  } catch { /* nothing to clean */ }
}

function printHtml(html) {
  mkdirSync(JOBS, { recursive: true });
  cleanupOldJobs();
  pinPrintSettings();
  const file = join(JOBS, `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`);
  const withPrint = html.includes('</body>') ? html.replace('</body>', `${AUTO_PRINT}</body>`) : html + AUTO_PRINT;
  writeFileSync(file, withPrint, 'utf8');

  const child = spawn(CHROME, [
    `--user-data-dir=${PROFILE}`,
    '--kiosk-printing',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--window-size=420,640',
    '--window-position=40,40',
    '--new-window',
    pathToFileURL(file).href,
  ], { detached: false, stdio: 'ignore', windowsHide: false });

  // Safety net: if the window did not close itself, end only this Chrome tree.
  const timer = setTimeout(() => {
    if (child.exitCode === null && child.pid) execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], () => {});
  }, KILL_AFTER_MS);
  child.on('exit', () => clearTimeout(timer));
  child.on('error', (e) => { clearTimeout(timer); console.error('[print-agent] chrome failed:', e.message); });
}

/* ── Courier sticker: HTML → 203 dpi bitmap → raw TSPL ─────────────────────── */

const DOTS_PER_MM = 8; // 203 dpi
const STICKER_W_MM = 50;
const STICKER_H_MM = 70;
const STICKER_GAP_MM = 2;
const STICKER_SHIFT_DEFAULT_MM = -4; // measured: print landed ~4 mm low
const STICKER_W = STICKER_W_MM * DOTS_PER_MM; // 400 dots
const STICKER_H = STICKER_H_MM * DOTS_PER_MM; // 560 dots
const RASTER_PROFILE = join(HOME, 'chrome-raster');
const CSS_PX_PER_MM = 96 / 25.4;

/** Minimal PNG decoder for Chrome screenshots (8-bit RGB/RGBA, non-interlaced). */
function decodePng(buf) {
  let pos = 8;
  let width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (colorType !== 2 && colorType !== 6)) throw new Error('Unsupported PNG format');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[i] = v & 0xff;
    }
  }
  return { width, height, bpp, px };
}

/** Render the sticker document (stickers stacked, 50 x 70 mm each) to a PNG at 8 dots/mm. */
function renderStickerPng(htmlFile, pngFile, count) {
  const cssW = Math.round(STICKER_W_MM * CSS_PX_PER_MM);
  const cssH = Math.ceil(STICKER_H_MM * CSS_PX_PER_MM * count);
  const scale = STICKER_W / (STICKER_W_MM * CSS_PX_PER_MM);
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, [
      '--headless=new',
      `--user-data-dir=${RASTER_PROFILE}`,
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--default-background-color=FFFFFFFF',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${cssW},${cssH}`,
      '--virtual-time-budget=4000', // let the Bangla web font load
      `--screenshot=${pngFile}`,
      pathToFileURL(htmlFile).href,
    ], { stdio: 'ignore', windowsHide: true });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Sticker render timed out')); }, KILL_AFTER_MS);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('exit', () => {
      clearTimeout(timer);
      existsSync(pngFile) ? resolve() : reject(new Error('Sticker render failed'));
    });
  });
}

/** One label as TSPL BITMAP rows (bit 0 = black dot, as the driver emits). */
function labelBitmap(img, top) {
  const rowBytes = STICKER_W / 8;
  const out = Buffer.alloc(rowBytes * STICKER_H, 0xff);
  for (let y = 0; y < STICKER_H; y++) {
    const sy = top + y;
    if (sy >= img.height) break;
    for (let x = 0; x < STICKER_W && x < img.width; x++) {
      const i = (sy * img.width + x) * img.bpp;
      const lum = img.px[i] * 0.299 + img.px[i + 1] * 0.587 + img.px[i + 2] * 0.114;
      if (lum < 150) out[y * rowBytes + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  return out;
}

// The printer must learn this roll's label/gap positions once per agent run
// (GAPDETECT feeds a couple of blank labels). Set STICKER_CALIBRATE=0 to skip.
let stickerCalibrated = process.env.STICKER_CALIBRATE === '0';

function stickerTspl(img, count) {
  const refX = Math.round((Number(process.env.STICKER_REF_X_MM) || 0) * DOTS_PER_MM);
  const refY = Math.round((Number(process.env.STICKER_REF_Y_MM) || 0) * DOTS_PER_MM);
  // This XP-T361U starts printing ~4 mm below the label's top edge, which
  // pushed the footer off the bottom. SHIFT (negative = up) corrects it.
  const shiftMm = process.env.STICKER_SHIFT_MM != null && process.env.STICKER_SHIFT_MM !== ''
    ? Number(process.env.STICKER_SHIFT_MM) || 0 : STICKER_SHIFT_DEFAULT_MM;
  const shift = Math.round(shiftMm * DOTS_PER_MM);
  const parts = [Buffer.from([
    `SIZE ${STICKER_W_MM} mm,${STICKER_H_MM} mm`,
    `GAP ${STICKER_GAP_MM} mm,0 mm`,
    'DIRECTION 0,0', // same as the driver's "Portrait 180°" output
    `REFERENCE ${refX},${refY}`,
    `SHIFT ${shift}`,
    'OFFSET 0 mm',
    // Tear mode: after printing, the label is fed out to the tear bar and pulled
    // back to the next label's start before the next job. With TEAR OFF the
    // sticker stayed inside, got pulled out by hand, and every next print
    // started at a random point on the label (footer cut / spill-over).
    'SET TEAR ON',
    'SET PEEL OFF',
    'DENSITY 12',
    ...(stickerCalibrated ? [] : ['GAPDETECT']),
    '',
  ].join('\r\n'), 'ascii')];
  const rowBytes = STICKER_W / 8;
  for (let k = 0; k < count; k++) {
    parts.push(Buffer.from(`CLS\r\nBITMAP 0,0,${rowBytes},${STICKER_H},1,`, 'ascii'));
    parts.push(labelBitmap(img, k * STICKER_H));
    parts.push(Buffer.from('\r\nPRINT 1,1\r\n', 'ascii'));
  }
  return Buffer.concat(parts);
}

/** Send raw bytes to the printer through the Windows spooler (RAW datatype). */
const RAW_PS1 = `param([string]$Printer, [string]$Path)
$ErrorActionPreference = 'Stop'
trap { [Console]::Error.WriteLine($_.Exception.InnerException.Message + ' ' + $_.Exception.Message); exit 1 }
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class AksRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv")] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern int StartDocPrinter(IntPtr h, int l, DOCINFO di);
  [DllImport("winspool.drv")] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv")] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv")] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool WritePrinter(IntPtr h, byte[] b, int c, out int w);
  public static void Send(string p, byte[] data) {
    IntPtr h; if (!OpenPrinter(p, out h, IntPtr.Zero)) throw new Exception("OpenPrinter failed: " + Marshal.GetLastWin32Error());
    try {
      if (StartDocPrinter(h, 1, new DOCINFO { pDocName = "AKS courier sticker", pDataType = "RAW" }) == 0) throw new Exception("StartDocPrinter failed");
      StartPagePrinter(h); int w;
      if (!WritePrinter(h, data, data.Length, out w)) throw new Exception("WritePrinter failed: " + Marshal.GetLastWin32Error());
      EndPagePrinter(h); EndDocPrinter(h);
    } finally { ClosePrinter(h); }
  }
}
"@
[AksRaw]::Send($Printer, [IO.File]::ReadAllBytes($Path))
`;

function sendRaw(binFile) {
  const ps1 = join(HOME, 'send-raw.ps1');
  writeFileSync(ps1, RAW_PS1, 'utf8');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Printer', PRINTER, '-Path', binFile],
      { windowsHide: true, timeout: KILL_AFTER_MS },
      (err, _stdout, stderr) => (err ? reject(new Error(String(stderr || err.message).trim())) : resolve()));
  });
}

async function printStickers(html, count) {
  mkdirSync(JOBS, { recursive: true });
  cleanupOldJobs();
  const base = join(JOBS, `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  writeFileSync(`${base}.html`, html, 'utf8');
  await renderStickerPng(`${base}.html`, `${base}.png`, count);
  const img = decodePng(readFileSync(`${base}.png`));
  writeFileSync(`${base}.bin`, stickerTspl(img, count));
  await sendRaw(`${base}.bin`);
  stickerCalibrated = true;
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Chrome's Private Network Access: lets an https admin page reach 127.0.0.1.
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const allowed = cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(allowed ? 204 : 403); res.end(); return; }
  if (!allowed) return send(res, 403, { ok: false, error: 'Origin not allowed' });

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, printer: PRINTER, chrome: !!CHROME });
  }

  if (req.method === 'POST' && req.url === '/print') {
    if (!CHROME) return send(res, 500, { ok: false, error: 'Google Chrome not found (set CHROME_PATH)' });
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { send(res, 413, { ok: false, error: 'Receipt too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let html = '';
      try { html = String(JSON.parse(Buffer.concat(chunks).toString('utf8')).html || ''); } catch { /* bad json */ }
      if (!/<html[\s>]/i.test(html)) return send(res, 400, { ok: false, error: 'Expected { html }' });
      try {
        printHtml(html);
        console.log(`[print-agent] ${new Date().toLocaleTimeString()} receipt sent to ${PRINTER}`);
        send(res, 200, { ok: true, printer: PRINTER });
      } catch (e) {
        send(res, 500, { ok: false, error: e.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/sticker') {
    if (!CHROME) return send(res, 500, { ok: false, error: 'Google Chrome not found (set CHROME_PATH)' });
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { send(res, 413, { ok: false, error: 'Sticker job too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let html = '';
      let count = 0;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        html = String(body.html || '');
        count = Math.floor(Number(body.count) || 0);
      } catch { /* bad json */ }
      if (!/<html[\s>]/i.test(html) || count < 1 || count > 100) return send(res, 400, { ok: false, error: 'Expected { html, count }' });
      printStickers(html, count)
        .then(() => {
          console.log(`[print-agent] ${new Date().toLocaleTimeString()} ${count} sticker(s) sent to ${PRINTER}`);
          send(res, 200, { ok: true, printer: PRINTER });
        })
        .catch((e) => {
          console.error('[print-agent] sticker failed:', e.message);
          send(res, 500, { ok: false, error: e.message });
        });
    });
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[print-agent] AKS Mart print agent on http://127.0.0.1:${PORT}`);
  console.log(`[print-agent] printer: ${PRINTER}`);
  console.log(`[print-agent] chrome:  ${CHROME || 'NOT FOUND — set CHROME_PATH'}`);
});
