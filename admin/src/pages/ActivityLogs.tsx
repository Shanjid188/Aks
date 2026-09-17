import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ActivityLogRow } from '../types';
import { EmptyState, Spinner, formatDate } from '../components/ui';
import { Activity, RefreshCw } from 'lucide-react';

/** Activity Logs — reads the existing AuditLog table. */
export function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ logs: ActivityLogRow[] }>(`/admin/activity${action ? `?action=${encodeURIComponent(action)}` : ''}`)
      .then((r) => setLogs(r.logs))
      .catch((e: Error) => { setError(e.message); setLogs([]); })
      .finally(() => setLoading(false));
  }, [action]);

  useEffect(() => { load(); }, [load]);

  const badge = (action: string) => {
    const map: Record<string, string> = {
      'order.status.changed': 'bg-blue-50 text-blue-700',
      'order.cancelled': 'bg-red-50 text-red-700',
      'pos.sale.completed': 'bg-emerald-50 text-emerald-700',
      'inventory.adjusted': 'bg-amber-50 text-amber-700',
      'product.deleted': 'bg-red-50 text-red-700',
    };
    return map[action] || 'bg-neutral-100 text-neutral-700';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Activity Logs</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Every important action across the store, tracked from real events.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action…"
            className="w-52 text-xs font-semibold rounded-lg border border-neutral-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
          />
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D8232A]" /> Recent Activity
          </h3>
          <span className="text-[11px] font-bold text-neutral-400">{logs.length} entries</span>
        </header>
        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <EmptyState icon={<Activity className="w-6 h-6" />} title={action ? 'No logs match your filter' : 'No activity yet'} hint={action ? 'Try a different action filter.' : 'Audit events appear here as admins take action.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="px-5 py-3">When</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-500">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">{l.adminName || '—'}</p>
                      {l.adminEmail && <p className="text-[10px] text-neutral-400">{l.adminEmail}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(l.action)}`}>{l.action.replace(/\./g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}</td>
                    <td className="px-5 py-3 text-neutral-500 max-w-xs truncate">{l.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
