import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Stats } from '../types';
import { Badge, Spinner, formatDate, statusColors } from '../components/ui';
import { Banknote, Package, Clock, ShoppingBag, AlertTriangle } from 'lucide-react';

const bdt = (n: number) => `৳${n.toLocaleString('en-IN')}`;

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Stats>('/admin/stats')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600 p-6">{error}</p>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'Total Revenue', value: bdt(stats.revenue), icon: <Banknote className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Orders', value: String(stats.ordersCount), icon: <ShoppingBag className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending / Active', value: String(stats.pendingOrdersCount), icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
    { label: 'Delivered', value: String(stats.deliveredOrdersCount), icon: <Package className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{c.label}</p>
              <p className="text-lg font-black text-neutral-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Low stock warning */}
      {stats.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-black text-neutral-900">Low Stock Warning</h3>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {stats.lowStockProducts.length} products
            </span>
          </div>
          <div className="divide-y divide-neutral-100">
            {stats.lowStockProducts.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                {p.image ? (
                  <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-neutral-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-neutral-100" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-neutral-400">{p.sku}</p>
                </div>
                <Badge color="bg-red-50 text-red-700">Only {p.lowestStock} left</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-black text-neutral-900">Recent Orders</h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {stats.recentOrders.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-10">No orders yet.</p>
          ) : (
            stats.recentOrders.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">
                    {o.customerName} <span className="text-neutral-400 font-normal">·{o.trackingCode}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400">{formatDate(o.createdAt)}</p>
                </div>
                <Badge color={statusColors[o.status] || 'bg-neutral-100 text-neutral-600'}>{o.status}</Badge>
                <span className="text-xs font-black text-neutral-900 w-20 text-right">{bdt(o.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}