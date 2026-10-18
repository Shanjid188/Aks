// Browser-side POS receipt helpers — render the shared template into a print window.
//
// Self-contained (own settings fetch, logo resolution and print lifecycle) so it
// does not couple to the invoice or packing-slip modules.
import { api, getStoredAdmin } from '../api';
// ?inline: always a data: URI, so a receipt HTML is fully self-contained (needed
// when the local print agent prints it from a file, outside this site).
import aksPrintLogo from '../assets/AKS.logo.print.png?inline';
import {
  buildPosReceiptHtml,
  emptyPosReceiptSettings,
  type PosReceiptData,
  type PosReceiptSettings,
} from './posReceiptTemplate';

/**
 * Pure black/white AKS Mart logo for thermal printing (derived from AKS.logo.jpg).
 * Imported ?inline as a data: URI, so it is ready the moment the receipt is written.
 */
function logoHref(): string {
  try {
    return new URL(aksPrintLogo, window.location.origin).href;
  } catch {
    return aksPrintLogo;
  }
}

function str(raw: Record<string, unknown> | undefined, key: string): string {
  const v = raw?.[key];
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

/**
 * Load the store identity the receipt prints. Prefers the full admin settings map
 * (custom return policy, address) and falls back to the public snapshot. Never
 * throws — a receipt always prints with baseline branding.
 */
export async function loadPosReceiptSettings(): Promise<PosReceiptSettings> {
  const base = emptyPosReceiptSettings();
  const [admin, pub] = await Promise.allSettled([
    api.get<{ settings: Record<string, unknown> }>('/admin/settings'),
    api.get<{ settings: Record<string, unknown> }>('/settings/public'),
  ]);
  const adminSettings = admin.status === 'fulfilled' ? admin.value.settings : undefined;
  const publicSettings = pub.status === 'fulfilled' ? pub.value.settings : undefined;
  const merged: Record<string, unknown> = { ...publicSettings, ...adminSettings };

  return {
    storeName: str(merged, 'storeName') || base.storeName,
    storeTagline: str(merged, 'storeTagline') || base.storeTagline,
    address: str(merged, 'address') || base.address,
    phone: str(merged, 'phone') || base.phone,
    website: str(merged, 'website') || base.website,
    currencySymbol: str(merged, 'currencySymbol') || base.currencySymbol,
    returnPolicy: str(merged, 'returnPolicy'),
    thankYouMessage: str(merged, 'thankYouMessage') || base.thankYouMessage,
  };
}

export interface OpenPosReceiptOptions {
  /** Print as soon as the document (and logo) is ready, instead of only previewing. */
  autoPrint?: boolean;
  /** Reuse an already-loaded settings snapshot (optional — otherwise it is fetched). */
  settings?: PosReceiptSettings;
}

const LOADING_HTML =
  '<!doctype html><title>Receipt</title><body style="font-family:system-ui,sans-serif;padding:32px;color:#64748b">Preparing receipt…</body>';

/** Fill an already-opened window once data + settings resolve, then optionally print. */
function paint(
  w: Window,
  dataPromise: Promise<PosReceiptData>,
  settingsPromise: Promise<PosReceiptSettings>,
  autoPrint: boolean,
): void {
  Promise.all([dataPromise, settingsPromise])
    .then(([data, settings]) => {
      if (w.closed) return;
      w.document.open();
      w.document.write(buildPosReceiptHtml(data, settings, { logoUrl: logoHref() }));
      w.document.close();
      if (autoPrint) printWhenReady(w);
    })
    .catch(() => {
      if (w.closed) return;
      w.document.open();
      w.document.write('<body style="font-family:system-ui,sans-serif;padding:32px;color:#b91c1c">Could not load the receipt. Please try again.</body>');
      w.document.close();
    });
}

/** Falls back to the signed-in admin as the cashier when the sale has no name. */
function withCashier(data: PosReceiptData): PosReceiptData {
  return data.cashierName || data.cashier
    ? data
    : { ...data, cashierName: getStoredAdmin()?.name || '' };
}

/**
 * Print / view a receipt from data already in hand (right after a POS sale). The
 * window opens synchronously so pop-up blockers treat it as a user gesture.
 */
export function openPosReceipt(data: PosReceiptData, opts: OpenPosReceiptOptions = {}): void {
  const w = window.open('', '_blank', 'width=380,height=760');
  if (!w) return;
  w.document.write(LOADING_HTML);
  paint(w, Promise.resolve(withCashier(data)), opts.settings ? Promise.resolve(opts.settings) : loadPosReceiptSettings(), !!opts.autoPrint);
}

/**
 * Reprint / view the ORIGINAL stored sale by id — the server returns the persisted
 * order (items, payments, cashier), so totals and change are exactly as recorded,
 * never recalculated.
 */
export function openPosReceiptById(orderId: string, opts: OpenPosReceiptOptions = {}): void {
  const w = window.open('', '_blank', 'width=380,height=760');
  if (!w) return;
  w.document.write(LOADING_HTML);
  const dataPromise = api
    .get<{ order: PosReceiptData }>(`/admin/pos/receipt/${orderId}`)
    .then((r) => r.order);
  paint(w, dataPromise, opts.settings ? Promise.resolve(opts.settings) : loadPosReceiptSettings(), !!opts.autoPrint);
}

/* ── Direct print (no dialog) via the local print agent ───────────────────── */

// scripts/print-agent.mjs, running on the POS PC. Browsers cannot print without
// the dialog, so the agent prints through Chrome's silent kiosk printing.
const PRINT_AGENT_URL = 'http://127.0.0.1:17777';

export class PrintAgentUnavailableError extends Error {
  constructor() {
    super('Direct print is unavailable: the AKS print agent is not running on this PC.');
    this.name = 'PrintAgentUnavailableError';
  }
}

/** POST a print job to the local agent (`/print` receipts, `/sticker` courier labels). */
export async function sendToPrintAgent(html: string, path = '/print', extra: Record<string, unknown> = {}, timeoutMs = 4000): Promise<void> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${PRINT_AGENT_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, ...extra }),
      signal: ctrl.signal,
    });
  } catch {
    throw new PrintAgentUnavailableError();
  } finally {
    window.clearTimeout(timer);
  }
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !body.ok) throw new Error(body.error || `Print agent error (${res.status})`);
}

/** Print a receipt straight to the receipt printer, without the print dialog. */
export async function directPrintPosReceipt(data: PosReceiptData, opts: { settings?: PosReceiptSettings } = {}): Promise<void> {
  const settings = opts.settings ?? (await loadPosReceiptSettings());
  await sendToPrintAgent(buildPosReceiptHtml(withCashier(data), settings, { logoUrl: logoHref() }));
}

/** Direct-print the ORIGINAL stored sale by id (same data as Reprint Receipt). */
export async function directPrintPosReceiptById(orderId: string): Promise<void> {
  const [{ order }, settings] = await Promise.all([
    api.get<{ order: PosReceiptData }>(`/admin/pos/receipt/${orderId}`),
    loadPosReceiptSettings(),
  ]);
  await directPrintPosReceipt(order, { settings });
}

/**
 * Print once the logo is decoded and fonts are ready (with a safety timeout), so
 * the layout is final when the print dialog snapshots the document — a
 * late-loading logo would otherwise shift content.
 */
function printWhenReady(w: Window): void {
  let printed = false;
  const go = () => {
    if (printed || w.closed) return;
    printed = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* the user may have closed the window first */
    }
  };
  const img = w.document.getElementById('aks-pos-logo') as HTMLImageElement | null;
  const logoReady = img
    ? img.decode().catch(() => undefined)
    : Promise.resolve();
  const fontsReady = w.document.fonts?.ready.catch(() => undefined) ?? Promise.resolve();
  Promise.all([logoReady, fontsReady]).then(() => window.setTimeout(go, 100));
  window.setTimeout(go, 2000);
}
