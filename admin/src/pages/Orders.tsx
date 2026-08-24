import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { Badge, Button, EmptyState, Modal, Select, Spinner, statusColors, formatDate } from '../components/ui';
import { Package, Search } from 'lucide-react';

const STATUSES = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const bdt = (n: number) => `৳${n.toLocaleString('en-IN')}`;
const addr = (o: Order, key: string) => (o.customerAddress as Record<string, string>)?.[key] || '';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    api
      .get<{ orders: Order[] }>(`/admin/orders?${params.toString()}`)
      .then((res) => setOrders(res.orders))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const changeStatus = async (order: Order, status: string) => {
    const res = await api.patch<{ order: Order }>(`/admin/orders/${order.id}`, { status });
    setOrders((prev) => prev.map((o) => (o.id === order.id ? res.order : o)));
    setDetail((prev) => (prev && prev.id === order.id ? res.order : prev));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Orders</h2>
          <p className="text-xs text-neutral-400">{orders.length} orders</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search name / phone / code…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]"
            />
          </div>
          <Button onClick={() => load()}>Filter</Button>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Package className="w-6 h-6" />} title="No orders found" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-neutral-900">{o.orderNumber}</p>
                    <p className="text-[10px] font-mono text-neutral-400">{o.trackingCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-neutral-900">{o.customerName}</p>
                    <p className="text-[11px] text-neutral-400">{o.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 uppercase text-neutral-600">{o.paymentMethod}</td>
                  <td className="px-4 py-3 font-black text-neutral-900">{bdt(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColors[o.status] || 'bg-neutral-100 text-neutral-600'}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => setDetail(o)} className="px-2.5 py-1 text-[11px]">
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.orderNumber} — ${detail.customerName}` : ''} wide>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                <p className="text-[11px] font-bold uppercase text-neutral-400">Tracking</p>
                <p className="font-mono text-sm font-bold text-neutral-900">{detail.trackingCode}</p>
                <p className="text-[11px] text-neutral-400 mt-1">{formatDate(detail.createdAt)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                <p className="text-[11px] font-bold uppercase text-neutral-400">Delivery</p>
                <p className="text-xs font-bold text-neutral-900 capitalize">{detail.deliveryMethod}</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {detail.pickupStore ? `Pickup: ${detail.pickupStore}` : detail.estimatedDelivery || '—'}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <p className="text-[11px] font-bold uppercase text-neutral-400">Shipping Address</p>
              <p className="text-xs font-semibold text-neutral-800 mt-1">{addr(detail, 'fullName')} · {addr(detail, 'phone')}</p>
              <p className="text-xs text-neutral-500">
                {addr(detail, 'streetAddress')}, {addr(detail, 'thana')}, {addr(detail, 'district')}, {addr(detail, 'division')}
              </p>
            </div>

            <Select value={detail.status} onChange={(e) => changeStatus(detail, e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>

            <div className="border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400 mb-2">Items ({detail.items.length})</p>
              <div className="space-y-2">
                {detail.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-800 truncate">
                      {it.productName} <span className="text-neutral-400">· {it.size} · {it.color} × {it.quantity}</span>
                    </span>
                    <span className="font-bold text-neutral-900">{bdt(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-neutral-100 text-xs">
              <div className="text-neutral-500">
                <p>Subtotal {bdt(detail.subtotal)}</p>
                {detail.discount > 0 && <p className="text-emerald-700">Discount −{bdt(detail.discount)}</p>}
                <p>Shipping {detail.shippingFee === 0 ? 'FREE' : bdt(detail.shippingFee)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-neutral-400 uppercase font-bold">Total</p>
                <p className="text-lg font-black text-[#D8232A]">{bdt(detail.total)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}