import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Order, OrderItem, Product } from '../types';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  LIFECYCLE_STATUSES,
  Modal,
  ORDER_STATUS_META,
  Select,
  Spinner,
  StatusBadge,
  formatDate,
} from '../components/ui';
import { Package, Search, Plus, Minus, Trash2, Loader2, ClipboardList, PackageCheck } from 'lucide-react';
import { ManageOrder } from './ManageOrder';

const bdt = (n: number) => `BDT ${n.toLocaleString('en-IN')}`;
const addr = (o: Order, key: string) => (o.customerAddress as Record<string, string>)?.[key] || '';

/** OrderItem.product.images may arrive as a parsed array or a raw TEXT
 *  string (older payloads) — normalize defensively. */
function parseJsonArr(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseVariant<T>(raw: unknown): T[] {
  return parseJsonArr(raw) as T[];
}

function itemImage(item: OrderItem): string | null {
  const imgs = item.product ? parseJsonArr((item.product as { images?: unknown }).images) : [];
  const first = imgs[0];
  return typeof first === 'string' ? first : null;
}

interface OrderSizeInput {
  size: string;
  inStock?: boolean;
  stockCount?: number;
}

interface OrderColorInput {
  name: string;
  hex: string;
}

interface DraftItem {
  key: string;
  productId: string | null;
  name: string;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
  price: number;
  sizes: OrderSizeInput[];
  colors: OrderColorInput[];
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Order | null>(null);
  // POS-style full-page Manage Order view (null = normal list)
  const [manageId, setManageId] = useState<string | null>(null);
  // Order currently being sent to Packaging (shows a spinner on its row button)
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Item editor state (only used while the detail modal is open)
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<Product[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const addSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ orders: Order[] }>('/admin/orders')
      .then((res) => {
        setOrders(res.orders);
        // Publish the live pending count so the sidebar badge stays current.
        window.dispatchEvent(
          new CustomEvent('aks-admin-pending-count', {
            detail: res.orders.filter((o) => o.status === 'pending').length,
          })
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Open a specific order / apply a status filter (Dashboard → "View" action)
  useEffect(() => {
    const openFromStorage = () => {
      const presetFilter = window.localStorage.getItem('aks_admin_order_filter');
      if (presetFilter) {
        window.localStorage.removeItem('aks_admin_order_filter');
        setStatusFilter(presetFilter);
      }
      const id = window.localStorage.getItem('aks_admin_open_order');
      if (id) {
        window.localStorage.removeItem('aks_admin_open_order');
        api
          .get<{ order: Order }>(`/admin/orders/${id}`)
          .then((res) => setDetail(res.order))
          .catch(() => undefined);
      }
    };
    let t: ReturnType<typeof setTimeout> | null = null;
    if (orders.length > 0) openFromStorage();
    else t = setTimeout(openFromStorage, 800);
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      api
        .get<{ order: Order }>(`/admin/orders/${id}`)
        .then((res) => setDetail(res.order))
        .catch(() => undefined);
    };
    window.addEventListener('aks-open-order', onOpen);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener('aks-open-order', onOpen);
    };
  }, [orders.length]);

  const openDetail = (order: Order) => {
    setDetail(order);
    setDirty(false);
    setSaveError(null);
    setDraft(
      order.items.map((it) => ({
        key: it.id,
        productId: it.productId,
        name: it.productName,
        image: itemImage(it),
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        price: it.price,
        sizes: parseVariant<OrderSizeInput>((it.product as { sizes?: unknown }).sizes),
        colors: parseVariant<OrderColorInput>((it.product as { colors?: unknown }).colors),
      }))
    );
  };

  // ── Filters (client-side over the full list — instant + counts) ──────────────
const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!term) return true;
      return (
        o.orderNumber.toLowerCase().includes(term) ||
        o.trackingCode.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.customerPhone.includes(term)
      );
    });
  }, [orders, statusFilter, search]);

const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

const changeStatus = async () => {
    if (!detail || !pendingStatus || pendingStatus === detail.status) {
      setPendingStatus(null);
      return;
    }
    setStatusSaving(true);
    try {
      const res = await api.patch<{ order: Order }>(`/admin/orders/${detail.id}`, { status: pendingStatus });
      setDetail(res.order);
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setStatusSaving(false);
      setPendingStatus(null);
    }
  };

// ── Item editor actions (recomputed server-side on Save) ─────────────────────
const updateDraftItem = (key: string, patch: Partial<DraftItem>) => {
    setDraft((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    setDirty(true);
  };

const removeDraftItem = (key: string) => {
    setDraft((prev) => prev.filter((d) => d.key !== key));
    setDirty(true);
  };

const addDraftItem = (p: Product) => {
    const sizes = parseVariant<OrderSizeInput>(p.sizes);
    const colors = parseVariant<OrderColorInput>(p.colors);
    const firstSize = sizes.find((s) => s.inStock !== false) || sizes[0];
    const firstColor = colors[0];
    const key = `new-${p.id}-${Date.now()}`;
    setDraft((prev) => [
      ...prev,
      {
        key,
        productId: p.id,
        name: p.name,
        image: parseJsonArr(p.images as unknown)[0] as string || null,
        size: firstSize?.size || '',
        color: firstColor?.name || '',
        quantity: 1,
        price: p.price,
        sizes,
        colors,
      },
    ]);
    setDirty(true);
    setAddOpen(false);
    setAddQuery('');
    setAddResults([]);
  };

const searchProducts = (term: string) => {
    setAddQuery(term);
    if (addSearchTimer.current) clearTimeout(addSearchTimer.current);
    if (!term.trim()) {
      setAddResults([]);
      return;
    }
    addSearchTimer.current = setTimeout(() => {
      setAddSearching(true);
      api
        .get<{ products: Product[] }>(`/admin/products?search=${encodeURIComponent(term.trim())}`)
        .then((res) => setAddResults(res.products.slice(0, 6)))
        .catch(() => setAddResults([]))
        .finally(() => setAddSearching(false));
    }, 350);
  };

const saveItems = async () => {
    if (!detail) return;
    if (draft.length === 0) {
      setSaveError('Order must contain at least one item.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.put<{ order: Order }>(`/admin/orders/${detail.id}/items`, {
        items: draft.map((d) => ({
          productId: d.productId,
          quantity: d.quantity,
          size: d.size,
          color: d.color,
        })),
      });
      setDetail(res.order);
      setDirty(false);
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

// ── POS-style Manage Order view (full page — replaces the list while open) ──
  if (manageId) {
    return (
      <ManageOrder
        orderId={manageId}
        onBack={() => setManageId(null)}
        onUpdated={(o) => setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))}
      />
    );
  }

  /** Move a confirmed order into the Packaging queue (status → processing). */
  const sendToPackaging = async (id: string) => {
    setSendingId(id);
    try {
      const res = await api.patch<{ order: Order }>(`/admin/orders/${id}`, { status: 'processing' });
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingId(null);
    }
  };

return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Orders</h2>
          <p className="text-xs text-neutral-400">
            {orders.length} orders · {statusCounts.pending || 0} pending
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID / name / phone…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]"
            />
          </div>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
            statusFilter === '' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
          }`}
        >
          All ({orders.length})
        </button>
        {LIFECYCLE_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
              statusFilter === s ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {ORDER_STATUS_META[s]?.label || s} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Package className="w-6 h-6" />} title="No orders found" hint="Try a different status or search term." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => (o.status === 'pending' ? setManageId(o.id) : openDetail(o))}
                    className={`hover:bg-neutral-50/60 cursor-pointer ${o.status === 'pending' ? 'bg-amber-50/40' : ''}`}
                  >
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
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {o.status === 'pending' && (
                          <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                            <Button
                              variant="secondary"
                              className="px-2.5 py-1 text-[11px]"
                              onClick={() => setManageId(o.id)}
                            >
                              <ClipboardList className="w-3.5 h-3.5" /> Manage
                            </Button>
                          </span>
                        )}
                        {o.status === 'confirmed' && (
                          <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                            <Button
                              className="px-2.5 py-1 text-[11px]"
                              onClick={() => sendToPackaging(o.id)}
                              disabled={sendingId === o.id}
                            >
                              {sendingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                              {sendingId === o.id ? 'Sending…' : 'Send to Packaging'}
                            </Button>
                          </span>
                        )}
                        <Button variant="secondary" className="px-2.5 py-1 text-[11px]">Detail</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => (o.status === 'pending' ? setManageId(o.id) : openDetail(o))}
                className={`w-full text-left bg-white rounded-2xl border p-4 space-y-2 cursor-pointer hover:border-neutral-300 transition-colors ${o.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-neutral-200'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-neutral-900">{o.orderNumber}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-xs text-neutral-600">{o.customerName} · {o.customerPhone}</p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{formatDate(o.createdAt)}</span>
                  <span className="font-black text-neutral-900">{bdt(o.total)}</span>
                </div>
                {o.status === 'pending' && (
                  <div className="flex gap-1.5 pt-1">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setManageId(o.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setManageId(o.id); } }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D8232A]/10 text-[#D8232A] text-[11px] font-bold cursor-pointer hover:bg-[#D8232A] hover:text-white transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> Manage
                    </span>
                  </div>
                )}
                {o.status === 'confirmed' && (
                  <div className="flex gap-1.5 pt-1">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); sendToPackaging(o.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); sendToPackaging(o.id); } }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D8232A] text-white text-[11px] font-bold cursor-pointer hover:bg-[#B91C1C] transition-colors"
                    >
                      {sendingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                      {sendingId === o.id ? 'Sending…' : 'Send to Packaging'}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Order detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.orderNumber} — ${detail.customerName}` : ''}
        wide
      >
        {detail && (
          <div className="space-y-5">
            {/* Customer info cards */}
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
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {detail.estimatedDelivery || '—'}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Payment</p>
                <p className="text-xs font-bold text-neutral-900 uppercase mt-0.5">{detail.paymentMethod}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{detail.couponCode ? `Coupon: ${detail.couponCode}` : '—'}</p>
              </div>
            </div>

            {/* Customer + shipping address */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Customer & Shipping Address</p>
              <p className="text-xs font-semibold text-neutral-800">
                {addr(detail, 'fullName')} · {addr(detail, 'phone')}
                {addr(detail, 'email') ? ` · ${addr(detail, 'email')}` : ''}
              </p>
              <p className="text-xs text-neutral-500">
                {addr(detail, 'streetAddress')}, {addr(detail, 'thana')}, {addr(detail, 'district')}, {addr(detail, 'division')}
                {addr(detail, 'postalCode') ? ` - ${addr(detail, 'postalCode')}` : ''}
              </p>
            </div>

            {/* Status (read only) */}
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

            {/* Items (read only) */}
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400 mb-2">
                Items ({detail.items.length})
              </p>
              <div className="space-y-2">
                {detail.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5">
                    {(() => {
                      const imgs = (() => {
                        const raw = (it.product as { images?: unknown } | null)?.images;
                        if (Array.isArray(raw)) return raw as string[];
                        if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
                        return [];
                      })();
                      const img = imgs[0];
                      return img
                        ? <img src={img} alt={it.productName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : <span className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">{it.productName.slice(0, 2).toUpperCase()}</span>;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{it.productName}</p>
                      <p className="text-[10px] text-neutral-400">
                        {it.productSku}{it.size ? ` · ${it.size}` : ''}{it.color && it.color !== 'Default' ? ` · ${it.color}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400">{bdt(it.price)} × {it.quantity}</p>
                      <p className="text-xs font-black text-neutral-900">{bdt(it.price * it.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals (read only) */}
            <div className="border-t border-neutral-100 pt-3">
              <div className="flex justify-end gap-6 text-xs">
                <div className="text-neutral-500 space-y-0.5 text-right">
                  <p>Subtotal</p>
                  {detail.discount > 0 && <p className="text-emerald-700">Discount</p>}
                  <p>Shipping</p>
                </div>
                <div className="text-neutral-900 font-bold space-y-0.5 text-right">
                  <p>{bdt(detail.subtotal)}</p>
                  {detail.discount > 0 && <p className="text-emerald-700">−{bdt(detail.discount)}</p>}
                  <p>{detail.shippingFee === 0 ? 'FREE' : bdt(detail.shippingFee)}</p>
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
          </div>
        )}
      </Modal>

      {/* Status change confirmation */}
      <ConfirmDialog
        open={!!pendingStatus && !!detail && pendingStatus !== detail.status}
        title="Change order status?"
        message={
          <>
            Move <b>{detail?.orderNumber}</b> from <b>{ORDER_STATUS_META[detail?.status || '']?.label || detail?.status}</b> to{' '}
            <b>{ORDER_STATUS_META[pendingStatus || '']?.label || pendingStatus}</b>?
          </>
        }
        confirmLabel="Change Status"
        busy={statusSaving}
        onConfirm={() => changeStatus()}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}