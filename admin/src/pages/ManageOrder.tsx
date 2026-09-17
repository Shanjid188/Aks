import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Order, OrderItem, Product } from '../types';
import {
  Button,
  ConfirmDialog,
  ORDER_STATUS_META,
  Spinner,
  StatusBadge,
  formatDate,
} from '../components/ui';
import {
  ArrowLeft, Check, FileText, Loader2, Minus, PackageCheck, Plus,
  Search, Trash2, Truck, X,
} from 'lucide-react';

const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;

/* ── Helpers (same defensive JSON parsing as the rest of the admin) ────────── */
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

interface OrderSizeInput { size: string; inStock?: boolean; stockCount?: number }
interface OrderColorInput { name: string; hex: string }

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

interface CustomerDraft {
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  thana: string;
  district: string;
  division: string;
  postalCode: string;
}

/* ── Print helpers — real order data only, no mock values ─────────────────── */

/** A4 invoice (customer copy — prices + totals) built from the live order. */
function printInvoice(order: Order) {
  const a = (order.customerAddress as Record<string, string>) || {};
  const rows = (order.items || []).map((it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:12px">${it.productName}<br/><span style="color:#999;font-size:11px">${it.productSku}${it.size ? ' · ' + it.size : ''}${it.color && it.color !== 'Default' ? ' · ' + it.color : ''}</span></td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:center;font-size:12px">${it.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px">${bdt(it.price)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px">${bdt(it.price * it.quantity)}</td>
    </tr>`).join('');
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;
  w.document.write(`
  <html><head><title>Invoice ${order.invoiceNumber || order.orderNumber}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0;padding:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #D8232A;padding-bottom:14px;margin-bottom:18px}
    .brand{font-size:22px;font-weight:900;letter-spacing:-.5px}.brand span{color:#D8232A}
    .meta{text-align:right;font-size:12px;color:#525252}
    .box{display:flex;justify-content:space-between;gap:24px;margin-bottom:18px}
    .box div{width:50%;font-size:12px;color:#404040;line-height:1.6}
    .box b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#a3a3a3;margin-bottom:4px}
    table{width:100%;border-collapse:collapse}
    thead th{text-align:left;font-size:11px;text-transform:uppercase;color:#a3a3a3;border-bottom:2px solid #e5e5e5;padding:6px 0}
    .totals{margin-top:16px;margin-left:auto;width:280px}
    .totals div{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f5f5f5}
    .totals .grand{font-size:16px;font-weight:900;color:#D8232A;padding-top:8px;border-top:2px solid #171717}
    .foot{margin-top:26px;font-size:11px;color:#a3a3a3;line-height:1.7;border-top:1px solid #e5e5e5;padding-top:12px}
    .sig{margin-top:36px;display:flex;justify-content:space-between;font-size:12px;color:#525252}
    .sign{width:200px;border-top:1px solid #171717;padding-top:6px;text-align:center}
    @media print{ body{-webkit-print-color-adjust:exact} }
  </style></head><body>
    <div class="head">
      <div class="brand">AKS <span>Mart</span><div style="font-size:11px;color:#737373;font-weight:500">One Mart. Many Choices.</div></div>
      <div class="meta"><b style="font-size:14px;color:#171717">INVOICE</b><br/>${order.invoiceNumber || order.orderNumber}<br/>${formatDate(order.createdAt)}</div>
    </div>
    <div class="box">
      <div><b>Billed To</b>${a.fullName || order.customerName}<br/>${a.phone || order.customerPhone}<br/>${[a.streetAddress, a.thana, a.district, a.division].filter(Boolean).join(', ')}</div>
      <div><b>Order</b>${order.orderNumber}<br/>${order.trackingCode}<br/>${order.paymentMethod.toUpperCase()} · ${(order.paymentStatus || 'unpaid').toUpperCase()}</div>
    </div>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${bdt(order.subtotal)}</span></div>
      ${order.discount > 0 ? `<div><span>Discount</span><span>-${bdt(order.discount)}</span></div>` : ''}
      <div><span>Shipping</span><span>${order.shippingFee === 0 ? 'FREE' : bdt(order.shippingFee)}</span></div>
      <div class="grand"><span>Total</span><span>${bdt(order.total)}</span></div>
    </div>
    <div class="foot">Thank you for shopping with AKS Mart.</div>
    <div class="sig"><div class="sign">Customer Signature</div><div class="sign">Authorized Signature</div></div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

/** Packaging slip (packing-team copy — items to pack, no prices) from the live order. */
function printSlip(order: Order) {
  const a = (order.customerAddress as Record<string, string>) || {};
  const rows = (order.items || []).map((it) => `
    <tr><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.productName}<br/><span style="color:#999;font-size:11px">${it.productSku}</span></td><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.color || '—'}</td><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.size || '—'}</td><td style="padding:7px;border-bottom:1px solid #e5e5e5;text-align:center">${it.quantity}</td><td style="width:50px;text-align:center">☐</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=760,height=1000');
  if (!w) return;
  w.document.write(`
  <html><head><title>Packaging Slip ${order.orderNumber}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0;padding:22px;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #D8232A;padding-bottom:12px;margin-bottom:14px}
    .brand{font-size:20px;font-weight:900}.brand span{color:#D8232A}
    .no{text-align:right;font-size:12px;color:#525252}
    .cust{margin-bottom:12px;font-size:12px;color:#404040;line-height:1.6}
    table{width:100%;border-collapse:collapse}thead th{text-align:left;font-size:11px;text-transform:uppercase;color:#a3a3a3;border-bottom:2px solid #e5e5e5;padding:5px}
    .foot{margin-top:26px;display:flex;justify-content:space-between;font-size:12px}
    .sign{width:200px;border-top:1px solid #171717;padding-top:6px;text-align:center;color:#525252}
    @media print{ body{-webkit-print-color-adjust:exact} }
  </style></head><body>
    <div class="head"><div class="brand">AKS <span>Mart</span></div><div class="no"><b style="font-size:14px">PACKING SLIP</b><br/>${order.orderNumber}<br/>${order.trackingCode}<br/>${formatDate(order.createdAt)}</div></div>
    <div class="cust"><b>Ship To</b><br/>${a.fullName || order.customerName}<br/>${a.phone || order.customerPhone}<br/>${[a.streetAddress, a.thana, a.district, a.division].filter(Boolean).join(', ')}</div>
    <table><thead><tr><th>Item</th><th>Color</th><th>Size</th><th style="text-align:center">Qty</th><th style="text-align:center">✓</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="foot"><div class="sign">Packed By</div><div class="sign">Checked By</div></div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

/* ── The Manage Order page (POS-style) ────────────────────────────────────── */

export function ManageOrder({
  orderId,
  onBack,
  onUpdated,
}: {
  orderId: string;
  onBack: () => void;
  onUpdated?: (order: Order) => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Product search (name / SKU / barcode — same endpoint POS uses)
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<Product[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyOrder = useCallback((o: Order) => {
    setOrder(o);
    const a = (o.customerAddress as Record<string, string>) || {};
    setCustomer({
      fullName: a.fullName || o.customerName || '',
      phone: a.phone || o.customerPhone || '',
      email: a.email || o.customerEmail || '',
      streetAddress: a.streetAddress || '',
      thana: a.thana || '',
      district: a.district || '',
      division: a.division || '',
      postalCode: a.postalCode || '',
    });
    setDraft(
      (o.items || []).map((it: OrderItem) => ({
        key: it.id,
        productId: it.productId,
        name: it.productName,
        image: (parseJsonArr((it.product as { images?: unknown } | null)?.images)[0] as string) || null,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        price: it.price,
        sizes: parseJsonArr((it.product as { sizes?: unknown } | null)?.sizes) as OrderSizeInput[],
        colors: parseJsonArr((it.product as { colors?: unknown } | null)?.colors) as OrderColorInput[],
      }))
    );
    setDirty(false);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ order: Order }>(`/admin/orders/${orderId}`)
      .then((res) => applyOrder(res.order))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId, applyOrder]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Save actions ───────────────────────────────────────────────────────── */
  const saveCustomer = async (): Promise<boolean> => {
    if (!order || !customer) return false;
    if (!customer.fullName.trim() || !customer.phone.trim()) {
      setActionError('Customer name and phone are required.');
      return false;
    }
    const res = await api.put<{ order: Order }>(`/admin/orders/${order.id}/customer`, {
      customerName: customer.fullName.trim(),
      customerPhone: customer.phone.trim(),
      customerEmail: customer.email.trim(),
      customerAddress: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),
        streetAddress: customer.streetAddress.trim(),
        thana: customer.thana.trim(),
        district: customer.district.trim(),
        division: customer.division.trim(),
        postalCode: customer.postalCode.trim(),
      },
    });
    applyOrder(res.order);
    onUpdated?.(res.order);
    return true;
  };

  const saveItems = async (): Promise<boolean> => {
    if (!order) return false;
    if (draft.length === 0) {
      setActionError('Order must contain at least one item.');
      return false;
    }
    const res = await api.put<{ order: Order }>(`/admin/orders/${order.id}/items`, {
      items: draft.map((d) => ({
        productId: d.productId,
        quantity: d.quantity,
        size: d.size,
        color: d.color,
      })),
    });
    applyOrder(res.order);
    onUpdated?.(res.order);
    return true;
  };

  const setStatus = async (status: string): Promise<boolean> => {
    if (!order) return false;
    const res = await api.patch<{ order: Order }>(`/admin/orders/${order.id}`, { status });
    applyOrder(res.order);
    onUpdated?.(res.order);
    return true;
  };

  /** pending → saves items + customer, then confirms the order and returns to the list. */
  const updateAndConfirm = async () => {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      if (!(await saveItems())) return;
      if (!(await saveCustomer())) return;
      if (!(await setStatus('confirmed'))) return;
      // Confirmed — the Manage Order work is done; go back to the Orders list.
      onBack();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      await setStatus('cancelled');
      // Cancelled — nothing left to manage; go back to the Orders list.
      onBack();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  /**
   * Print a document. Printing either document from a *confirmed* order
   * automatically moves the order into processing (the packing stage).
   */
  const printAndAdvance = async (kind: 'slip' | 'invoice') => {
    if (!order) return;
    setActionError(null);
    if (kind === 'slip') printSlip(order);
    else printInvoice(order);
    if (order.status === 'confirmed') {
      try {
        await setStatus('processing');
      } catch (e) {
        setActionError(`Printed, but could not auto-move to Processing: ${(e as Error).message}`);
      }
    }
  };

  const shipOrder = async () => {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      await setStatus('shipped');
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markDelivered = async () => {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      await setStatus('delivered');
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Plain "Save Changes" for editable states (items + customer, no status change). */
  const saveChanges = async () => {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      if (!(await saveItems())) return;
      if (!(await saveCustomer())) return;
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const draftSubtotal = useMemo(() => draft.reduce((s, d) => s + d.price * d.quantity, 0), [draft]);
  const status = order?.status ?? '';

  /* ── Draft item actions (totals recomputed server-side on save) ────────── */
  const updateDraftItem = (key: string, patch: Partial<DraftItem>) => {
    setDraft((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    setDirty(true);
  };
  const removeDraftItem = (key: string) => {
    setDraft((prev) => prev.filter((d) => d.key !== key));
    setDirty(true);
  };
  const addDraftItem = (p: Product) => {
    const sizes = parseJsonArr(p.sizes) as OrderSizeInput[];
    const colors = parseJsonArr(p.colors) as OrderColorInput[];
    setDraft((prev) => [
      ...prev,
      {
        key: `new-${p.id}-${Date.now()}`,
        productId: p.id,
        name: p.name,
        image: (parseJsonArr(p.images)[0] as string) || null,
        size: (sizes.find((s) => s.inStock !== false) || sizes[0])?.size || '',
        color: colors[0]?.name || '',
        quantity: 1,
        price: p.price,
        sizes,
        colors,
      },
    ]);
    setDirty(true);
    setAddQuery('');
    setAddResults([]);
  };

  const searchProducts = (term: string) => {
    setAddQuery(term);
    if (addTimer.current) clearTimeout(addTimer.current);
    if (!term.trim()) {
      setAddResults([]);
      return;
    }
    addTimer.current = setTimeout(() => {
      setAddSearching(true);
      api
        .get<{ products: Product[] }>(`/admin/products?search=${encodeURIComponent(term.trim())}`)
        .then((res) => setAddResults(res.products.slice(0, 8)))
        .catch(() => setAddResults([]))
        .finally(() => setAddSearching(false));
    }, 300);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    );
  }
  if (error || !order || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4" /> Back to Orders</Button>
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error || 'Order not found'}</p>
      </div>
    );
  }

  const editable = status === 'pending';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4" /> Orders</Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-neutral-900">Manage Order</h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              {order.orderNumber} · {order.trackingCode}
              {order.invoiceNumber ? ` · ${order.invoiceNumber}` : ''} · {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <>
              <Button variant="danger" onClick={() => setConfirmCancel(true)} disabled={busy}>
                <X className="w-4 h-4" /> Cancel Order
              </Button>
              <Button onClick={updateAndConfirm} disabled={busy || draft.length === 0}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {busy ? 'Working…' : 'Update & Confirm'}
              </Button>
            </>
          )}
          {(status === 'confirmed' || status === 'processing' || status === 'packed') && (
            <>
              <Button variant="secondary" onClick={() => printAndAdvance('slip')}>
                <PackageCheck className="w-4 h-4" /> Print Packaging Slip
              </Button>
              <Button variant="secondary" onClick={() => printAndAdvance('invoice')}>
                <FileText className="w-4 h-4" /> Print Invoice
              </Button>
              {(status === 'processing' || status === 'packed') && (
                <Button onClick={shipOrder} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Ship
                </Button>
              )}
            </>
          )}
          {status === 'shipped' && (
            <Button onClick={markDelivered} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark Delivered
            </Button>
          )}
          {!editable && dirty && (
            <Button variant="secondary" onClick={saveChanges} disabled={busy}>
              {busy ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Flow hint */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        {(['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const).map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full ${status === s ? 'bg-[#D8232A] text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              {ORDER_STATUS_META[s]?.label || s}
            </span>
            {i < arr.length - 1 && <span className="text-neutral-300">→</span>}
          </span>
        ))}
      </div>

      {actionError && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
      )}

      {/* POS-style layout: cart on the left, customer form on the right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Cart / items ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900">Items ({draft.length})</h3>
            {editable && <span className="text-[10px] font-bold uppercase text-neutral-400">Add / edit products before confirming</span>}
          </div>

          {editable && (
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={addQuery}
                  onChange={(e) => searchProducts(e.target.value)}
                  placeholder="Add product — search name, SKU or barcode…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]"
                />
                {addSearching && <Loader2 className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
              </div>
              {addResults.length > 0 && (
                <div className="mt-2 mb-1 divide-y divide-neutral-100 rounded-xl border border-neutral-200 overflow-hidden">
                  {addResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addDraftItem(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-neutral-900 truncate">{p.name}</span>
                        <span className="block text-[10px] text-neutral-400">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</span>
                      </span>
                      <span className="text-xs font-black text-[#D8232A]">{bdt(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-4 space-y-2">
            {draft.length === 0 && (
              <p className="text-xs text-neutral-400 py-6 text-center">No items in this order yet.</p>
            )}
            {draft.map((d) => (
              <div key={d.key} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5">
                {d.image ? (
                  <img src={d.image} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">
                    {d.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{d.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {d.sizes.length > 0 && (
                      <select
                        value={d.size}
                        onChange={(e) => updateDraftItem(d.key, { size: e.target.value })}
                        disabled={!editable}
                        className="text-[10px] font-bold border border-neutral-200 rounded-md px-1 py-0.5 bg-white cursor-pointer disabled:cursor-default"
                      >
                        {d.sizes.map((s) => <option key={s.size} value={s.size}>{s.size}</option>)}
                      </select>
                    )}
                    {d.colors.length > 0 && (
                      <select
                        value={d.color}
                        onChange={(e) => updateDraftItem(d.key, { color: e.target.value })}
                        disabled={!editable}
                        className="text-[10px] font-bold border border-neutral-200 rounded-md px-1 py-0.5 bg-white cursor-pointer disabled:cursor-default"
                      >
                        {d.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateDraftItem(d.key, { quantity: Math.max(1, d.quantity - 1) })}
                    disabled={!editable}
                    className="w-6 h-6 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-black text-neutral-900">{d.quantity}</span>
                  <button
                    onClick={() => updateDraftItem(d.key, { quantity: d.quantity + 1 })}
                    disabled={!editable}
                    className="w-6 h-6 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-20 text-right">
                  <p className="text-xs font-black text-neutral-900">{bdt(d.price * d.quantity)}</p>
                </div>
                <button
                  onClick={() => removeDraftItem(d.key)}
                  disabled={!editable}
                  className="p-1.5 rounded-lg text-neutral-300 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals (server-computed after save; draft subtotal shown while editing) */}
          <div className="border-t border-neutral-100 px-5 py-4">
            <div className="flex justify-end gap-6 text-xs">
              <div className="text-neutral-500 space-y-0.5 text-right">
                <p>Subtotal</p>
                {order.discount > 0 && <p className="text-emerald-700">Discount</p>}
                <p>Shipping</p>
              </div>
              <div className="text-neutral-900 font-bold space-y-0.5 text-right">
                <p>{bdt(dirty ? draftSubtotal : order.subtotal)}</p>
                {order.discount > 0 && <p className="text-emerald-700">-{bdt(order.discount)}</p>}
                <p>{order.shippingFee === 0 ? 'FREE' : bdt(order.shippingFee)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Total</p>
                <p className="text-lg font-black text-[#D8232A]">
                  {bdt(dirty ? Math.max(0, draftSubtotal - order.discount) + order.shippingFee : order.total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Customer form ── */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900">Customer & Address</h3>
            <span className={`text-[10px] font-bold uppercase ${editable ? 'text-[#D8232A]' : 'text-neutral-400'}`}>
              {editable ? 'Editable' : 'Locked'}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {([
              ['fullName', 'Full Name', 'text'],
              ['phone', 'Phone', 'tel'],
              ['email', 'Email (optional)', 'email'],
              ['streetAddress', 'Street Address', 'text'],
              ['thana', 'Thana / Upazila', 'text'],
              ['district', 'District', 'text'],
              ['division', 'Division', 'text'],
              ['postalCode', 'Postal Code', 'text'],
            ] as [keyof CustomerDraft, string, string][]).map(([field, label, type]) => (
              <label key={field} className="block">
                <span className="text-[10px] font-bold uppercase text-neutral-400">{label}</span>
                <input
                  type={type}
                  value={customer[field]}
                  onChange={(e) => {
                    setCustomer((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
                    setDirty(true);
                  }}
                  disabled={!editable}
                  className="mt-0.5 w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A] disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-default"
                />
              </label>
            ))}

            {/* Order meta (read-only context) */}
            <div className="pt-2 space-y-1.5 text-[11px] text-neutral-500">
              <p><b className="text-neutral-700">Payment:</b> {order.paymentMethod.toUpperCase()} · {(order.paymentStatus || 'unpaid').toUpperCase()}</p>
              <p><b className="text-neutral-700">Delivery:</b> {order.deliveryMethod}{order.estimatedDelivery ? ` · ${order.estimatedDelivery}` : ''}</p>
              <p><b className="text-neutral-700">Source:</b> {(order.source || 'online').toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation */}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message={
          <>
            Cancel <b>{order.orderNumber}</b>? Stock for tracked products will be restored automatically. This cannot be undone from this screen.
          </>
        }
        confirmLabel="Cancel Order"
        busy={busy}
        onConfirm={cancelOrder}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
