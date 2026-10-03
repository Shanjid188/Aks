// AKS Mart — professional A4 e-commerce invoice template.
//
// Pure, dependency-free HTML builder (only `import type`, no runtime imports) so
// it can be rendered/tested outside the browser and shared by every print entry
// point (the Invoices register and the Manage Order page). The markup is written
// into a dedicated about:blank window, which keeps the admin chrome out of the
// printout automatically, and every value comes from the real order + store
// settings — nothing is hard-coded.
import type { Order, OrderItem } from '../types';

/* ── Value formatting ─────────────────────────────────────────────────────── */

/** Escape any interpolated text so a product/customer name can never break the markup. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Bangladeshi taka (৳) or the merchant's configured symbol. `en-IN` grouping matches BD lakh/crore. */
export function formatMoney(amount: number | null | undefined, symbol = '৳'): string {
  const n = Number(amount ?? 0) || 0;
  return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** The order's shipping address is stored as JSON text; parse defensively. */
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

/* ── Store settings consumed by the invoice ───────────────────────────────── */

export interface InvoiceSettings {
  storeName: string;
  storeTagline: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  returnPolicy: string;
  invoiceFooter: string;
  thankYouMessage: string;
  /** payment-method id → label (e.g. cod → Cash on Delivery) */
  paymentLabels: Record<string, string>;
  /** delivery-zone id → label (e.g. inside_dhaka → Inside Dhaka) */
  zoneLabels: Record<string, string>;
}

/**
 * The merchant's real 30-day return promise (mirrors the storefront
 * "Return & Refund Policy" page). Used only when Admin → Settings has no custom
 * `returnPolicy` copy — never a placeholder.
 */
export const DEFAULT_RETURN_POLICY =
  'Easy returns within 30 days of delivery on eligible items. Food, perishable goods and personalised print items cannot be returned once delivered unless damaged or incorrect.';

/** Fallback id→label maps — identical wording to the checkout configuration. */
const PAYMENT_LABEL_FALLBACK: Record<string, string> = {
  cod: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad', bank: 'Bank transfer',
  card: 'Card', cash: 'Cash', rocket: 'Rocket',
};
const ZONE_LABEL_FALLBACK: Record<string, string> = {
  inside_dhaka: 'Inside Dhaka', sub_dhaka: 'Sub-Dhaka Area', outside_dhaka: 'Outside Dhaka',
  pickup: 'Store Pickup',
};

/** Baseline settings used when the API is unreachable (branding only — order data is never faked). */
export function emptyInvoiceSettings(): InvoiceSettings {
  return {
    storeName: 'AKS Mart',
    storeTagline: 'One Mart. Many Choices.',
    website: 'aksmartbd.com',
    phone: '+8801728-843503',
    email: 'info@aksgarments.com.bd',
    address: 'Paltan Tower, 87 Purana Paltan Line, Dhaka',
    currencySymbol: '৳',
    returnPolicy: DEFAULT_RETURN_POLICY,
    invoiceFooter: '',
    thankYouMessage: 'Thank you for shopping with AKS Mart.',
    paymentLabels: { ...PAYMENT_LABEL_FALLBACK },
    zoneLabels: { ...ZONE_LABEL_FALLBACK },
  };
}

export interface BuildInvoiceOptions {
  /** Absolute URL of the AKS Mart logo (reused from the project assets). */
  logoUrl?: string;
}

/* ── The A4 stylesheet (screen preview + print) ───────────────────────────── */

const INVOICE_CSS = `
  :root{ --brand:#D8232A; --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --soft:#f9fafb; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ background:#eef1f5; color:var(--ink); font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  a{ color:inherit; text-decoration:none; }
  .inv{ background:#fff; width:210mm; min-height:297mm; margin:16px auto; padding:14mm 14mm 16mm; box-shadow:0 2px 18px rgba(15,23,42,.10); }

  /* Toolbar — never printed */
  .toolbar{ position:fixed; top:14px; right:14px; display:flex; gap:8px; z-index:10; }
  .toolbar button{ font:inherit; font-weight:700; font-size:12px; padding:8px 14px; border-radius:8px; border:1px solid #d1d5db; background:#fff; color:#111827; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .toolbar button.primary{ background:var(--brand); border-color:var(--brand); color:#fff; }

  /* Header */
  .hdr{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:3px solid var(--brand); padding-bottom:12px; }
  .hdr-l{ display:flex; gap:12px; align-items:center; min-width:0; }
  .logo{ width:58px; height:58px; object-fit:contain; border-radius:10px; border:1px solid var(--line); background:#fff; }
  .brand-name{ font-size:20px; font-weight:900; letter-spacing:-.4px; }
  .brand-tag{ color:var(--brand); font-weight:700; font-size:11px; margin-top:1px; }
  .brand-meta{ color:var(--muted); font-size:10.5px; margin-top:4px; line-height:1.6; overflow-wrap:anywhere; }
  .hdr-r{ text-align:right; flex-shrink:0; }
  .inv-title{ font-size:22px; font-weight:900; letter-spacing:3px; color:var(--brand); line-height:1; }
  .inv-no{ font-weight:800; font-size:13px; margin-top:6px; }
  .inv-date{ color:var(--muted); font-size:11px; margin-top:2px; }
  .addr-bar{ display:flex; flex-wrap:wrap; gap:2px 14px; color:#374151; font-size:11px; padding:8px 0 0; }

  /* Meta grid */
  .meta{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px 16px; border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin:14px 0; background:var(--soft); }
  .meta .k{ color:var(--muted); font-size:9.5px; text-transform:uppercase; letter-spacing:.6px; }
  .meta .v{ font-weight:700; font-size:12px; overflow-wrap:anywhere; }

  /* Party blocks */
  .parties{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
  .party{ border:1px solid var(--line); border-radius:10px; padding:10px 14px; }
  .party h3{ margin:0 0 6px; font-size:9.5px; text-transform:uppercase; letter-spacing:.7px; color:var(--brand); }
  .party .nm{ font-weight:800; font-size:12.5px; }
  .party .ln{ color:#374151; line-height:1.6; overflow-wrap:anywhere; }
  .party .muted{ color:var(--muted); }

  /* Items */
  table.items{ width:100%; border-collapse:collapse; }
  table.items thead{ display:table-header-group; }
  table.items tr{ break-inside:avoid; page-break-inside:avoid; }
  table.items th{ text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); border-bottom:2px solid var(--ink); padding:7px 8px; }
  table.items td{ padding:8px; border-bottom:1px solid var(--line); vertical-align:top; }
  table.items .c{ text-align:center; }
  table.items .r{ text-align:right; }
  table.items .pname{ font-weight:700; overflow-wrap:anywhere; word-break:break-word; }
  table.items .pvar{ color:var(--muted); font-size:10.5px; margin-top:2px; overflow-wrap:anywhere; }
  table.items .sku{ font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:10.5px; color:#374151; overflow-wrap:anywhere; }

  /* Payment + totals */
  .bottom{ display:grid; grid-template-columns:1fr 300px; gap:16px; margin-top:16px; align-items:start; }
  .pay{ border:1px solid var(--line); border-radius:10px; padding:10px 14px; }
  .pay h3{ margin:0 0 8px; font-size:9.5px; text-transform:uppercase; letter-spacing:.7px; color:var(--brand); }
  .pay .row{ display:flex; justify-content:space-between; gap:12px; padding:2.5px 0; }
  .pay .row .k{ color:var(--muted); }
  .pay .row .v{ font-weight:700; text-align:right; overflow-wrap:anywhere; }
  .badge{ display:inline-block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; padding:2px 8px; border-radius:999px; border:1px solid transparent; }
  .badge.paid{ background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
  .badge.partial{ background:#fef3c7; color:#b45309; border-color:#fde68a; }
  .badge.refunded{ background:#e5e7eb; color:#374151; border-color:#d1d5db; }
  .badge.unpaid{ background:#fee2e2; color:#b91c1c; border-color:#fecaca; }

  .totals{ border:1px solid var(--line); border-radius:10px; padding:10px 14px; }
  .totals .row{ display:flex; justify-content:space-between; gap:12px; padding:4px 0; border-bottom:1px dashed var(--line); }
  .totals .row .k{ color:#374151; }
  .totals .row .v{ font-weight:700; white-space:nowrap; }
  .totals .grand{ margin-top:6px; padding-top:8px; border-top:2px solid var(--ink); border-bottom:none; font-weight:900; font-size:15px; color:var(--brand); }
  .totals .due .v{ color:var(--brand); }

  /* Footer */
  .footer{ margin-top:20px; border-top:1px solid var(--line); padding-top:12px; color:#4b5563; font-size:10.5px; }
  .footer .policy{ margin:0 0 6px; }
  .footer .support{ margin:0; }
  .footer .extra{ margin:6px 0 0; color:#6b7280; }
  .thanks{ margin-top:10px; font-weight:900; font-size:12.5px; color:var(--brand); }
  .sig{ display:flex; justify-content:space-between; gap:48px; margin-top:34px; page-break-inside:avoid; }
  .sig .sign{ flex:1; max-width:230px; border-top:1px solid var(--ink); padding-top:6px; text-align:center; color:#4b5563; font-size:11px; }

  /* Print — A4, no chrome, keep rows whole */
  @page{ size:A4; margin:12mm; }
  @media print{
    html,body{ background:#fff; }
    .no-print{ display:none !important; }
    .inv{ width:auto; min-height:auto; margin:0; padding:0; box-shadow:none; }
  }
`;

/* ── The invoice document ─────────────────────────────────────────────────── */

export function buildInvoiceHtml(
  order: Order,
  settings: InvoiceSettings,
  opts: BuildInvoiceOptions = {}
): string {
  const symbol = settings.currencySymbol || '৳';
  const money = (n: number | null | undefined) => formatMoney(n, symbol);
  const addr = parseAddress(order.customerAddress);
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  const invoiceNo = order.invoiceNumber || order.orderNumber;
  // The invoice is issued together with the order (the API assigns invoiceNumber
  // at creation), so the invoice date is the order date — nothing is invented.
  const orderDate = order.createdAt;
  const invoiceDate = order.createdAt;

  const payMethodLabel = settings.paymentLabels[order.paymentMethod]
    || PAYMENT_LABEL_FALLBACK[order.paymentMethod]
    || order.paymentMethod || '—';
  const zoneLabel = settings.zoneLabels[order.deliveryMethod]
    || ZONE_LABEL_FALLBACK[order.deliveryMethod]
    || order.deliveryMethod || '—';
  const payStatus = (order.paymentStatus || 'unpaid').toLowerCase();
  const source = order.source === 'pos' ? 'POS / Counter' : 'Website';

  const customerName = order.customerName || addr.fullName || 'Walk-in Customer';
  const customerPhone = order.customerPhone || addr.phone || '';
  const customerEmail = order.customerEmail || addr.email || '';
  const billingAddress = [addr.streetAddress, addr.thana, addr.district, addr.division, addr.postalCode]
    .filter(Boolean).join(', ');

  // ── Line items + honest discount maths ─────────────────────────────────────
  // Each row's "discount" is the real gap between the product's MRP
  // (`originalPrice`) and the charged unit price; the product-discount total is
  // the sum of those gaps, so "Subtotal − Product Discount" always equals the
  // order's stored subtotal.
  let productDiscount = 0;
  const rows = items.map((it, index) => {
    const unit = Number(it.price) || 0;
    const qty = Number(it.quantity) || 0;
    const mrp = it.product?.originalPrice != null ? Number(it.product.originalPrice) : null;
    const unitList = mrp != null && mrp > unit ? mrp : unit;
    const lineDiscount = (unitList - unit) * qty;
    productDiscount += lineDiscount;
    const lineTotal = unit * qty;
    const variant = [it.size, it.color && it.color !== 'Default' ? it.color : ''].filter(Boolean).join(' · ');
    return `
      <tr>
        <td class="c">${index + 1}</td>
        <td>
          <div class="pname">${esc(it.productName)}</div>
          ${variant ? `<div class="pvar">${esc(variant)}</div>` : ''}
        </td>
        <td class="sku">${esc(it.productSku || '—')}</td>
        <td class="c">${qty}</td>
        <td class="r">${money(unit)}</td>
        <td class="r">${lineDiscount > 0 ? '−' + money(lineDiscount) : '—'}</td>
        <td class="r">${money(lineTotal)}</td>
      </tr>`;
  }).join('');

  const subtotalStored = Number(order.subtotal) || 0;
  const subtotalShown = subtotalStored + productDiscount;
  const couponDiscount = Number(order.discount) || 0;
  const delivery = Number(order.shippingFee) || 0;
  const tax = Number(order.tax) || 0;
  const grandTotal = Number(order.total) || 0;
  const paid = Number(order.paidAmount) || 0;
  const due = order.dueAmount != null ? Number(order.dueAmount) : Math.max(0, grandTotal - paid);

  const couponLabel = order.couponCode ? `Coupon Discount (${esc(order.couponCode)})` : 'Discount';

  const totalsRows = [
    `<div class="row"><span class="k">Subtotal</span><span class="v">${money(subtotalShown)}</span></div>`,
    productDiscount > 0 ? `<div class="row"><span class="k">Product Discount</span><span class="v">−${money(productDiscount)}</span></div>` : '',
    couponDiscount > 0 ? `<div class="row"><span class="k">${couponLabel}</span><span class="v">−${money(couponDiscount)}</span></div>` : '',
    `<div class="row"><span class="k">Delivery Charge</span><span class="v">${money(delivery)}</span></div>`,
    tax > 0 ? `<div class="row"><span class="k">Tax / VAT</span><span class="v">${money(tax)}</span></div>` : '',
    `<div class="row grand"><span class="k">Grand Total</span><span class="v">${money(grandTotal)}</span></div>`,
    `<div class="row"><span class="k">Paid Amount</span><span class="v">${money(paid)}</span></div>`,
    `<div class="row due"><span class="k">Due Amount</span><span class="v">${money(due)}</span></div>`,
  ].filter(Boolean).join('');

  const website = (settings.website || '').replace(/^https?:\/\//i, '');
  const websiteDisplay = website && !/^www\./i.test(website) ? `www.${website}` : website;
  const supportLine = [settings.phone, settings.email].filter(Boolean).join(' · ');

  const logo = opts.logoUrl
    ? `<img id="aks-invoice-logo" class="logo" src="${esc(opts.logoUrl)}" alt="${esc(settings.storeName)} logo" />`
    : '';

  // BIN/TIN are intentionally omitted: the project has no such setting, and one
  // must never be invented. They would appear here automatically if configured.

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${esc(invoiceNo)} — ${esc(settings.storeName)}</title>
  <style>${INVOICE_CSS}</style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <div class="inv">
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
        <div class="inv-title">INVOICE</div>
        <div class="inv-no">${esc(invoiceNo)}</div>
        <div class="inv-date">Issued ${esc(formatDate(invoiceDate))}</div>
      </div>
    </header>
    ${settings.address ? `<div class="addr-bar"><span>${esc(settings.address)}</span></div>` : ''}

    <div class="meta">
      <div><div class="k">Invoice Number</div><div class="v">${esc(invoiceNo)}</div></div>
      <div><div class="k">Order Number</div><div class="v">${esc(order.orderNumber)}</div></div>
      <div><div class="k">Order Date</div><div class="v">${esc(formatDate(orderDate))}</div></div>
      <div><div class="k">Invoice Date</div><div class="v">${esc(formatDate(invoiceDate))}</div></div>
      <div><div class="k">Payment Method</div><div class="v">${esc(payMethodLabel)}</div></div>
      <div><div class="k">Payment Status</div><div class="v">${esc(payStatus)}</div></div>
      <div><div class="k">Order Source</div><div class="v">${esc(source)}</div></div>
      <div><div class="k">Tracking Code</div><div class="v">${esc(order.trackingCode || '—')}</div></div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Billing Information</h3>
        <div class="nm">${esc(customerName)}</div>
        ${customerPhone ? `<div class="ln">${esc(customerPhone)}</div>` : ''}
        ${customerEmail ? `<div class="ln">${esc(customerEmail)}</div>` : ''}
        ${billingAddress ? `<div class="ln">${esc(billingAddress)}</div>` : '<div class="ln muted">—</div>'}
      </div>
      <div class="party">
        <h3>Shipping Information</h3>
        <div class="nm">${esc(addr.fullName || customerName)}</div>
        <div class="ln">${esc(addr.phone || customerPhone || '—')}</div>
        <div class="ln">${esc([addr.streetAddress, addr.thana].filter(Boolean).join(', ') || '—')}</div>
        <div class="ln">${esc([addr.district, addr.division].filter(Boolean).join(', ') || '—')}${addr.postalCode ? ` — ${esc(addr.postalCode)}` : ''}</div>
        <div class="ln muted">Delivery: ${esc(zoneLabel)}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th class="c" style="width:30px">#</th>
          <th>Product</th>
          <th style="width:110px">SKU</th>
          <th class="c" style="width:46px">Qty</th>
          <th class="r" style="width:92px">Unit Price</th>
          <th class="r" style="width:86px">Discount</th>
          <th class="r" style="width:96px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:16px">No line items</td></tr>`}
      </tbody>
    </table>

    <div class="bottom">
      <div class="pay">
        <h3>Payment</h3>
        <div class="row"><span class="k">Method</span><span class="v">${esc(payMethodLabel)}</span></div>
        <div class="row"><span class="k">Status</span><span class="v"><span class="badge ${esc(payStatus)}">${esc(payStatus)}</span></span></div>
        <div class="row"><span class="k">Reference / TrxID</span><span class="v">${esc(order.paymentReference || order.pickupStore || '—')}</span></div>
        <div class="row"><span class="k">Paid</span><span class="v">${money(paid)}</span></div>
        <div class="row"><span class="k">Due</span><span class="v">${money(due)}</span></div>
      </div>
      <div class="totals">${totalsRows}</div>
    </div>

    <div class="footer">
      <p class="policy">${esc(settings.returnPolicy)}</p>
      <p class="support">Support: ${esc(supportLine || settings.storeName)}${websiteDisplay ? ` · ${esc(websiteDisplay)}` : ''}</p>
      ${settings.invoiceFooter ? `<p class="extra">${esc(settings.invoiceFooter)}</p>` : ''}
      <div class="thanks">${esc(settings.thankYouMessage)}</div>
    </div>

    <div class="sig">
      <div class="sign">Customer Signature</div>
      <div class="sign">Authorized Signature</div>
    </div>
  </div>
</body>
</html>`;
}
