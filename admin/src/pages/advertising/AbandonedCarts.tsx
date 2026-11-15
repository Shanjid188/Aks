import { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, MessageCircle, RefreshCw, ShieldCheck, ShoppingCart } from 'lucide-react';
import { api } from '../../api';
import { Badge, EmptyState, Modal, PageHeader, Spinner, formatDate } from '../../components/ui';
import { BarList, DateRangePicker, Segmented, StatTile, bdt, fmtPct, presetRange, rangeQuery, type DateRange } from '../../components/charts';
import { channelLabel } from '../../components/marketing';

type Status = 'abandoned' | 'recovered' | 'converted' | 'active';

interface Cart {
  id: string;
  status: Status;
  value: number;
  itemCount: number;
  items: { sku: string; name: string; quantity: number; size: string; color: string; price: number }[];
  channel: string | null;
  campaign: { id: string; name: string } | null;
  hasContact: boolean;
  contactConsentAt: string | null;
  contactedAt: string | null;
  restoredAt: string | null;
  lastActivityAt: string;
  abandonedAt: string | null;
  recoveredAt: string | null;
  orderNumber: string | null;
  createdAt: string;
}

interface Data {
  settings: { abandonAfterMinutes: number; contactRetentionDays: number; consentText: string };
  summary: {
    sessions: number;
    active: number;
    converted: number;
    abandoned: number;
    recovered: number;
    abandonmentRate: number | null;
    recoveryRate: number | null;
    abandonedValue: number;
    recoveredValue: number;
    withContact: number;
    topAbandonedProducts: { sku: string; name: string; quantity: number; value: number; carts: number }[];
    byChannel: { channel: string; abandoned: number; abandonedValue: number }[];
  };
  total: number;
  page: number;
  pageSize: number;
  canRevealContact: boolean;
  carts: Cart[];
}

interface Contact {
  phone: string;
  email: string | null;
  consentAt: string;
  consentText: string;
  restoreUrl: string | null;
  whatsappUrl: string;
}

const STATUS_COLOR: Record<string, string> = {
  abandoned: 'bg-amber-50 text-amber-700 border-amber-200',
  recovered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  converted: 'bg-sky-50 text-sky-700 border-sky-200',
  active: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

export function AbandonedCartsPage() {
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [status, setStatus] = useState<Status>('abandoned');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactFor, setContactFor] = useState<Cart | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Data>(`/admin/advertising/carts?${rangeQuery(range)}&status=${status}&page=${page}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range, status, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => setPage(1), [range, status]);

  const s = data?.summary;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Abandoned Carts"
        desc="Checkouts that were started but not completed. Contact details exist only for shoppers who opted in to a reminder."
        icon={<ShoppingCart className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void load()} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading && !data ? (
        <Spinner />
      ) : !data || !s ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile label="Checkouts started" value={s.sessions.toLocaleString('en-IN')} sub={`${s.active} still active`} />
            <StatTile label="Abandonment rate" value={fmtPct(s.abandonmentRate)} tone={s.abandonmentRate === null ? 'muted' : 'bad'} sub="Abandoned ÷ finished checkouts" />
            <StatTile label="Abandoned value" value={bdt(s.abandonedValue)} tone="bad" sub={`${s.abandoned} cart(s)`} />
            <StatTile label="Recovered" value={bdt(s.recoveredValue)} tone="good" sub={`${s.recovered} cart(s) · ${fmtPct(s.recoveryRate)}`} />
            <StatTile label="Completed" value={s.converted.toLocaleString('en-IN')} sub="Ordered without abandoning" />
            <StatTile label="Opted in to reminders" value={s.withContact.toLocaleString('en-IN')} sub="Abandoned carts with contact" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-neutral-200 p-5">
              <h3 className="text-sm font-black text-neutral-900 mb-3">Most often left behind</h3>
              <BarList rows={s.topAbandonedProducts.map((p) => ({ label: p.name, value: p.value, hint: `${p.quantity} unit(s) in ${p.carts} cart(s)` }))} empty="No abandoned carts in this range." />
            </section>
            <section className="bg-white rounded-2xl border border-neutral-200 p-5">
              <h3 className="text-sm font-black text-neutral-900 mb-3">Abandoned value by channel</h3>
              <BarList rows={s.byChannel.map((c) => ({ label: channelLabel(c.channel), value: c.abandonedValue, hint: `${c.abandoned} cart(s)` }))} empty="No abandoned carts in this range." />
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-black text-neutral-900">Carts</h3>
              <Segmented value={status} onChange={setStatus} options={[['abandoned', 'Abandoned'], ['recovered', 'Recovered'], ['converted', 'Completed'], ['active', 'Active']]} />
              <span className="ml-auto text-[11px] text-neutral-400">{data.total} cart(s)</span>
            </header>
            {data.carts.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="No carts here" hint="Checkouts are recorded from the moment a shopper opens the checkout page." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                      <th className="px-5 py-3">Items</th>
                      <th className="px-3 py-3 text-right">Value</th>
                      <th className="px-3 py-3">Channel</th>
                      <th className="px-3 py-3">Last activity</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.carts.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50/70 align-top">
                        <td className="px-5 py-3">
                          {c.items.map((i) => (
                            <p key={`${i.sku}-${i.size}-${i.color}`} className="text-neutral-800">
                              <b>{i.quantity}×</b> {i.name}
                              {(i.size || i.color) && <span className="text-neutral-400"> · {[i.size, i.color].filter(Boolean).join(' / ')}</span>}
                            </p>
                          ))}
                        </td>
                        <td className="px-3 py-3 text-right font-black tabular-nums">{bdt(c.value)}</td>
                        <td className="px-3 py-3">
                          {channelLabel(c.channel ?? 'direct')}
                          {c.campaign && <p className="text-[10px] text-neutral-400">{c.campaign.name}</p>}
                        </td>
                        <td className="px-3 py-3 text-neutral-600">{formatDate(c.lastActivityAt)}</td>
                        <td className="px-3 py-3">
                          <Badge color={STATUS_COLOR[c.status] ?? STATUS_COLOR.active}>{c.status === 'converted' ? 'completed' : c.status}</Badge>
                          {c.orderNumber && <p className="text-[10px] text-neutral-400 mt-1">{c.orderNumber}</p>}
                          {c.contactedAt && <p className="text-[10px] text-neutral-400 mt-1">Contacted {formatDate(c.contactedAt)}</p>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {c.hasContact ? (
                            data.canRevealContact ? (
                              <button onClick={() => setContactFor(c)} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                                <Eye className="w-3.5 h-3.5" /> Contact
                              </button>
                            ) : (
                              <span className="text-[10px] text-neutral-400">Opted in (no access)</span>
                            )
                          ) : (
                            <span className="text-[10px] text-neutral-400">No consent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.total > data.pageSize && (
              <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2 text-[11px]">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 disabled:opacity-40 cursor-pointer">Previous</button>
                <span className="text-neutral-500">Page {page} of {Math.ceil(data.total / data.pageSize)}</span>
                <button disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 disabled:opacity-40 cursor-pointer">Next</button>
              </div>
            )}
          </section>

          <p className="flex items-start gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            A checkout counts as abandoned after {data.settings.abandonAfterMinutes} minutes without activity. Contact details are stored only when the shopper ticks “{data.settings.consentText}”, are erased when they order or opt out, and are deleted {data.settings.contactRetentionDays} days after abandonment. They are never sent to Meta or Google. Every reveal is recorded in Activity Logs.
          </p>
        </>
      )}

      {contactFor && (
        <ContactModal
          cart={contactFor}
          onClose={() => setContactFor(null)}
          onChanged={() => {
            setContactFor(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ContactModal({ cart, onClose, onChanged }: { cart: Cart; onClose: () => void; onChanged: () => void }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    api
      .get<Contact>(`/admin/advertising/carts/${cart.id}/contact`)
      .then(setContact)
      .catch((e: Error) => setError(e.message));
  }, [cart.id]);

  const mark = async (action: 'contacted' | 'recovered') => {
    setBusy(true);
    try {
      await api.patch(`/admin/advertising/carts/${cart.id}`, { action });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Cart follow-up · ${bdt(cart.value)}`}>
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : !contact ? (
        <Spinner />
      ) : (
        <div className="space-y-4 text-xs">
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
            <dt className="text-neutral-400">Phone</dt>
            <dd className="font-bold text-neutral-900">{contact.phone}</dd>
            <dt className="text-neutral-400">Email</dt>
            <dd className="text-neutral-800">{contact.email ?? '—'}</dd>
            <dt className="text-neutral-400">Consent given</dt>
            <dd className="text-neutral-800">{formatDate(contact.consentAt)}</dd>
          </dl>
          <p className="text-[11px] text-neutral-500">They agreed to: “{contact.consentText}”</p>
          <div className="flex flex-wrap gap-2">
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
              <MessageCircle className="w-4 h-4" /> Open WhatsApp
            </a>
            {contact.restoreUrl && (
              <button
                onClick={() => void navigator.clipboard.writeText(contact.restoreUrl!).then(() => setCopied(true))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 font-bold hover:bg-neutral-50 cursor-pointer"
              >
                <Copy className="w-4 h-4" /> {copied ? 'Copied' : 'Copy cart link'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
            <button disabled={busy} onClick={() => void mark('contacted')} className="px-3 py-2 rounded-lg border border-neutral-200 font-bold hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
              Mark as contacted
            </button>
            {cart.status === 'abandoned' && (
              <button disabled={busy} onClick={() => void mark('recovered')} className="px-3 py-2 rounded-lg border border-neutral-200 font-bold hover:bg-neutral-50 disabled:opacity-50 cursor-pointer" title="e.g. the customer ordered by phone">
                Mark as recovered
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
