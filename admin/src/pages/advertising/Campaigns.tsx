import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Megaphone, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextArea, TextInput } from '../../components/ui';
import { channelLabel } from '../../components/marketing';
import { useCan } from '../../lib/permission-context';
import { PERM } from '../../lib/permissions';

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  platform: string | null;
  platformCampaignId: string | null;
  platformAccountId: string | null;
  matchKeys: string[];
  status: 'active' | 'paused' | 'archived';
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  lastTouchOrders: number;
}

interface Unmatched {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmId: string | null;
  channel: string;
  orders: number;
  lastSeenAt: string;
}

const CAMPAIGN_CHANNELS: [string, string][] = [
  ['meta', 'Meta (Facebook / Instagram)'],
  ['google', 'Google Ads'],
  ['tiktok', 'TikTok'],
  ['email', 'Email'],
  ['sms', 'SMS'],
  ['other', 'Other'],
];
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  archived: 'bg-neutral-100 text-neutral-500',
};

interface Form {
  name: string;
  channel: string;
  platform: string;
  platformCampaignId: string;
  matchKeys: string;
  status: string;
  objective: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const EMPTY: Form = { name: '', channel: 'meta', platform: '', platformCampaignId: '', matchKeys: '', status: 'active', objective: '', startDate: '', endDate: '', notes: '' };
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const META_TEMPLATE = 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_id={{campaign.id}}&utm_content={{ad.id}}';
const GOOGLE_TEMPLATE = '{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_id={campaignid}&utm_content={creative}&utm_term={keyword}';

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <code className="flex-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 break-all">{value}</code>
        <button
          onClick={() => void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
          className="shrink-0 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
          title="Copy"
        >
          {copied ? <span className="text-[10px] font-bold text-emerald-600">✓</span> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
        </button>
      </div>
    </div>
  );
}

export function CampaignsPage() {
  const can = useCan();
  const canManage = can(PERM.ADVERTISING_CAMPAIGNS_MANAGE);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [unmatched, setUnmatched] = useState<Unmatched[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([
        api.get<{ campaigns: Campaign[] }>(`/admin/advertising/campaigns${showArchived ? '?status=archived' : ''}`),
        api.get<{ unmatched: Unmatched[] }>('/admin/advertising/attribution/unmatched'),
      ]);
      setCampaigns(c.campaigns);
      setUnmatched(u.unmatched);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showArchived]);
  useEffect(() => {
    void load();
  }, [load]);

  const openNew = (prefill: Partial<Form> = {}) => {
    setFormError(null);
    setEditing({ id: null, form: { ...EMPTY, ...prefill } });
  };
  const openEdit = (c: Campaign) => {
    setFormError(null);
    setEditing({
      id: c.id,
      form: {
        name: c.name,
        channel: c.channel,
        platform: c.platform ?? '',
        platformCampaignId: c.platformCampaignId ?? '',
        matchKeys: c.matchKeys.join('\n'),
        status: c.status,
        objective: c.objective ?? '',
        startDate: day(c.startDate),
        endDate: day(c.endDate),
        notes: c.notes ?? '',
      },
    });
  };

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    setSaving(true);
    setFormError(null);
    const body = {
      name: f.name,
      channel: f.channel,
      platform: f.platform || null,
      platformCampaignId: f.platformCampaignId || null,
      matchKeys: f.matchKeys.split(/[\n,]/).map((k) => k.trim()).filter(Boolean),
      status: f.status,
      objective: f.objective || null,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      notes: f.notes || null,
    };
    try {
      const res = editing.id
        ? await api.patch<{ relinked: number }>(`/admin/advertising/campaigns/${editing.id}`, body)
        : await api.post<{ relinked: number }>('/admin/advertising/campaigns', body);
      setEditing(null);
      setMessage({ ok: true, text: `Saved. ${res.relinked} order touch(es) ${editing.id ? 're-linked' : 'linked'}.` });
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (c: Campaign, status: Campaign['status']) => {
    try {
      await api.patch(`/admin/advertising/campaigns/${c.id}`, { status });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  };

  const remove = async (c: Campaign) => {
    if (!window.confirm(`Delete “${c.name}”? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/advertising/campaigns/${c.id}`);
      await load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  };

  const rematch = async () => {
    try {
      const res = await api.post<{ relinked: number }>('/admin/advertising/campaigns/rematch');
      setMessage({ ok: true, text: `${res.relinked} order touch(es) linked.` });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  };

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setEditing((s) => (s ? { ...s, form: { ...s.form, [k]: e.target.value } } : s));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Campaigns"
        desc="Campaigns that orders and ad spend are linked to. Orders match by utm_id (platform campaign ID) first, then by utm_campaign."
        icon={<Megaphone className="w-5 h-5" />}
        actions={
          <>
            {canManage && (
              <button onClick={() => openNew()} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> New campaign
              </button>
            )}
            <button onClick={() => void load()} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />
      {message && (
        <p className={`text-xs font-semibold rounded-lg px-3 py-2 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{message.text}</p>
      )}

      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-neutral-900">{showArchived ? 'Archived campaigns' : 'Campaigns'}</h3>
          <div className="flex gap-2">
            {canManage && <Button variant="ghost" onClick={() => void rematch()}><Link2 className="w-3.5 h-3.5" /> Re-match orders</Button>}
            <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>{showArchived ? 'Show current' : 'Show archived'}</Button>
          </div>
        </header>
        {loading ? (
          <Spinner />
        ) : campaigns.length === 0 ? (
          <EmptyState icon={<Megaphone className="w-6 h-6" />} title={showArchived ? 'No archived campaigns' : 'No campaigns yet'} hint="Create one, or connect Meta in Integrations to import campaigns automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="px-5 py-3">Campaign</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Matches on</th><th className="px-3 py-3">Dates</th><th className="px-3 py-3 text-right">Orders (last touch)</th><th className="px-3 py-3">Status</th><th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3">
                      <p className="font-bold text-neutral-900">{c.name}</p>
                      {c.objective && <p className="text-[10px] text-neutral-400">{c.objective}</p>}
                    </td>
                    <td className="px-3 py-3 capitalize">{CAMPAIGN_CHANNELS.find(([k]) => k === c.channel)?.[1] ?? c.channel}</td>
                    <td className="px-3 py-3 text-[11px] text-neutral-600">
                      {c.platformCampaignId && <p>utm_id = <code>{c.platformCampaignId}</code></p>}
                      {c.matchKeys.map((k) => <p key={k}>utm_campaign = <code>{k}</code></p>)}
                      {!c.platformCampaignId && c.matchKeys.length === 0 && <p>name = <code>{c.name.toLowerCase()}</code></p>}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-neutral-500 whitespace-nowrap">{c.startDate ? day(c.startDate) : '—'} → {c.endDate ? day(c.endDate) : '—'}</td>
                    <td className="px-3 py-3 text-right font-black tabular-nums">{c.lastTouchOrders}</td>
                    <td className="px-3 py-3"><Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {canManage && (
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5 text-neutral-500" /></button>
                          {c.status !== 'archived' ? (
                            <button onClick={() => void setStatus(c, 'archived')} className="text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer">Archive</button>
                          ) : (
                            <button onClick={() => void setStatus(c, 'active')} className="text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer">Restore</button>
                          )}
                          {c.lastTouchOrders === 0 && (
                            <button onClick={() => void remove(c)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-black text-neutral-900">Unmatched campaign tags</h3>
            <p className="text-[11px] text-neutral-400">Orders whose UTM campaign doesn’t match any campaign yet (last touch).</p>
          </header>
          <div className="p-5">
            {unmatched.length === 0 ? (
              <p className="text-xs text-neutral-400">Every tagged order is linked to a campaign.</p>
            ) : (
              <div className="space-y-2">
                {unmatched.map((u, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2">
                    <div className="min-w-0 text-[11px]">
                      <p className="font-bold text-neutral-900 truncate">{u.utmCampaign ?? `utm_id ${u.utmId}`}</p>
                      <p className="text-neutral-500">{[u.utmSource, u.utmMedium].filter(Boolean).join(' / ') || '—'} · {channelLabel(u.channel)} · {u.orders} order{u.orders === 1 ? '' : 's'}</p>
                    </div>
                    {canManage && (
                      <Button variant="ghost" onClick={() => openNew({ name: u.utmCampaign ?? '', platformCampaignId: u.utmId ?? '', matchKeys: u.utmCampaign ?? '', channel: u.utmSource === 'google' ? 'google' : u.utmSource === 'tiktok' ? 'tiktok' : u.channel === 'email' ? 'email' : 'meta' })}>
                        Create campaign
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-black text-neutral-900">Tag your ads</h3>
            <p className="text-[11px] text-neutral-400">Paste into each ad’s URL parameters so orders link to the right campaign automatically.</p>
          </header>
          <div className="p-5 space-y-3">
            <CopyLine label="Meta Ads — Ad → Tracking → URL parameters" value={META_TEMPLATE} />
            <CopyLine label="Google Ads — Campaign settings → Final URL suffix / tracking template" value={GOOGLE_TEMPLATE} />
            <p className="text-[11px] text-neutral-500">
              For email, SMS or other links use e.g. <code>?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=eid-2027</code> and add <code>eid-2027</code> as a match key.
            </p>
          </div>
        </section>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit campaign' : 'New campaign'} wide>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name"><TextInput value={editing.form.name} onChange={set('name')} maxLength={120} /></Field>
              <Field label="Channel">
                <Select value={editing.form.channel} onChange={set('channel')}>
                  {CAMPAIGN_CHANNELS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Ad platform" hint="Set when the campaign exists in an ads account.">
                <Select value={editing.form.platform} onChange={set('platform')}>
                  <option value="">None</option>
                  <option value="meta">Meta</option>
                  <option value="google">Google</option>
                  <option value="tiktok">TikTok</option>
                </Select>
              </Field>
              <Field label="Platform campaign ID" hint="What your ads send as utm_id.">
                <TextInput value={editing.form.platformCampaignId} onChange={set('platformCampaignId')} placeholder="e.g. 120210000000000" />
              </Field>
              <Field label="Start date"><TextInput type="date" value={editing.form.startDate} onChange={set('startDate')} /></Field>
              <Field label="End date"><TextInput type="date" value={editing.form.endDate} onChange={set('endDate')} /></Field>
              <Field label="Objective"><TextInput value={editing.form.objective} onChange={set('objective')} placeholder="e.g. Sales" maxLength={80} /></Field>
              <Field label="Status">
                <Select value={editing.form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
            </div>
            <Field label="utm_campaign match keys" hint="One per line. Case-insensitive. The campaign name always matches too.">
              <TextArea rows={3} value={editing.form.matchKeys} onChange={set('matchKeys')} placeholder="winter-rice-2026" />
            </Field>
            <Field label="Notes"><TextArea rows={2} value={editing.form.notes} onChange={set('notes')} maxLength={1000} /></Field>
            {formError && <p className="text-xs font-semibold text-red-700">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving || !editing.form.name.trim()}>{saving ? 'Saving…' : 'Save campaign'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
