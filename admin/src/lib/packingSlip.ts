// Browser-side packing-slip helpers — render the shared template into a print window.
//
// Kept self-contained (its own settings fetch, logo resolution and print lifecycle)
// so it does not couple to — or change — the invoice module.
import { api } from '../api';
import aksLogo from '../assets/AKS.logo.jpg';
import {
  buildPackingSlipHtml,
  emptyPackingSlipSettings,
  type PackingSlipData,
  type PackingSlipSettings,
} from './packingSlipTemplate';

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
