// Browser-side packing-slip helpers — render the shared template into a print window.
//
// Kept self-contained (its own settings fetch, logo resolution and print lifecycle)
// so it does not couple to — or change — the invoice module.
import { api } from '../api';
import aksLogo from '../assets/AKS.logo.jpg';
import aksPrintLogo from '../assets/AKS.logo.print.png?inline';
import {
  buildPackingSlipHtml,
  emptyPackingSlipSettings,
  type PackingSlipData,
  type PackingSlipSettings,
} from './packingSlipTemplate';
import {
  buildCourierStickerHtml,
  DEFAULT_MOTTO_BN,
  type CourierStickerData,
  type CourierStickerSettings,
} from './courierStickerTemplate';
import { sendToPrintAgent } from './posReceipt';

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
 * Load the store identity the slip prints. Prefers the full admin settings map
 * (which carries the merchant's custom return policy) and falls back to the public
 * snapshot. Never throws — the slip always prints with baseline branding.
 */
export async function loadPackingSlipSettings(): Promise<PackingSlipSettings> {
  const base = emptyPackingSlipSettings();
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
    website: str(merged, 'website') || base.website,
    phone: str(merged, 'phone') || base.phone,
    email: str(merged, 'email') || base.email,
    returnPolicy: str(merged, 'returnPolicy'),
    thankYouMessage: str(merged, 'thankYouMessage') || base.thankYouMessage,
  };
}

export interface OpenPackingSlipOptions {
  /** Print as soon as the document (and logo) is ready, instead of only previewing. */
  autoPrint?: boolean;
  /** Reuse an already-loaded settings snapshot (optional — otherwise it is fetched). */
  settings?: PackingSlipSettings;
}

/**
 * Open the packing slip in its own window (so no admin chrome is ever printed) and
 * optionally send it straight to the printer / "Save as PDF" dialog. The window is
 * opened synchronously so it is treated as a user gesture; settings load after.
 */
export function openPackingSlip(data: PackingSlipData, opts: OpenPackingSlipOptions = {}): void {
  const w = window.open('', '_blank', 'width=980,height=1200');
  if (!w) return;
  w.document.write('<!doctype html><title>Packing Slip</title><body style="font-family:system-ui,sans-serif;padding:40px;color:#64748b">Preparing packing slip…</body>');

  const settingsPromise = opts.settings ? Promise.resolve(opts.settings) : loadPackingSlipSettings();

  const render = (settings: PackingSlipSettings) => {
    if (w.closed) return;
    w.document.open();
    w.document.write(buildPackingSlipHtml(data, settings, { logoUrl: logoHref() }));
    w.document.close();
    if (opts.autoPrint) printWhenReady(w);
  };

  settingsPromise
    .then(render)
    .catch(() => render(emptyPackingSlipSettings()));
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
  const img = w.document.getElementById('aks-slip-logo') as HTMLImageElement | null;
  if (img && !img.complete) {
    img.addEventListener('load', go);
    img.addEventListener('error', go);
    window.setTimeout(go, 1500);
  } else {
    window.setTimeout(go, 250);
  }
}

/* ── Courier sticker (50 × 70 mm thermal label) ───────────────────────────── */

/** Store identity for the sticker; never throws (falls back to baseline branding). */
async function loadCourierStickerSettings(): Promise<CourierStickerSettings> {
  const base = emptyPackingSlipSettings();
  const [admin, pub] = await Promise.allSettled([
    api.get<{ settings: Record<string, unknown> }>('/admin/settings'),
    api.get<{ settings: Record<string, unknown> }>('/settings/public'),
  ]);
  const merged: Record<string, unknown> = {
    ...(pub.status === 'fulfilled' ? pub.value.settings : undefined),
    ...(admin.status === 'fulfilled' ? admin.value.settings : undefined),
  };
  return {
    storeName: str(merged, 'storeName') || base.storeName,
    storeTagline: str(merged, 'storeTagline') || base.storeTagline,
    mottoBn: str(merged, 'mottoBn') || DEFAULT_MOTTO_BN,
    phone: str(merged, 'phone') || base.phone,
    currencySymbol: str(merged, 'currencySymbol') || '৳',
  };
}

/**
 * Open 50 × 70 mm courier sticker(s) in their own window — one label page per
 * order, so a bulk selection is a single print job — and optionally print it.
 */
export function openCourierSticker(orders: CourierStickerData | CourierStickerData[], opts: { autoPrint?: boolean } = {}): void {
  const list = Array.isArray(orders) ? orders : [orders];
  if (list.length === 0) return;
  const w = window.open('', '_blank', 'width=640,height=820');
  if (!w) return;
  w.document.write('<!doctype html><title>Courier Sticker</title><body style="font-family:system-ui,sans-serif;padding:40px;color:#64748b">Preparing sticker…</body>');

  const render = (settings: CourierStickerSettings) => {
    if (w.closed) return;
    w.document.open();
    w.document.write(buildCourierStickerHtml(list, settings, { logoUrl: aksPrintLogo }));
    w.document.close();
    if (opts.autoPrint) printStickerWhenReady(w);
  };

  loadCourierStickerSettings().then(render).catch(() => render({
    ...emptyPackingSlipSettings(),
    mottoBn: DEFAULT_MOTTO_BN,
    currencySymbol: '৳',
  }));
}

/**
 * Print sticker(s) through the local AKS print agent, which rasterises them at
 * 203 dpi and sends raw TSPL sized exactly 50 × 70 mm — bypassing the Windows
 * label driver, whose own stock (76 × 101.6 mm, no gap) misplaces browser prints.
 * Throws PrintAgentUnavailableError when the agent is not running.
 */
export async function directPrintCourierSticker(orders: CourierStickerData | CourierStickerData[]): Promise<void> {
  const list = Array.isArray(orders) ? orders : [orders];
  if (list.length === 0) return;
  const settings = await loadCourierStickerSettings();
  const html = buildCourierStickerHtml(list, settings, { logoUrl: aksPrintLogo, raster: true });
  await sendToPrintAgent(html, '/sticker', { count: list.length }, 30_000);
}

/** Print once the Bangla web font has loaded (with a safety timeout). */
function printStickerWhenReady(w: Window): void {
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
  const fontsReady = w.document.fonts?.ready.catch(() => undefined) ?? Promise.resolve();
  fontsReady.then(() => window.setTimeout(go, 150));
  window.setTimeout(go, 2500);
}
