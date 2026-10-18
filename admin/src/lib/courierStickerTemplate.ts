// AKS Mart — courier packaging sticker, 50 mm × 70 mm (portrait) thermal label.
//
// A pure, dependency-free HTML builder (only `import type`-style local types, no
// runtime imports) used by the Packaging queue. It is a compact re-layout of the
// AKS Mart bilingual shipping label for a small die-cut label — not a scaled-down
// A4 page — and prints black on white for monochrome thermal heads. AKS red is
// used only in the on-screen preview. Real order data only; nothing is invented.

export interface CourierStickerItem {
  productName: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}

export interface CourierStickerData {
  orderNumber: string;
  trackingCode?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: unknown;
  deliveryMethod?: string | null;
  pickupStore?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  total?: number | null;
  paidAmount?: number | null;
  dueAmount?: number | null;
  items?: CourierStickerItem[] | null;
}

export interface CourierStickerSettings {
  storeName: string;
  storeTagline: string;
  mottoBn: string;
  phone: string;
  currencySymbol: string;
}

/** Baseline branding used only if settings cannot be loaded (order data is never faked). */
export const DEFAULT_MOTTO_BN = 'গুণগত মানে আপসহীন, মানবিকতায় অঙ্গীকারবদ্ধ।';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseAddress(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, string>;
  return {};
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${(Number(amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  card: 'Card',
  bank: 'Bank Transfer',
};

/* ── Code 128 barcode (pure SVG, no library) ──────────────────────────────── */

// Bar/space module widths for Code 128 symbol values 0–106 (106 = stop).
const C128 = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 ' +
  '122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 ' +
  '322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 ' +
  '112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 ' +
  '331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 ' +
  '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 ' +
  '124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 ' +
  '411311 113141 114131 311141 411131 211412 211214 211232 2331112'
).split(' ');

/**
 * Encode text as Code 128 symbol values (Code B, switching to Code C for a long
 * trailing digit run such as the timestamp in ORD-1729…). Returns null for text
 * outside printable ASCII.
 */
function code128Values(text: string): number[] | null {
  if (!text || !/^[\x20-\x7e]+$/.test(text)) return null;
  const trailing = /\d*$/.exec(text)?.[0] ?? '';
  const cLen = trailing.length >= 4 ? trailing.length - (trailing.length % 2) : 0;
  const bPart = text.slice(0, text.length - cLen);
  const cPart = text.slice(text.length - cLen);
  const values: number[] = [];
  if (!bPart) values.push(105); // Start C
  else {
    values.push(104); // Start B
    for (const ch of bPart) values.push(ch.charCodeAt(0) - 32);
    if (cPart) values.push(99); // Switch to Code C
  }
  for (let i = 0; i < cPart.length; i += 2) values.push(Number(cPart.slice(i, i + 2)));
  const check = values.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  values.push(check, 106);
  return values;
}

/** Crisp SVG barcode; `null` when it cannot stay scannable in `maxWidthMm`. */
function code128Svg(text: string, maxWidthMm: number, heightMm: number): string | null {
  const values = code128Values(text);
  if (!values) return null;
  const quiet = 6; // modules of quiet zone each side (1.5 mm at 0.25 mm; keeps bars inside the label margins)
  let x = quiet;
  const bars: string[] = [];
  for (const v of values) {
    const widths = C128[v];
    for (let i = 0; i < widths.length; i++) {
      const w = Number(widths[i]);
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="1"/>`);
      x += w;
    }
  }
  const total = x + quiet;
  // 0.25 mm ≈ 2 dots at 203 dpi; below ~0.19 mm (1.5 dots) scanners start to fail.
  const module = Math.min(0.25, maxWidthMm / total);
  if (module < 0.19) return null;
  return `<svg class="bc" xmlns="http://www.w3.org/2000/svg" width="${(total * module).toFixed(2)}mm" height="${heightMm}mm" viewBox="0 0 ${total} 1" preserveAspectRatio="none" shape-rendering="crispEdges" fill="#000">${bars.join('')}</svg>`;
}

/* ── Stylesheet: exact 50 × 70 mm page (portrait) ─────────────────────────── */

const STICKER_CSS = `
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ background:#e5e7eb; color:#000; font-family:Arial,Helvetica,'Noto Sans Bengali','Nirmala UI',sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .bn{ font-family:'Noto Sans Bengali','Nirmala UI','Vrinda',sans-serif; }

  /* Toolbar — screen only */
  .toolbar{ position:fixed; top:12px; right:12px; display:flex; gap:8px; z-index:10; }
  .toolbar button{ font:700 12px Arial,sans-serif; padding:8px 14px; border-radius:8px; border:1px solid #d1d5db; background:#fff; color:#111; cursor:pointer; }
  .toolbar button.primary{ background:#111; border-color:#111; color:#fff; }
  .hint{ font:12px Arial,sans-serif; color:#6b7280; text-align:center; margin:14px 16px 0; }

  /* The label itself — always exactly 50 mm wide × 70 mm tall */
  .sticker{
    width:50mm; height:70mm; overflow:hidden; background:#fff; position:relative;
    padding:2.4mm 2.5mm 2.1mm; display:grid;
    grid-template-rows:9mm 6.5mm minmax(0,1fr) 10mm 9mm 7.6mm 3.6mm;
    break-after:page; page-break-after:always; break-inside:avoid;
  }
  .sticker:last-child{ break-after:auto; page-break-after:auto; }
  .sticker > *{ min-width:0; min-height:0; overflow:hidden; }

  /* Brand */
  .hdr{ display:flex; align-items:center; gap:1.6mm; border-bottom:0.35mm solid #000; padding-bottom:0.8mm; }
  .logo{ width:7.5mm; height:7.5mm; object-fit:contain; flex-shrink:0; }
  .bname{ font-size:11pt; font-weight:900; line-height:1; white-space:nowrap; }
  .btag{ font-size:6pt; font-weight:700; line-height:1.2; margin-top:0.6mm; white-space:nowrap; }

  /* Order ID + date */
  .ord{ padding-top:0.7mm; line-height:1.15; }
  .ord .top{ display:flex; justify-content:space-between; gap:1mm; font-size:5.6pt; font-weight:700; white-space:nowrap; }
  .ord .k{ text-transform:uppercase; letter-spacing:0.3pt; }
  .ord .no{ font-size:9pt; font-weight:900; white-space:nowrap; letter-spacing:0.1pt; }

  /* Ship-to */
  .lbl{ font-size:5.6pt; font-weight:700; text-transform:uppercase; letter-spacing:0.3pt; line-height:1.25; }
  .to{ border-top:0.25mm solid #000; padding:0.4mm 0; display:flex; flex-direction:column; justify-content:center; }
  .nm{ font-size:9.5pt; font-weight:900; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ph{ font-size:9.5pt; font-weight:900; line-height:1.1; letter-spacing:0.2pt; white-space:nowrap; }
  .ad{ font-size:7pt; font-weight:600; line-height:1.15; overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }
  .ar{ font-size:7.3pt; font-weight:900; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* Payment strip */
  .pay{ display:flex; align-items:center; justify-content:space-between; gap:1.5mm; border:0.35mm solid #000; border-radius:1mm; padding:0.4mm 1.5mm; margin:0.3mm 0; }
  .chip{ background:#000; color:#fff; font-size:10.5pt; font-weight:900; line-height:1; padding:0.8mm 1.8mm; border-radius:0.6mm; letter-spacing:0.5pt; flex-shrink:0; }
  .pay .val{ text-align:right; min-width:0; line-height:1.1; }
  .pay .k{ font-size:5.3pt; font-weight:700; text-transform:uppercase; white-space:nowrap; }
  .pay .amt{ font-size:11pt; font-weight:900; white-space:nowrap; }
  .pay .mt{ font-size:5.5pt; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* Items */
  .items{ display:flex; flex-direction:column; justify-content:center; }
  .it{ font-size:6.5pt; font-weight:700; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .it b{ font-weight:900; }
  .it.one{ white-space:normal; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; }

  /* Barcode (full width) */
  .bcw{ display:flex; flex-direction:column; align-items:center; justify-content:center; border-top:0.35mm solid #000; padding-top:0.5mm; }
  .bc{ display:block; }
  .bct{ font-size:5.5pt; font-weight:700; letter-spacing:0.4pt; line-height:1.1; margin-top:0.3mm; white-space:nowrap; }

  /* Footer: Bangla slogan (one line) */
  .ftr{ display:flex; align-items:center; justify-content:center; text-align:center; border-top:0.25mm solid #000; font-size:5.3pt; font-weight:700; line-height:1.15; padding-top:0.3mm; white-space:nowrap; }

  /* Screen preview: enlarged, with AKS red accents (never sent to the printer) */
  @media screen{
    .sheet{ padding:64px 16px 24px; display:flex; flex-wrap:wrap; justify-content:center; gap:18px; }
    .sticker{ zoom:2.2; box-shadow:0 1px 6px rgba(0,0,0,.18); }
    .bname .r{ color:#D8232A; }
    .chip{ background:#D8232A; }
    .hdr{ border-bottom-color:#D8232A; }
  }

  /* Raster mode: the print agent screenshots this at 203 dpi — print styles on screen */
  body.raster{ background:#fff; }
  body.raster .sheet{ padding:0; display:block; }
  body.raster .sticker{ zoom:1; box-shadow:none; }
  body.raster .bname .r{ color:#000; }
  body.raster .chip{ background:#000; }
  body.raster .hdr{ border-bottom-color:#000; }

  /* Print: exactly one 50 × 70 mm page per sticker, nothing else */
  @page{ size:50mm 70mm; margin:0; }
  @media print{
    html,body{ width:50mm; background:#fff; }
    .no-print{ display:none !important; }
    .sheet{ padding:0; margin:0; }
  }
`;

/* ── One sticker ──────────────────────────────────────────────────────────── */

function stickerBody(data: CourierStickerData, settings: CourierStickerSettings, logoUrl?: string): string {
  const addr = parseAddress(data.customerAddress);
  const items = Array.isArray(data.items) ? data.items : [];
  const symbol = settings.currencySymbol || '৳';

  const name = addr.fullName || data.customerName || '—';
  const phone = addr.phone || data.customerPhone || '';
  const pickup = data.deliveryMethod === 'pickup';
  const street = pickup
    ? `Store pickup${data.pickupStore ? ` — ${data.pickupStore}` : ''}`
    : [addr.streetAddress].filter(Boolean).join(', ');
  const area = pickup ? '' : [addr.thana, addr.district].filter(Boolean).join(', ');

  // Payment: what the courier must collect. Due falls back to total − paid.
  const total = Number(data.total) || 0;
  const due = data.dueAmount != null
    ? Math.max(0, Number(data.dueAmount) || 0)
    : Math.max(0, total - (Number(data.paidAmount) || 0));
  const method = String(data.paymentMethod || '').toLowerCase();
  const paid = data.paymentStatus === 'paid' || (data.total != null && due <= 0);
  const chip = paid ? 'PAID' : method === 'cod' || !method ? 'COD' : 'DUE';
  const methodLabel = METHOD_LABELS[method] || (method ? method.toUpperCase() : '');

  // Items: up to two lines; beyond that a compact "+N more" summary.
  const pcs = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const line = (it: CourierStickerItem, cls = 'it') => {
    const variant = [it.size, it.color && it.color !== 'Default' ? it.color : ''].filter(Boolean).join('/');
    return `<div class="${cls}"><b>${Number(it.quantity) || 0}×</b> ${esc(it.productName)}${variant ? ` (${esc(variant)})` : ''}</div>`;
  };
  const itemLines = items.length === 0
    ? '<div class="it">—</div>'
    : items.length === 1
    ? line(items[0], 'it one')
    : items.length === 2
    ? items.map((it) => line(it)).join('')
    : `${line(items[0])}<div class="it"><b>+ ${items.length - 1} more item${items.length - 1 > 1 ? 's' : ''}</b></div>`;

  const barcode = code128Svg(data.orderNumber, 45, 4.8);
  const logo = logoUrl ? `<img class="logo aks-sticker-logo" src="${esc(logoUrl)}" alt="" />` : '';
  const [first, ...rest] = String(settings.storeName || 'AKS Mart').split(' ');
  const date = formatDate(data.createdAt);

  return `
  <div class="sticker">
    <header class="hdr">
      ${logo}
      <div style="min-width:0">
        <div class="bname">${esc(first)}${rest.length ? ` <span class="r">${esc(rest.join(' '))}</span>` : ''}</div>
        <div class="btag">${esc(settings.storeTagline)}</div>
      </div>
    </header>

    <section class="ord">
      <div class="top"><span class="k">Order ID</span>${date ? `<span>${esc(date)}</span>` : ''}</div>
      <div class="no">${esc(data.orderNumber)}</div>
    </section>

    <section class="to">
      <div class="lbl"><span class="bn">প্রাপক</span> / Ship To</div>
      <div class="nm">${esc(name)}</div>
      ${phone ? `<div class="ph">${esc(phone)}</div>` : ''}
      ${street ? `<div class="ad">${esc(street)}</div>` : ''}
      ${area ? `<div class="ar">${esc(area)}</div>` : ''}
    </section>

    <section class="pay">
      <div class="chip">${chip}</div>
      <div class="val">
        <div class="k">${paid ? 'Collect' : '<span class="bn">আদায়</span> / Collect'}</div>
        <div class="amt">${esc(formatMoney(paid ? 0 : due, symbol))}</div>
        ${methodLabel ? `<div class="mt">${esc(methodLabel)}</div>` : ''}
      </div>
    </section>

    <section class="items">
      <div class="lbl">Items · ${items.length} (${pcs} pcs)</div>
      ${itemLines}
    </section>

    ${barcode ? `<section class="bcw">${barcode}<div class="bct">${esc(data.orderNumber)}</div></section>` : '<section class="bcw"></section>'}

    <footer class="ftr bn">${esc(settings.mottoBn || DEFAULT_MOTTO_BN)}</footer>
  </div>`;
}

/* ── The document (one page per order) ────────────────────────────────────── */

export interface BuildCourierStickerOptions {
  /** URL of the pure black/white AKS Mart print logo. */
  logoUrl?: string;
  /** Bare black/white document for the print agent's 203 dpi rasteriser (no toolbar/zoom). */
  raster?: boolean;
}

export function buildCourierStickerHtml(
  orders: CourierStickerData[],
  settings: CourierStickerSettings,
  opts: BuildCourierStickerOptions = {}
): string {
  const title = orders.length === 1 ? `Sticker ${orders[0].orderNumber}` : `${orders.length} Stickers`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — ${esc(settings.storeName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@600;700&display=swap" />
  <style>${STICKER_CSS}</style>
</head>
<body${opts.raster ? ' class="raster"' : ''}>
  ${opts.raster ? '' : `<div class="toolbar no-print">
    <button type="button" onclick="window.close()">Close</button>
  </div>`}
  <div class="sheet">
    ${orders.map((o) => stickerBody(o, settings, opts.logoUrl)).join('')}
  </div>
  ${opts.raster ? '' : '<p class="hint no-print">Preview only (enlarged). To print, close this and press <b>Print Sticker</b> on the Packaging page. Browser printing goes through the label driver, which misplaces 50 × 70 mm stickers.</p>'}
</body>
</html>`;
}
