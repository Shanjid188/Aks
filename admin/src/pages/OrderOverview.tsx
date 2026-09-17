import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { Spinner, StatusBadge, ORDER_STATUS_META } from '../components/ui';
import {
  Package, Clock, PackageCheck, Boxes, Truck, CheckCircle2, XCircle, ShoppingBag,
} from 'lucide-react';

interface CountCard {
  key: string;
  label: string;
  icon: React.ReactNode;
  tone: string;
}

const CARDS: CountCard[] = [
  { key: 'all', label: 'All Orders', icon: <ShoppingBag className="w-5 h-5" />, tone: 'bg-neutral-50 text-neutral-700 border-neutral-200' },
  { key: 'pending', label: 'Pending', icon: <Clock className="w-5 h-5" />, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'confirmed', label: 'Confirmed', icon: <PackageCheck className="w-5 h-5" />, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'processing', label: 'Packaging', icon: <Boxes className="w-5 h-5" />, tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'shipped', label: 'Shipped', icon: <Truck className="w-5 h-5" />, tone: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 className="w-5 h-5" />, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-5 h-5" />, tone: 'bg-red-50 text-red-700 border-red-200' },
];

/** Read-only order overview — status count cards only (no edit, no status change). */
export function OrderOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ orders: Order[] }>('/admin/orders')
      .then((res) => setOrders(res.orders))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  if (loading) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-neutral-900">Order Overview</h2>
        <p className="text-xs text-neutral-400">Live order counts by status — read only.</p>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {CARDS.map((c) => (
          <div key={c.key} className={`rounded-2xl border p-4 ${c.tone}`}>
            <div className="flex items-center justify-between">
              <span className="opacity-80">{c.icon}</span>
              <span className="text-2xl font-black">{counts[c.key] ?? 0}</span>
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Quick recent snapshot — read only, no actions */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#D8232A]" /> Recent Orders
          </h3>
          <span className="text-[11px] font-bold text-neutral-400">{orders.length} total</span>
        </div>
        {orders.length === 0 ? (
          <p className="text-xs text-neutral-400 px-5 py-8 text-center">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.slice(0, 10).map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">{o.orderNumber}</p>
                      <p className="text-[10px] font-mono text-neutral-400">{o.trackingCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">{o.customerName}</p>
                      <p className="text-[11px] text-neutral-400">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-black text-neutral-900">
                      BDT {Number(o.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
