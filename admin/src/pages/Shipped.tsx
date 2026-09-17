import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { Button, EmptyState, Spinner, formatDate } from '../components/ui';
import {
  Truck, CheckCircle2, RotateCcw, Loader2,
} from 'lucide-react';

const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;

/** Dedicated Shipped page — courier handoff, then Delivery or Return. */
export function ShippedPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ orders: Order[] }>('/admin/orders?status=shipped')
      .then((res) => setOrders(res.orders))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Courier handoff: confirm the parcel was given to the courier (dispatchedAt).
  // After this the row shows Delivery + Return buttons instead of the গাড়ি button.
  const handoff = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/packaging/${id}`, { packedStatus: 'shipped', dispatched: true });
      const res = await api.get<{ order: Order }>(`/admin/orders/${id}`);
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const markDelivered = async (id: string) => {
    setBusyId(id);
    try {
      const res = await api.patch<{ order: Order }>(`/admin/orders/${id}`, { status: 'delivered' });
      setOrders((prev) => prev.filter((o) => o.id !== res.order.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const markReturned = async (id: string) => {
    setBusyId(id);
    try {
      const res = await api.patch<{ order: Order }>(`/admin/orders/${id}`, { status: 'returned' });
      setOrders((prev) => prev.filter((o) => o.id !== res.order.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Shipped Orders</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Confirm courier handoff, then mark Delivery or Return.</p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer" title="Refresh">
          <Truck className="w-3.5 h-3.5 text-neutral-600" />
        </button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#D8232A]" /> Courier Queue
          </h3>
          <span className="text-[11px] font-bold text-neutral-400">{orders.length} shipped</span>
        </header>
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState icon={<Truck className="w-6 h-6" />} title="No shipped orders" hint="Orders awaiting courier handoff appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Shipped</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((o) => {
                  const dispatched = !!(o as Order & { dispatchedAt?: string | null }).dispatchedAt;
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-neutral-900">{o.orderNumber}</p>
                        <p className="text-[10px] font-mono text-neutral-400">{o.trackingCode}</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {o.customerName}<br />
                        <span className="text-[10px] text-neutral-400">{o.customerPhone}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{o.items?.length || 0}</td>
                      <td className="px-4 py-3 font-black text-neutral-900">{bdt(o.total)}</td>
                      <td className="px-4 py-3 text-neutral-500 text-[10px]">{formatDate(o.updatedAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {!dispatched ? (
                            <Button onClick={() => handoff(o.id)} disabled={busyId === o.id} className="px-2.5 py-1 text-[11px]">
                              {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />} গাড়ি
                            </Button>
                          ) : (
                            <>
                              <Button onClick={() => markDelivered(o.id)} disabled={busyId === o.id} variant="secondary" className="px-2.5 py-1 text-[11px] !bg-emerald-50 !text-emerald-700 !border-emerald-200">
                                {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Delivery
                              </Button>
                              <Button onClick={() => markReturned(o.id)} disabled={busyId === o.id} variant="secondary" className="px-2.5 py-1 text-[11px] !bg-red-50 !text-red-700 !border-red-200">
                                <RotateCcw className="w-3.5 h-3.5" /> Return
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
