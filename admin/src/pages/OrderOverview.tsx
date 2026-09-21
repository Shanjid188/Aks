import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { Button, Modal, Spinner, StatusBadge, formatDate } from '../components/ui';
import {
  Package, Clock, PackageCheck, Boxes, Truck, CheckCircle2, XCircle, ShoppingBag, Activity, Undo2, Banknote,
} from 'lucide-react';

interface LogEntry { id: string; adminName: string | null; adminEmail: string | null; action: string; details: string; createdAt: string }

const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;
const addr = (o: Order, k: string) => (o.customerAddress as Record<string, string>)?.[k] || '';
function parseJsonArr(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

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
  { key: 'returned', label: 'Returned', icon: <Undo2 className="w-5 h-5" />, tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'refunded', label: 'Refunded', icon: <Banknote className="w-5 h-5" />, tone: 'bg-teal-50 text-teal-700 border-teal-200' },
];

/** Read-only order overview — status count cards only (no edit, no status change). */
export function OrderOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [activity, setActivity] = useState<LogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

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

  const openDetail = (order: Order) => {
    setDetail(order);
    setActivity([]);
    setActivityLoading(true);
    api
      .get<{ logs: LogEntry[] }>(`/admin/activity?entity=order&entityId=${order.id}`)
      .then((res) => setActivity(res.logs))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  };

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  if (loading) return <div className="p-6"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-neutral-900">Order Overview</h2>
        <p className="text-xs text-neutral-400">Live order counts by status — click an order to see details.</p>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
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
                  <tr key={o.id} onClick={() => openDetail(o)} className="hover:bg-neutral-50/60 cursor-pointer">
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

      {/* Read-only order detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.orderNumber} — ${detail.customerName}` : ''}
        wide
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Order ID</p>
                <p className="font-mono text-sm font-bold text-neutral-900 mt-0.5">{detail.orderNumber}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{formatDate(detail.createdAt)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Tracking</p>
                <p className="font-mono text-sm font-bold text-neutral-900 mt-0.5">{detail.trackingCode}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Delivery</p>
                <p className="text-xs font-bold text-neutral-900 capitalize mt-0.5">{detail.deliveryMethod}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{detail.estimatedDelivery || '—'}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Payment</p>
                <p className="text-xs font-bold text-neutral-900 uppercase mt-0.5">{detail.paymentMethod}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{detail.couponCode ? `Coupon: ${detail.couponCode}` : '—'}</p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Customer & Shipping Address</p>
              <p className="text-xs font-semibold text-neutral-800">
                {addr(detail, 'fullName')} · {addr(detail, 'phone')}{addr(detail, 'email') ? ` · ${addr(detail, 'email')}` : ''}
              </p>
              <p className="text-xs text-neutral-500">
                {addr(detail, 'streetAddress')}, {addr(detail, 'thana')}, {addr(detail, 'district')}, {addr(detail, 'division')}{addr(detail, 'postalCode') ? ` - ${addr(detail, 'postalCode')}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <div>
                <p className="text-[10px] font-bold uppercase text-neutral-400">Order Status</p>
                <div className="mt-1"><StatusBadge status={detail.status} /></div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Payment Status</p>
                <p className="mt-1 text-xs font-bold uppercase text-neutral-700">{detail.paymentStatus || 'unpaid'}</p>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400 mb-2">Items ({detail.items.length})</p>
              <div className="space-y-2">
                {detail.items.map((it) => {
                  const imgs = parseJsonArr((it.product as { images?: unknown } | null)?.images) as string[];
                  const img = imgs[0];
                  return (
                    <div key={it.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5">
                      {img ? <img src={img} alt={it.productName} className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">{it.productName.slice(0, 2).toUpperCase()}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{it.productName}</p>
                        <p className="text-[10px] text-neutral-400">{it.productSku}{it.size ? ` · ${it.size}` : ''}{it.color && it.color !== 'Default' ? ` · ${it.color}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400">{bdt(it.price)} × {it.quantity}</p>
                        <p className="text-xs font-black text-neutral-900">{bdt(it.price * it.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <div className="flex justify-end gap-6 text-xs">
                <div className="text-neutral-500 space-y-0.5 text-right">
                  <p>Subtotal</p>{detail.discount > 0 && <p className="text-emerald-700">Discount</p>}<p>Shipping</p>
                </div>
                <div className="text-neutral-900 font-bold space-y-0.5 text-right">
                  <p>{bdt(detail.subtotal)}</p>{detail.discount > 0 && <p className="text-emerald-700">−{bdt(detail.discount)}</p>}<p>{detail.shippingFee === 0 ? 'FREE' : bdt(detail.shippingFee)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-neutral-400">Total</p>
                  <p className="text-lg font-black text-[#D8232A]">{bdt(detail.total)}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Activity Log
              </p>
              {activityLoading ? (
                <p className="text-xs text-neutral-400 px-1 py-2">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="text-xs text-neutral-400 px-1 py-2">No activity recorded for this order.</p>
              ) : (
                <ol className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activity.map((log) => (
                    <li key={log.id} className="flex gap-3 text-xs">
                      <span className="flex flex-col items-center pt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#D8232A] shrink-0" />
                        <span className="w-px flex-1 bg-neutral-200 mt-1" />
                      </span>
                      <span className="flex-1 min-w-0 pb-2">
                        <span className="block font-bold text-neutral-900">{log.action.replace(/[._]/g, ' ')}</span>
                        {log.details && <span className="block text-neutral-500 capitalize">{log.details}</span>}
                        <span className="block text-[10px] text-neutral-400 mt-0.5">{log.adminName || log.adminEmail || 'System'} · {formatDate(log.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
