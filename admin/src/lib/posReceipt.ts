// Browser-side POS receipt helpers — render the shared template into a print window.
//
// Self-contained (own settings fetch, logo resolution and print lifecycle) so it
// does not couple to the invoice or packing-slip modules.
import { api, getStoredAdmin } from '../api';
import aksLogo from '../assets/AKS.logo.jpg';
import {
  buildPosReceiptHtml,
  emptyPosReceiptSettings,
  type PosReceiptData,
  type PosReceiptSettings,
} from './posReceiptTemplate';

/** Absolute URL of the bundled AKS Mart logo (the project's existing asset). */
function logoHref(): string {
  try {
    return new URL(aksLogo, window.location.origin).href;
  } catch {
    return aksLogo;
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

/**
 * Print / view a receipt from data already in hand (right after a POS sale). The
 * window opens synchronously so pop-up blockers treat it as a user gesture.
 * Falls back to the signed-in admin as the cashier when the sale has no name.
 */
export function openPosReceipt(data: PosReceiptData, opts: OpenPosReceiptOptions = {}): void {
  const w = window.open('', '_blank', 'width=380,height=760');
  if (!w) return;
  w.document.write(LOADING_HTML);
  const withCashier: PosReceiptData = data.cashierName || data.cashier
    ? data
    : { ...data, cashierName: getStoredAdmin()?.name || '' };
  paint(w, Promise.resolve(withCashier), opts.settings ? Promise.resolve(opts.settings) : loadPosReceiptSettings(), !!opts.autoPrint);
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

/** Print once the logo image has settled (with a safety timeout). */
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
  if (img && !img.complete) {
    img.addEventListener('load', go);
    img.addEventListener('error', go);
    window.setTimeout(go, 1500);
  } else {
    window.setTimeout(go, 250);
  }
}
