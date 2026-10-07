// AKS Mart — warehouse Packing Slip template.
//
// A pure, dependency-free HTML builder (only `import type`, no runtime imports)
// for the packing team, shared by the Packaging queue and the Manage Order page.
// It is deliberately NOT an invoice: no prices, no totals, no payment — only what
// the packer needs to pick, check, pack and hand off. Real order data only.

export interface PackingSlipItem {
  productName: string;
  productSku?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  /** Per-unit weight (kg) from the item's live product join, when available. */
  product?: { weight?: number | null } | null;
}

export interface PackingSlipData {
  orderNumber: string;
  trackingCode?: string | null;
  status?: string | null;
  source?: string | null;
  packedStatus?: string | null;
  packedAt?: string | null;
  packedBy?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: unknown;
  customerNote?: string | null;
  deliveryMethod?: string | null;
  pickupStore?: string | null;
  items?: PackingSlipItem[] | null;
}

export interface PackingSlipSettings {
  storeName: string;
  storeTagline: string;
  website: string;
  phone: string;
  email: string;
  returnPolicy: string;
  thankYouMessage: string;
}

/** Baseline branding used only if settings cannot be loaded (order data is never faked). */
export function emptyPackingSlipSettings(): PackingSlipSettings {
  return {
    storeName: 'AKS Mart',
    storeTagline: 'One Mart. Many Choices.',
    website: 'aksmartbd.com',
    phone: '+8801728-843503',
    email: 'info@aksmartbd.com',
    returnPolicy: '',
    thankYouMessage: 'Thank you for shopping with AKS Mart.',
  };
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Escape interpolated text so a product/customer value can never break the markup. */
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

/** Small title-caser for status tokens (pending → Pending, out_for_delivery → Out For Delivery). */
function titleCase(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/* ── A4 stylesheet (screen preview + print) ───────────────────────────────── */

const SLIP_CSS = `
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ background:#eef1f5; color:#111; font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif; font-size:12.5px; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .slip{ background:#fff; width:210mm; min-height:297mm; margin:16px auto; padding:14mm; box-shadow:0 2px 18px rgba(15,23,42,.10); }

  /* Toolbar — never printed */
  .toolbar{ position:fixed; top:14px; right:14px; display:flex; gap:8px; z-index:10; }
  .toolbar button{ font:inherit; font-weight:700; font-size:12px; padding:8px 14px; border-radius:8px; border:1px solid #d1d5db; background:#fff; color:#111; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .toolbar button.primary{ background:#111; border-color:#111; color:#fff; }

  /* Header */
  .hdr{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:2px solid #111; padding-bottom:10px; }
  .hdr-l{ display:flex; gap:12px; align-items:center; min-width:0; }
  .logo{ width:52px; height:52px; object-fit:contain; border:1px solid #e5e7eb; border-radius:8px; }
  .brand-name{ font-size:19px; font-weight:900; letter-spacing:-.3px; }
  .brand-tag{ font-size:11px; color:#4b5563; font-weight:600; margin-top:1px; }
  .brand-meta{ font-size:10.5px; color:#6b7280; margin-top:3px; line-height:1.6; overflow-wrap:anywhere; }
  .hdr-r{ text-align:right; flex-shrink:0; }
  .doc-title{ font-size:20px; font-weight:900; letter-spacing:2.5px; }
  .doc-sub{ font-size:11px; color:#4b5563; margin-top:3px; }
  .doc-track{ font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; font-weight:700; margin-top:2px; }

  /* Meta grid */
  .meta{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px 16px; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin:12px 0; }
  .meta .k{ font-size:9px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; }
  .meta .v{ font-weight:700; font-size:12px; overflow-wrap:anywhere; }

  /* Ship-to */
  .ship{ border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin-bottom:12px; }
  .ship h3, .block h3{ margin:0 0 6px; font-size:9.5px; text-transform:uppercase; letter-spacing:.7px; color:#374151; }
  .ship .nm{ font-size:14px; font-weight:800; }
  .ship .ln{ color:#1f2937; font-size:12.5px; overflow-wrap:anywhere; }
  .ship .grid{ display:grid; grid-template-columns:1fr 1fr; gap:4px 18px; margin-top:6px; }
  .ship .kv .k{ color:#6b7280; font-size:9.5px; text-transform:uppercase; letter-spacing:.5px; }
  .ship .kv .v{ font-weight:600; overflow-wrap:anywhere; }
  .ship .note{ margin-top:6px; padding:6px 8px; background:#f9fafb; border-left:3px solid #9ca3af; color:#374151; font-size:11.5px; overflow-wrap:anywhere; }

  /* Items — large, fast to scan, never split across pages */
  table.items{ width:100%; border-collapse:collapse; }
  table.items thead{ display:table-header-group; }
  table.items tr{ break-inside:avoid; page-break-inside:avoid; }
  table.items th{ text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.5px; color:#4b5563; border-bottom:2px solid #111; padding:7px 8px; }
  table.items td{ padding:9px 8px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
  table.items .c{ text-align:center; }
  table.items .idx{ color:#6b7280; font-weight:700; }
  table.items .pname{ font-size:13.5px; font-weight:800; overflow-wrap:anywhere; word-break:break-word; }
  table.items .sku{ font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; color:#374151; overflow-wrap:anywhere; }
  table.items .variant{ font-size:12px; color:#1f2937; overflow-wrap:anywhere; }
  table.items .qty{ font-size:16px; font-weight:900; }

  /* Package info + checklist side by side */
  .cols{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
  .block{ border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; break-inside:avoid; page-break-inside:avoid; }
  .block .row{ display:flex; justify-content:space-between; gap:10px; padding:2.5px 0; }
  .block .row .k{ color:#6b7280; }
  .block .row .v{ font-weight:700; text-align:right; overflow-wrap:anywhere; }
  .check{ list-style:none; margin:0; padding:0; }
  .check li{ display:flex; align-items:center; gap:9px; padding:4.5px 0; font-size:12.5px; }
  .check .box{ display:inline-block; width:15px; height:15px; border:1.5px solid #111; border-radius:3px; flex-shrink:0; }

  /* Staff signatures */
  .staff{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:22px; break-inside:avoid; page-break-inside:avoid; }
  .staff .val{ font-size:11.5px; font-weight:700; color:#111; text-align:center; min-height:16px; }
  .staff .line{ border-top:1px solid #111; padding-top:5px; font-size:10.5px; color:#4b5563; text-align:center; }

  /* Footer */
  .footer{ margin-top:18px; border-top:1px solid #e5e7eb; padding-top:10px; color:#4b5563; font-size:11px; }
  .footer .policy{ margin:0 0 5px; }
  .footer .support{ margin:0; }
  .thanks{ margin-top:8px; font-weight:900; font-size:12.5px; color:#111; }

  /* Print — A4, no chrome */
  @page{ size:A4; margin:12mm; }
  @media print{
    html,body{ background:#fff; }
    .no-print{ display:none !important; }
    .slip{ width:auto; min-height:auto; margin:0; padding:0; box-shadow:none; }
  }
`;

/** Concise exchange/return line used when Admin → Settings has no custom policy. */
const DEFAULT_EXCHANGE_NOTE =
  'Not the right item? Contact us within 30 days of delivery for an exchange or refund on eligible items.';

/* ── The packing slip document ────────────────────────────────────────────── */

export interface BuildPackingSlipOptions {
  /** Absolute URL of the AKS Mart logo (reused from the project assets). */
  logoUrl?: string;
}

export function buildPackingSlipHtml(
  data: PackingSlipData,
  settings: PackingSlipSettings,
  opts: BuildPackingSlipOptions = {}
): string {
  const addr = parseAddress(data.customerAddress);
  const items = Array.isArray(data.items) ? data.items : [];

  // No dedicated slip-number field is stored, so it is derived deterministically
  // from the real order number — never invented.
  const slipNo = `PS-${data.orderNumber}`;
  const source = data.source === 'pos' ? 'POS / Counter' : 'Website';

  const recipient = addr.fullName || data.customerName || '—';
  const phone = addr.phone || data.customerPhone || '';
  const fullAddress = [addr.streetAddress, addr.thana, addr.district, addr.division]
    .filter(Boolean).join(', ');
  const area = addr.thana || '';
  const district = addr.district || '';
  const instructions = String(addr.deliveryInstructions || '').trim() || String(data.customerNote || '').trim();

  // ── Items — no prices anywhere ─────────────────────────────────────────────
  const totalItems = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  let totalWeight = 0;
  let hasWeight = false;
  const rows = items.map((it, index) => {
    const qty = Number(it.quantity) || 0;
    const weight = it.product?.weight != null ? Number(it.product.weight) : null;
    if (weight != null && weight > 0) {
      hasWeight = true;
      totalWeight += weight * qty;
    }
    const variant = [it.size, it.color && it.color !== 'Default' ? it.color : ''].filter(Boolean).join(' · ');
    return `
      <tr>
        <td class="c idx">${index + 1}</td>
        <td class="pname">${esc(it.productName)}</td>
        <td class="sku">${esc(it.productSku || '—')}</td>
        <td class="variant">${variant ? esc(variant) : '—'}</td>
        <td class="c qty">${qty}</td>
      </tr>`;
  }).join('');

  const logo = opts.logoUrl
    ? `<img id="aks-slip-logo" class="logo" src="${esc(opts.logoUrl)}" alt="${esc(settings.storeName)} logo" />`
    : '';

  const website = (settings.website || '').replace(/^https?:\/\//i, '');
  const websiteDisplay = website && !/^www\./i.test(website) ? `www.${website}` : website;
  const supportLine = [settings.phone, settings.email].filter(Boolean).join(' · ');
  const exchangeNote = settings.returnPolicy || DEFAULT_EXCHANGE_NOTE;

  // Package block — only rows the system actually has. Package number and delivery
  // partner are not stored anywhere, so they are omitted rather than invented.
  const packageRows = [
    `<div class="row"><span class="k">Total Items</span><span class="v">${totalItems}</span></div>`,
    hasWeight ? `<div class="row"><span class="k">Total Weight</span><span class="v">${totalWeight.toFixed(2)} kg</span></div>` : '',
    data.trackingCode ? `<div class="row"><span class="k">Tracking Number</span><span class="v">${esc(data.trackingCode)}</span></div>` : '',
  ].filter(Boolean).join('');

  const checklist = [
    'Product Checked',
    'Quantity Checked',
    'Variant Checked',
    'Packaging Checked',
    'Invoice Included',
    'Packed',
  ].map((label) => `<li><span class="box"></span><span>${esc(label)}</span></li>`).join('');

  const packedBy = data.packedBy || '';
  const packedAt = formatDateTime(data.packedAt);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Packing Slip ${esc(slipNo)} — ${esc(settings.storeName)}</title>
  <style>${SLIP_CSS}</style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <div class="slip">
    <header class="hdr">
      <div class="hdr-l">
        ${logo}
        <div>
          <div class="brand-name">${esc(settings.storeName)}</div>
          <div class="brand-tag">${esc(settings.storeTagline)}</div>
          <div class="brand-meta">
            ${websiteDisplay ? `<div>${esc(websiteDisplay)}</div>` : ''}
            ${supportLine ? `<div>${esc(supportLine)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="hdr-r">
        <div class="doc-title">PACKING SLIP</div>
        <div class="doc-sub">${esc(slipNo)}</div>
        ${data.trackingCode ? `<div class="doc-track">${esc(data.trackingCode)}</div>` : ''}
      </div>
    </header>

    <div class="meta">
      <div><div class="k">Packing Slip No.</div><div class="v">${esc(slipNo)}</div></div>
      <div><div class="k">Order No.</div><div class="v">${esc(data.orderNumber)}</div></div>
      <div><div class="k">Order Date</div><div class="v">${esc(formatDate(data.createdAt) || '—')}</div></div>
      <div><div class="k">Packed Date</div><div class="v">${esc(formatDate(data.packedAt) || '—')}</div></div>
      <div><div class="k">Order Status</div><div class="v">${esc(titleCase(data.status) || '—')}</div></div>
      <div><div class="k">Packing Status</div><div class="v">${esc(titleCase(data.packedStatus) || '—')}</div></div>
      <div><div class="k">Order Source</div><div class="v">${esc(source)}</div></div>
    </div>

    <div class="ship">
      <h3>Ship To</h3>
      <div class="nm">${esc(recipient)}</div>
      ${phone ? `<div class="ln">${esc(phone)}</div>` : ''}
      ${fullAddress ? `<div class="ln">${esc(fullAddress)}</div>` : ''}
      <div class="grid">
        <div class="kv"><div class="k">Area</div><div class="v">${esc(area || '—')}</div></div>
        <div class="kv"><div class="k">District</div><div class="v">${esc(district || '—')}</div></div>
      </div>
      ${instructions ? `<div class="note"><strong>Delivery instructions:</strong> ${esc(instructions)}</div>` : ''}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th class="c" style="width:34px">#</th>
          <th>Product</th>
          <th style="width:120px">SKU</th>
          <th style="width:190px">Variant / Options</th>
          <th class="c" style="width:70px">Qty</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:16px">No line items</td></tr>`}
      </tbody>
    </table>

    <div class="cols">
      <div class="block">
        <h3>Package Information</h3>
        ${packageRows}
      </div>
      <div class="block">
        <h3>Packing Checklist</h3>
        <ul class="check">${checklist}</ul>
      </div>
    </div>

    <div class="staff">
      <div><div class="val">${esc(packedBy)}</div><div class="line">Packed By</div></div>
      <div><div class="val"></div><div class="line">Checked By</div></div>
      <div><div class="val">${esc(packedAt)}</div><div class="line">Packing Date / Time</div></div>
    </div>

    <div class="footer">
      <p class="policy">${esc(exchangeNote)}</p>
      <p class="support">Support: ${esc(supportLine || settings.storeName)}${websiteDisplay ? ` · ${esc(websiteDisplay)}` : ''}</p>
      <div class="thanks">${esc(settings.thankYouMessage)}</div>
    </div>
  </div>
</body>
</html>`;
}
