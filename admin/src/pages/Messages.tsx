import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ContactMessage } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextArea } from '../components/ui';
import { Inbox, Mail, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';

/** Statuses a message can move through (mirrors the API's allow-list). */
const STATUSES = ['new', 'read', 'replied', 'closed'] as const;

const statusStyle = (status: string) =>
  status === 'new'
    ? 'bg-amber-50 text-amber-700'
    : status === 'replied'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'closed'
        ? 'bg-neutral-100 text-neutral-500'
        : 'bg-blue-50 text-blue-700';

/**
 * Contact-form inbox — messages sent from a storefront content page
 * (Admin → Content Pages → "Show contact form"). Nothing is emailed, so this
 * page is where a message is actually read and answered.
 */
export function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ContactMessage | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (query.trim()) params.set('q', query.trim());
    const suffix = params.toString() ? `?${params.toString()}` : '';
    api
      .get<{ messages: ContactMessage[]; total: number; unread: number }>(`/admin/contact-messages${suffix}`)
      .then((res) => {
        setMessages(res.messages);
        setTotal(res.total);
        setUnread(res.unread);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (message: ContactMessage, body: Record<string, unknown>) => {
    try {
      const res = await api.patch<{ message: ContactMessage }>(`/admin/contact-messages/${message.id}`, body);
      setMessages((prev) => prev.map((x) => (x.id === message.id ? res.message : x)));
      setOpen((prev) => (prev && prev.id === message.id ? res.message : prev));
      // The unread counter is only worth re-reading when it can have changed.
      if (body.status === 'new' || message.status === 'new') load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (message: ContactMessage) => {
    if (!window.confirm(`Delete the message from ${message.name}?`)) return;
    try {
      await api.del(`/admin/contact-messages/${message.id}`);
      setMessages((prev) => prev.filter((x) => x.id !== message.id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (message.status === 'new') setUnread((prev) => Math.max(0, prev - 1));
      setOpen(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** Opening a new message marks it read — that is what the admin meant by it. */
  const openMessage = (message: ContactMessage) => {
    setOpen(message);
    if (message.status === 'new') void patch(message, { status: 'read' });
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Contact Messages</h2>
          <p className="text-xs text-neutral-400">
            {total} messages{unread > 0 ? ` · ${unread} new` : ''}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Sent from the storefront contact form. Reply by phone or email yourself — this panel does not send mail.
          </p>
        </div>
        <Button variant="ghost" onClick={load} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              status === '' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                status === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {s}
              {s === 'new' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, text…"
            className="w-64 pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title={status || query ? 'Nothing matches that filter' : 'No messages yet'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => openMessage(m)}
              className="text-left bg-white rounded-2xl border border-neutral-200 p-4 space-y-2 hover:border-[#D8232A]/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-neutral-900">{m.name}</p>
                  <p className="text-[10px] text-neutral-400">{fmtDate(m.createdAt)}</p>
                </div>
                <Badge color={statusStyle(m.status)}>{m.status}</Badge>
              </div>
              {m.subject && <p className="text-xs font-semibold text-neutral-800">{m.subject}</p>}
              <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{m.message}</p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400 pt-1">
                {m.phone && (


                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {m.phone}
                  </span>
                )}
                {m.email && (
                  <span className="inline-flex items-center gap-1 break-all">
                    <Mail className="w-3 h-3" /> {m.email}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(null)} title={`Message from ${open.name}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Phone</p>
                <p className="font-semibold text-neutral-800 break-all">{open.phone || '—'}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Email</p>
                <p className="font-semibold text-neutral-800 break-all">{open.email || '—'}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Received</p>
                <p className="font-semibold text-neutral-800">{fmtDate(open.createdAt)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">From page</p>
                <p className="font-semibold text-neutral-800">/{open.pageSlug}</p>
              </div>
            </div>

            {open.subject && (
              <div>
                <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Subject</p>
                <p className="text-sm font-semibold text-neutral-900">{open.subject}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Message</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{open.message}</p>
            </div>

            <Field label="Internal note" hint="Only your team sees this — the customer never does.">
              <TextArea value={open.adminNote} onChange={(e) => setOpen({ ...open, adminNote: e.target.value })} />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={open.status === s ? 'primary' : 'ghost'}
                    onClick={() => void patch(open, { status: s })}
                    className="px-2.5 py-1 text-[11px] capitalize"
                  >
                    {s}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => void patch(open, { adminNote: open.adminNote })}
                  className="px-2.5 py-1 text-[11px]"
                >
                  Save note
                </Button>
              </div>
              <Button variant="danger" onClick={() => remove(open)} className="px-2.5 py-1 text-[11px]">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

