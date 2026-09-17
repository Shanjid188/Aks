import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Customer } from '../types';
import { EmptyState, Spinner, formatDate } from '../components/ui';
import { Mail, MapPin, RefreshCw, ShoppingBag, Users } from 'lucide-react';

const bdt = (n: number) => `BDT ${Math.round(n).toLocaleString('en-IN')}`;

/** Standalone All-Customers page (one row per unique customer phone). */
export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ customers: Customer[] }>('/admin/customers')
      .then((res) => setCustomers(res.customers))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      )
    : customers;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Customers</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Every unique customer built from real orders — spending, location and last order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-56 text-xs font-semibold rounded-lg border border-neutral-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
          />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>
      {/* __CUSTOMERS_TABLE__ */}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> All Customers
          </h3>
          {filtered.length > 0 && (
            <span className="text-[11px] font-bold text-neutral-400">
              {filtered.length === customers.length
                ? `${customers.length} total`
                : `${filtered.length} of ${customers.length}`}
            </span>
          )}
        </header>
        {/* __CUSTOMERS_BODY__ */}
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title={q ? 'No customers match your search' : 'No customers yet'}
              hint={
                q
                  ? 'Try a different name, phone number or email.'
                  : 'Once orders are placed, each unique phone number becomes a customer here.'
              }
            />
          </div>
        ) : (
          <CustomerTable customers={filtered} />
        )}
      </section>
    </div>
  );
}

function CustomerTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
            <th className="px-5 py-3">Customer</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Total Spent</th>
            <th className="px-5 py-3 text-right">Last Order</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {customers.map((c) => (
            <tr key={c.phone} className="hover:bg-neutral-50/80 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    {(c.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono truncate">{c.phone}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {c.email ? (
                  <p className="text-[11px] text-neutral-600 flex items-center gap-1.5 truncate max-w-[180px]">
                    <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </p>
                ) : (
                  <span className="text-[10px] text-neutral-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {c.division ? (
                  <p className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span className="truncate max-w-[130px]">
                      {c.division}
                      {c.district ? ` · ${c.district}` : ''}
                    </span>
                  </p>
                ) : (
                  <span className="text-[10px] text-neutral-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-black text-neutral-900">
                  <ShoppingBag className="w-3 h-3 text-neutral-400" />
                  {c.ordersCount}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-xs font-black text-[#D8232A]">{bdt(c.totalSpent)}</p>
              </td>
              <td className="px-5 py-3 text-right">
                <p className="text-[11px] font-semibold text-neutral-700">{formatDate(c.lastOrderAt)}</p>
                <p className="text-[10px] text-neutral-400 font-mono">{c.lastOrderNumber}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
