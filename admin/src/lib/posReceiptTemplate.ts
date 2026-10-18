// AKS Mart — POS sales receipt template.
//
// A pure, dependency-free HTML builder (only `import type`, no runtime imports)
// for an 80mm thermal receipt (72mm printable band), shared by the POS checkout,
// the order-detail reprint and any future sales history. It renders only the real
// POS transaction that was stored — totals, discounts, tax and payments are never
// recalculated (change is derived from the stored payment rows).

export interface PosReceiptItem {
  productName: string;
  productSku?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
}

export interface PosReceiptPayment {
  method: string;
  amount: number;
  reference?: string | null;
}

export interface PosReceiptData {
  id?: string;
  orderNumber: string;
  invoiceNumber?: string | null;
  trackingCode?: string | null;
  status?: string | null;
  source?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  /** Resolved cashier name (immediate print passes the current admin). */
  cashierName?: string | null;
  /** Cashier relation from the order-detail reprint. */
  cashier?: { name?: string | null; email?: string | null } | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentStatus?: string | null;
  subtotal: number;
  discount?: number | null;
  tax?: number | null;
  shippingFee?: number | null;
  total: number;
  paidAmount?: number | null;
  dueAmount?: number | null;
  couponCode?: string | null;
  items?: PosReceiptItem[] | null;
  payments?: PosReceiptPayment[] | null;
}

export interface PosReceiptSettings {
  storeName: string;
  storeTagline: string;
  address: string;
  phone: string;
  website: string;
  currencySymbol: string;
  returnPolicy: string;
  thankYouMessage: string;
}

/** Baseline branding used only if settings cannot be loaded (sale data is never faked). */
export function emptyPosReceiptSettings(): PosReceiptSettings {
  return {
    storeName: 'AKS Mart',
    storeTagline: 'One Mart. Many Choices.',
    address: '',
    phone: '+8801728-843503',
    website: 'aksmartbd.com',
    currencySymbol: '৳',
    returnPolicy: '',
    thankYouMessage: 'Thank you for shopping with AKS Mart.',
  };
}

/** id → label for the payment methods the POS/checkout support. */
const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', card: 'Card',
  rocket: 'Rocket', bank: 'Bank transfer', cod: 'Cash on Delivery',
};

const paymentLabel = (method: unknown): string => {
  const m = String(method ?? '').trim();
  return PAYMENT_LABEL[m.toLowerCase()] || (m ? m.toUpperCase() : 'Payment');
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount: number | null | undefined, symbol = '৳'): string {
  const n = Number(amount ?? 0) || 0;
  return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ── 80mm thermal stylesheet ──────────────────────────────────────────────── */

// Printer: Xprinter XP-T361U on a Seagull/TSC *label* driver. That driver prints
// only on its configured stock (default 78.7 x 101.6mm, printable band 74.8mm wide
// starting 1.3mm in) and SHRINKS any CSS page larger than the stock to fit it. So
// the receipt sets no page size: it uses whatever stock the driver has, fills its
// width (insets keep text inside the printable band), and flows onto further pages
// with no row split across a page boundary. On continuous media those pages
// print back to back as one receipt. Only single rows are kept whole: keeping a
// whole block (header, footer) together pushes it to the next stock page and
// leaves the rest of the current page as blank paper mid-receipt.
const RECEIPT_CSS = `
  /* The driver does not print the 78.7mm page as-is: it sends the printer a 76mm
     label (TSPL "SIZE 76 mm") whose x=0 is the page's printable-area edge, 2.75mm
     in (page x 10mm → printer x 7.25mm, measured from the driver's print-to-file
     output; the printer can mark up to 74.8mm of it). So the
     content is centred on that 76mm label, not on the page — centring on the page
     printed it ~2.5mm left of centre. --edge = margin inside the label on each side;
     nudge with --shift (+ = right) if the physical print is still off-centre. */
  :root{ --paper:78.7mm; --label-l:2.75mm; --label-w:76mm; --edge:3mm; --shift:1mm;
    --edge-l:calc(var(--label-l) + var(--edge) + var(--shift));
    --edge-r:calc(var(--paper) - var(--label-l) - var(--label-w) + var(--edge) - var(--shift)); }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ background:#e9edf1; color:#000; font-family:Arial,'Helvetica Neue',Helvetica,'Nirmala UI',sans-serif; font-size:14px; font-weight:400; line-height:1.22; -webkit-font-smoothing:antialiased; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .receipt{ background:#fff; width:var(--paper); margin:14px auto; padding:1.5mm var(--edge-r) 1mm var(--edge-l); overflow:hidden; box-shadow:0 2px 14px rgba(0,0,0,.12); }

  /* Toolbar — never printed */
  .toolbar{ position:fixed; top:12px; right:12px; display:flex; gap:8px; z-index:9; }
  .toolbar button{ font:inherit; font-weight:700; font-size:12px; padding:7px 12px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; cursor:pointer; }
  .toolbar button.primary{ background:#111; border-color:#111; color:#fff; }

  .center{ text-align:center; }
  /* Pure black/white bitmap; explicit size reserves its space before it decodes. */
  .logo{ display:block; width:16mm; height:auto; aspect-ratio:384/471; margin:0 auto 1mm; }
  .brand{ font-size:21px; font-weight:900; letter-spacing:.5px; }
  .tag{ font-size:13px; }
  .muted{ font-size:12.5px; line-height:1.25; overflow-wrap:anywhere; }

  .ln{ border-top:1.5px dashed #000; margin:4px 0; }

  /* Key/value rows: label left (may wrap), amount right (never wraps). */
  .r{ display:flex; justify-content:space-between; align-items:flex-start; gap:8px; font-size:14px; padding:0; }
  .r > span:first-child{ flex:1 1 auto; overflow-wrap:break-word; }
  .r .v{ flex:0 0 auto; white-space:nowrap; text-align:right; }
  /* Free-text values (customer, cashier, refs) wrap instead of running off the edge. */
  .r .v.t{ flex:0 1 auto; min-width:0; white-space:normal; overflow-wrap:anywhere; }

  .items{ margin:0; }
  .item{ padding:2px 0; }
  .item .nm{ font-size:14.5px; font-weight:700; overflow-wrap:anywhere; word-break:break-word; }
  .item .var{ font-size:12.5px; overflow-wrap:anywhere; }
  .item .amt{ display:flex; justify-content:space-between; gap:8px; font-size:14px; }
  .item .amt .v{ flex:0 0 auto; white-space:nowrap; font-weight:700; text-align:right; }

  .grand{ display:flex; justify-content:space-between; gap:6px; font-size:16px; font-weight:900; border-top:2px solid #000; margin-top:3px; padding-top:3px; }
  .grand span{ white-space:nowrap; }

  .payhead{ font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; margin:0 0 1px; }
  .foot{ text-align:center; font-size:13px; line-height:1.25; }
  .foot .thx{ font-weight:700; font-size:15px; margin-bottom:1px; }
  .foot p{ margin:1px 0; overflow-wrap:anywhere; }
  /* Software credit — the receipt's last line, kept small and plain. */
  .credit{ font-size:11px; margin-top:3px; padding-top:2px; border-top:1px dashed #000; }

  /* Print — no @page size on purpose (see the note above): the driver's stock
     decides the page; the receipt fills its width. ("size:80mm auto" is not valid
     CSS anyway — browsers drop the whole declaration.) */
  @page{ margin:0; }
  @media print{
    html,body{ background:#fff; orphans:1; widows:1; }
    .no-print{ display:none !important; }
    .receipt{ width:auto; margin:0; box-shadow:none; overflow:visible; }
    /* On the continuous roll a page boundary is invisible, so only keep single
       rows (and the logo) whole. Keeping whole blocks or items together pushed
       them to the next stock page and left blank paper above them. Text lines
       themselves are never sliced by the browser. */
    .logo,.r,.item .amt,.grand{ break-inside:avoid; page-break-inside:avoid; }
  }
`;

/* ── The receipt document ─────────────────────────────────────────────────── */

export interface BuildPosReceiptOptions {
  /** Absolute URL of the AKS Mart logo (reused from the project assets). */
  logoUrl?: string;
}

export function buildPosReceiptHtml(
  data: PosReceiptData,
  settings: PosReceiptSettings,
  opts: BuildPosReceiptOptions = {}
): string {
  const symbol = settings.currencySymbol || '৳';
  const money = (n: number | null | undefined) => formatMoney(n, symbol);
  const items = Array.isArray(data.items) ? data.items : [];

  const receiptNo = data.invoiceNumber || data.orderNumber;
  const cashier = data.cashierName || data.cashier?.name || data.cashier?.email || '';

  // ── Items: product name on its own line, then "qty x unit ⟶ line total" ────
  const itemRows = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.price) || 0;
    const variant = [
      it.size && it.size !== 'Free Size' ? it.size : '',
      it.color && it.color !== 'Default' ? it.color : '',
    ].filter(Boolean).join(' / ');
    const meta = [it.productSku, variant].filter(Boolean).join(' · ');
    return `
      <div class="item">
        <div class="nm">${esc(it.productName)}</div>
        ${meta ? `<div class="var">${esc(meta)}</div>` : ''}
        <div class="amt"><span>${qty} x ${money(unit)}</span><span class="v">${money(unit * qty)}</span></div>
      </div>`;
  }).join('');

  // ── Totals — taken from the stored order, never recalculated ───────────────
  const subtotal = Number(data.subtotal) || 0;
  const discount = Number(data.discount) || 0;
  const shippingFee = Number(data.shippingFee) || 0;
  const tax = Number(data.tax) || 0;
  const total = Number(data.total) || 0;
  const discountLabel = data.couponCode ? `Coupon (${esc(data.couponCode)})` : 'Discount';

  const totalRows = [
    `<div class="r"><span>Subtotal</span><span class="v">${money(subtotal)}</span></div>`,
    discount > 0 ? `<div class="r"><span>${discountLabel}</span><span class="v">-${money(discount)}</span></div>` : '',
    tax > 0 ? `<div class="r"><span>Tax / VAT</span><span class="v">${money(tax)}</span></div>` : '',
    // POS is in-store: delivery only shows if the sale actually carried a charge.
    shippingFee > 0 ? `<div class="r"><span>Delivery</span><span class="v">${money(shippingFee)}</span></div>` : '',
  ].filter(Boolean).join('');

  // ── Payments ───────────────────────────────────────────────────────────────
  // Use the stored payment rows; fall back to the order's own method/amount when a
  // legacy row has none. Change is derived from the stored rows, so a reprint shows
  // exactly what the original receipt showed.
  const payments = (Array.isArray(data.payments) && data.payments.length > 0)
    ? data.payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0, reference: p.reference }))
    : (data.paymentMethod ? [{ method: data.paymentMethod, amount: Number(data.paidAmount) || 0, reference: data.paymentReference }] : []);

  const tendered = payments.reduce((sum, p) => sum + p.amount, 0);
  const change = Math.max(0, tendered - total);
  const due = data.dueAmount != null ? Number(data.dueAmount) : Math.max(0, total - tendered);

  const paymentRows = payments.map((p) => {
    const ref = p.reference ? `<div class="r"><span>Ref</span><span class="v t">${esc(p.reference)}</span></div>` : '';
    return `<div class="r"><span>${esc(paymentLabel(p.method))}</span><span class="v">${money(p.amount)}</span></div>${ref}`;
  }).join('');

  const showPaidRow = payments.length !== 1;
  const payRows = [
    paymentRows,
    showPaidRow ? `<div class="r"><span>Amount Paid</span><span class="v">${money(tendered)}</span></div>` : '',
    change > 0 ? `<div class="r"><span>Change</span><span class="v">${money(change)}</span></div>` : '',
    due > 0 ? `<div class="r"><span>Due</span><span class="v">${money(due)}</span></div>` : '',
  ].filter(Boolean).join('');

  const logo = opts.logoUrl
    ? `<img id="aks-pos-logo" class="logo" src="${esc(opts.logoUrl)}" width="384" height="471" alt="${esc(settings.storeName)} logo" />`
    : '';

  const website = (settings.website || '').replace(/^https?:\/\//i, '');
  const websiteDisplay = website && !/^www\./i.test(website) ? `www.${website}` : website;
  const date = formatDate(data.createdAt);
  const time = formatTime(data.createdAt);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt ${esc(receiptNo)} — ${esc(settings.storeName)}</title>
  <style>${RECEIPT_CSS}</style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <div class="receipt">
    <div class="center">
      ${logo}
      <div class="brand">${esc(settings.storeName).toUpperCase()}</div>
      <div class="tag">${esc(settings.storeTagline)}</div>
      ${settings.address ? `<div class="muted">${esc(settings.address)}</div>` : ''}
      ${settings.phone ? `<div class="muted">Tel: ${esc(settings.phone)}</div>` : ''}
      ${websiteDisplay ? `<div class="muted">${esc(websiteDisplay)}</div>` : ''}
    </div>
    <div class="ln"></div>

    <div class="r"><span>Receipt</span><span class="v t">${esc(receiptNo)}</span></div>
    <div class="r"><span>Order</span><span class="v t">${esc(data.orderNumber)}</span></div>
    ${date ? `<div class="r"><span>Date</span><span class="v">${esc(date)}</span></div>` : ''}
    ${time ? `<div class="r"><span>Time</span><span class="v">${esc(time)}</span></div>` : ''}
    ${cashier ? `<div class="r"><span>Cashier</span><span class="v t">${esc(cashier)}</span></div>` : ''}
    <div class="r"><span>Customer</span><span class="v t">${esc(data.customerName || 'Walk-in')}${data.customerPhone ? ` (${esc(data.customerPhone)})` : ''}</span></div>
    <div class="ln"></div>

    <div class="center payhead">Items</div>
    <div class="items">${itemRows || '<div class="muted center">No items</div>'}</div>
    <div class="ln"></div>

    <div class="totals">${totalRows}</div>
    <div class="grand"><span>GRAND TOTAL</span><span class="v">${money(total)}</span></div>
    <div class="ln"></div>

    <div class="payhead">Payment</div>
    ${payRows}
    <div class="ln"></div>

    <div class="foot">
      <div class="thx">${esc(settings.thankYouMessage)}</div>
      ${settings.returnPolicy ? `<p>${esc(settings.returnPolicy)}</p>` : ''}
      ${settings.phone ? `<p>Support: ${esc(settings.phone)}</p>` : ''}
      ${websiteDisplay ? `<p>${esc(websiteDisplay)}</p>` : ''}
      <p class="credit">Powered by Averqon IT</p>
    </div>
  </div>
</body>
</html>`;
}
