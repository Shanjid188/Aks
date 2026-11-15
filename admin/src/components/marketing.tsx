// Shared marketing-attribution UI bits (channel labels, Marketing source card).
import { Megaphone } from 'lucide-react';
import type { OrderAttribution } from '../types';

export const CHANNEL_LABELS: Record<string, string> = {
  paid_social: 'Paid social',
  paid_search: 'Paid search',
  organic_search: 'Organic search',
  social: 'Social (organic)',
  email: 'Email',
  sms: 'SMS',
  referral: 'Referral',
  display: 'Display',
  affiliate: 'Affiliate',
  other: 'Other',
  direct: 'Direct / unknown',
  pos: 'POS (in store)',
};

export const channelLabel = (c: string | null | undefined) => (c ? CHANNEL_LABELS[c] ?? c : '—');

function TouchRow({ t }: { t: OrderAttribution }) {
  const rows: [string, string | null][] = [
    ['Source / medium', [t.utmSource, t.utmMedium].filter(Boolean).join(' / ') || null],
    ['Campaign tag', t.utmCampaign],
    ['Campaign ID (utm_id)', t.utmId],
    ['Ad / content', t.utmContent],
    ['Term', t.utmTerm],
    ['Referrer', t.referrerHost],
    ['Landing page', t.landingPath],
    ['Ad click', t.clickIdType ? `${t.clickIdType}${t.hasClickId ? ' (captured with consent)' : ' (not stored — no ad consent)'}` : null],
  ];
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-neutral-400">{t.touch === 'last' ? 'Last touch (default)' : 'First touch'}</p>
        <span className="text-[10px] font-bold text-neutral-500">{new Date(t.touchedAt).toLocaleString('en-GB')}</span>
      </div>
      <p className="mt-1 text-xs font-black text-neutral-900">
        {channelLabel(t.channel)}
        {t.campaign ? <span className="font-bold text-[#D8232A]"> · {t.campaign.name}</span> : t.utmCampaign || t.utmId ? <span className="font-semibold text-amber-600"> · unmatched campaign</span> : null}
      </p>
      <dl className="mt-1.5 space-y-0.5 text-[11px]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex gap-2"><dt className="text-neutral-400 w-32 shrink-0">{k}</dt><dd className="text-neutral-700 break-all">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

/** "Marketing source" card for the Manage Order page. */
export function MarketingSourceCard({ attribution }: { attribution?: OrderAttribution[] }) {
  if (!attribution) return null;
  const last = attribution.find((a) => a.touch === 'last');
  const first = attribution.find((a) => a.touch === 'first');
  const same = first && last && first.touchedAt === last.touchedAt && first.channel === last.channel && first.utmCampaign === last.utmCampaign;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-[#D8232A]" />
        <h3 className="text-sm font-black text-neutral-900">Marketing source</h3>
      </div>
      <div className="px-5 py-4 space-y-2">
        {!last ? (
          <p className="text-xs text-neutral-500">Direct or unknown — no campaign tag or referring site was recorded for this order (or it was placed before attribution was enabled).</p>
        ) : (
          <>
            <TouchRow t={last} />
            {first && !same && <TouchRow t={first} />}
            {same && <p className="text-[11px] text-neutral-400">First and last touch are the same visit.</p>}
          </>
        )}
      </div>
    </div>
  );
}
