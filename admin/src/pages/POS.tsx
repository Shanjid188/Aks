import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Button, EmptyState, Field, Spinner, TextInput, formatDate, PageHeader } from '../components/ui';
import { Calculator, CheckCircle2, Minus, Pause, Plus, Printer, RefreshCw, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { openPosReceipt } from '../lib/posReceipt';
import { adminImageUrl } from '../lib/imageUrl';
import type { PosReceiptData } from '../lib/posReceiptTemplate';

const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;

/** Payment methods the POS offers (mirrors the payment methods the API accepts). */
const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'bkash', label: 'bKash' },
  { id: 'nagad', label: 'Nagad' },
  { id: 'card', label: 'Card' },
  { id: 'rocket', label: 'Rocket' },
  { id: 'bank', label: 'Bank Transfer' },
];

/** Hides the browser's number-input spinner so the cashier just types a figure. */
const NO_SPINNER = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

interface PosProduct {
  id: string; name: string; sku: string; barcode: string | null; brand: string; category: string;
  price: number; image: string; trackStock: boolean; stockQuantity: number; available: number;
}

interface CartLine {
  productId: string; name: string; sku: string; price: number; quantity: number; available: number; trackStock: boolean;
}

interface HoldRow {
  id: string; orderNumber: string; customerName: string; customerPhone: string;
  subtotal: number; discount: number; total: number; heldAt: string;
  items: { id: string; productId: string | null; productName: string; productSku: string; quantity: number; price: number; size: string; color: string }[];
}

interface SaleResult { subtotal: number; discount: number; tax: number; shippingFee: number; total: number; paidAmount: number; dueAmount: number; paymentStatus: string }

export function PosPage() {
  const [catalog, setCatalog] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('');
  // Dynamic VAT (%) the cashier can set per sale.
  const [vatPercent, setVatPercent] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [holds, setHolds] = useState<HoldRow[]>([]);
  const [showHolds, setShowHolds] = useState(false);
  const [resumedHoldId, setResumedHoldId] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [prodRes, invRes] = await Promise.all([
        api.get<{ products: { id: string; name: string; sku: string; barcode: string | null; brand: string; category: string; price: number; images: string[] }[] }>('/admin/products?status=active'),
        api.get<{ items: { id: string; trackStock: boolean; stockQuantity: number; available: number }[] }>('/admin/inventory'),
      ]);
      const stock = new Map((invRes.items || []).map((i) => [i.id, i]));
      setCatalog(
        (prodRes.products || []).map((p) => {
          const s = stock.get(p.id);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode ?? null,
            brand: p.brand,
            category: p.category,
            price: p.price,
            image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
            trackStock: s?.trackStock ?? false,
            stockQuantity: s?.stockQuantity ?? 0,
            available: s?.available ?? 0,
          };
        })
      );
    } catch (e) {
      setError((e as Error).message); setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHolds = useCallback(async () => {
    try {
      const res = await api.get<{ holds: HoldRow[] }>('/pos/holds');
      setHolds(res.holds || []);
    } catch { /* catalog errors are handled separately */ }
  }, []);

  useEffect(() => { load(); loadHolds(); }, [load, loadHolds]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(catalog.map((p) => p.category))).sort()], [catalog]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((p) =>
      (category === 'all' || p.category === category) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ? p.barcode.toLowerCase().includes(q) : false) ||
        p.brand.toLowerCase().includes(q))
    );
  }, [catalog, search, category]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  /** productId → qty currently in the cart (drives the "selected" card highlight). */
  const inCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart) m.set(l.productId, (m.get(l.productId) || 0) + l.quantity);
    return m;
  }, [cart]);
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const vatNum = Math.max(0, Number(vatPercent) || 0);
  const taxable = Math.max(0, subtotal - discountNum);
  // Dynamic VAT — mirrors the server formula exactly so the printed total matches.
  const taxAmount = Math.round(taxable * vatNum) / 100;
  const total = taxable + taxAmount;

  const addToCart = (p: PosProduct) => {
    setError(null); setOk(null);
    const existing = cart.find((l) => l.productId === p.id);
    const qtyInCart = existing?.quantity ?? 0;
    if (p.trackStock && qtyInCart + 1 > p.available) {
      setError(`Not enough stock for ${p.name} (available: ${p.available})`);
      return;
    }
    if (existing) {
      setCart(cart.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      setCart([...cart, { productId: p.id, name: p.name, sku: p.sku, price: p.price, quantity: 1, available: p.available, trackStock: p.trackStock }]);
    }
  };

  const changeQty = (productId: string, delta: number) => {
    setError(null); setOk(null);
    setCart(
      cart
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = l.quantity + delta;
          if (next < 1) return null;
          if (l.trackStock && next > l.available) {
            setError(`Only ${l.available} units of ${l.name} in stock`);
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l): l is CartLine => l !== null)
    );
  };

  const removeLine = (productId: string) => setCart(cart.filter((l) => l.productId !== productId));

  const clearCart = () => { setCart([]); setDiscount(''); setVatPercent(''); setPaidAmount(''); setCustomerName(''); setCustomerPhone(''); setNote(''); setResumedHoldId(null); };

  const submitSale = async () => {
    if (cart.length === 0) return;
    setBusy(true); setError(null); setOk(null);
    try {
      // Record what the customer actually tendered (it may exceed the total) so the
      // receipt can show the amount received and the change given. The server still
      // caps the applied paidAmount, so the order balance stays correct.
      const tendered = Math.max(0, Number(paidAmount) || 0) || total;
      const res = await api.post<{ order: PosReceiptData; sale: SaleResult }>('/pos/sales', {
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, price: l.price, size: 'Free Size', color: 'Default' })),
        payments: [{ method: paymentMethod, amount: tendered }],
        discount: discountNum,
        taxPercent: vatNum,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (resumedHoldId) {
        try { await api.del(`/pos/holds/${resumedHoldId}`); } catch { /* best-effort cleanup */ }
      }
      // Professional 80mm thermal receipt (shared module) from the real sale.
      openPosReceipt(res.order, { autoPrint: true });
      setOk(`Sale completed — ${res.order.invoiceNumber || res.order.orderNumber}`);
      clearCart();
      setPaidAmount('');
      load(); loadHolds();
      if (res.sale.dueAmount > 0) setOk(`Sale completed — BDT ${res.sale.dueAmount} still due.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const holdSale = async () => {
    if (cart.length === 0) return;
    setBusy(true); setError(null); setOk(null);
    try {
      await api.post('/pos/holds', {
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, price: l.price, size: 'Free Size', color: 'Default' })),
        discount: discountNum,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
      });
      clearCart();
      loadHolds(); setShowHolds(true);
      setOk('Sale held — resume it from the Holds list anytime.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resumeHold = async (h: HoldRow) => {
    setBusy(true); setError(null); setOk(null);
    try {
      await api.patch(`/pos/holds/${h.id}`, { held: false });
      const lines: CartLine[] = h.items.map((it) => ({
        productId: it.productId || it.id,
        name: it.productName,
        sku: it.productSku,
        price: it.price,
        quantity: it.quantity,
        available: 9999,
        trackStock: false,
      }));
      setCart(lines);
      setCustomerName(h.customerName === 'Walk-in Customer' ? '' : h.customerName || '');
      setCustomerPhone(h.customerPhone || '');
      setResumedHoldId(h.id);
      setShowHolds(false);
      setOk(`Held sale ${h.orderNumber} loaded — complete checkout to finalize.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancelHold = async (id: string) => {
    if (!window.confirm('Discard this held sale?')) return;
    try { await api.del(`/pos/holds/${id}`); loadHolds(); } catch (e) { setError((e as Error).message); }
  };

  // What the customer actually handed over (uncapped) so change is shown correctly.
  const received = Math.max(0, Number(paidAmount) || 0);
  const change = received > total ? received - total : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Counter"
        title="POS Register"
        desc="Counter sales with live stock checks — checkout posts to /pos/sales."
        icon={<Calculator className="w-5 h-5" />}
        actions={
          <>
            {holds.length > 0 && (
              <Button variant="secondary" onClick={() => setShowHolds(!showHolds)}><Pause className="w-3.5 h-3.5" /> Holds ({holds.length})</Button>
            )}
            <button onClick={() => { load(); loadHolds(); }} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white/10 border border-white/15 text-white hover:bg-white/20 cursor-pointer" title="Refresh catalog"><RefreshCw className="w-3.5 h-3.5" /></button>
          </>
        }
      />

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {ok && <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}

      {showHolds && holds.length > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><Pause className="w-4 h-4 text-amber-500" /> Held Sales</h3>
            <button onClick={() => setShowHolds(false)} className="text-[11px] font-bold text-neutral-400 hover:text-neutral-700 cursor-pointer">Close</button>
          </header>
          <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
            {holds.map((h) => (
              <div key={h.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900">{h.orderNumber} <span className="text-neutral-400 font-mono text-[10px]">· {formatDate(h.heldAt)}</span></p>
                  <p className="text-[11px] text-neutral-500 truncate">{h.customerName} · {h.items.reduce((s, i) => s + i.quantity, 0)} items</p>
                </div>
                <span className="text-xs font-black text-neutral-900 shrink-0">{bdt(h.total)}</span>
                <Button onClick={() => resumeHold(h)} disabled={busy} className="!py-1.5 !px-3">Resume</Button>
                <button onClick={() => cancelHold(h.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Discard"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* ─────────── Catalog ─────────── */}
        <section className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#D8232A]" /> Catalog</h3>
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, barcode or brand…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${category === c ? 'bg-[#D8232A] border-[#D8232A] text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:border-[#D8232A]/40 hover:text-[#D8232A]'}`}
                >
                  {c === 'all' ? 'All categories' : c}
                </button>
              ))}
            </div>
          </header>
          {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="No products match" hint="Adjust the search or category filter." /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 max-h-[560px] overflow-y-auto">
              {filtered.map((p) => {
                const out = p.trackStock && p.available <= 0;
                const qtyInCart = inCart.get(p.id) || 0;
                const selected = qtyInCart > 0;
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                    aria-pressed={selected}
                    className={`relative text-left rounded-xl border-2 transition-all p-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white group ${selected ? 'border-[#D8232A] ring-2 ring-[#D8232A]/25 shadow-md' : 'border-neutral-200 hover:border-[#D8232A]/40 hover:shadow-md'}`}>
                    {selected && (
                      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#D8232A] text-white text-[10px] font-black pl-1 pr-2 py-0.5 shadow" title={`${qtyInCart} in cart`}>
                        <CheckCircle2 className="w-3 h-3" /> {qtyInCart}
                      </span>
                    )}
                    <div className="relative">
                      {p.image ? <img src={adminImageUrl(p.image)} alt="" className="w-full h-20 object-cover rounded-lg bg-neutral-100 mb-2" /> : <div className="w-full h-20 rounded-lg bg-neutral-100 mb-2 flex items-center justify-center text-neutral-300 text-[10px] font-bold">NO IMAGE</div>}
                      {selected && (
                        <span className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 rounded-b-lg bg-[#D8232A]/90 text-white text-[10px] font-black py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Added · {qtyInCart} in cart
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-neutral-900 leading-tight truncate">{p.name}</p>
                    <p className="text-[9px] text-neutral-400 font-mono truncate mt-0.5">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-black text-[#D8232A]">{bdt(p.price)}</span>
                      {p.trackStock ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${out ? 'bg-red-50 text-red-700' : p.available <= 5 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {out ? 'Out' : `${p.available} in stock`}
                        </span>
                      ) : <span className="text-[9px] font-bold text-neutral-400">No tracking</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─────────── Cart ─────────── */}
        <section className="bg-white rounded-2xl border border-neutral-200 xl:sticky xl:top-24">
          <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#D8232A]" /> Current Sale</h3>
            <span className="text-[11px] font-bold text-neutral-400">{cartCount} items</span>
          </header>
          <div className="p-5 space-y-4">
            {cart.length === 0 ? <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="Cart is empty" hint="Tap products to add them to the sale." /> : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {cart.map((l) => (
                  <div key={l.productId} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-neutral-900 truncate">{l.name}</p>
                      <p className="text-[9px] text-neutral-400 font-mono">{l.sku} · {bdt(l.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => changeQty(l.productId, -1)} className="w-6 h-6 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <span className="w-7 text-center text-xs font-black">{l.quantity}</span>
                      <button onClick={() => changeQty(l.productId, 1)} className="w-6 h-6 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button onClick={() => removeLine(l.productId)} className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 text-xs border-t border-neutral-100 pt-3">
              <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span className="font-bold">{bdt(subtotal)}</span></div>
              <div className="flex items-center justify-between text-neutral-600"><span>Discount</span><input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" placeholder="0" className={`${NO_SPINNER} w-24 px-2 py-1 text-right text-xs rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]`} /></div>
              <div className="flex items-center justify-between text-neutral-600">
                <span className="flex items-center gap-1">VAT <input value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} type="number" min="0" placeholder="0" className={`${NO_SPINNER} w-14 px-2 py-1 text-right text-xs rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]`} /><span className="text-neutral-400">%</span></span>
                <span className="font-bold text-neutral-800">{bdt(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-black text-neutral-900"><span>Total</span><span className="text-[#D8232A]">{bdt(total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer"><TextInput value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" /></Field>
              <Field label="Phone"><TextInput value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
            </div>
            <Field label="Note"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>

            <div>
              <span className="block text-[11px] font-bold text-neutral-500 mb-1">Payment method</span>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${paymentMethod === m.id ? 'bg-[#D8232A] border-[#D8232A] text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:border-[#D8232A]/40 hover:text-[#D8232A]'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Received amount"><TextInput type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder={String(Math.round(total))} className={NO_SPINNER} /></Field>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 space-y-1 text-xs font-bold">
              <div className="flex justify-between"><span className="text-neutral-600">Received</span><span className="text-neutral-900">{bdt(received)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-600">Change to return</span><span className={change > 0 ? 'text-emerald-700' : 'text-neutral-400'}>{bdt(change)}</span></div>
            </div>

            <div className="flex gap-2">
              <Button onClick={submitSale} disabled={busy || cart.length === 0} className="flex-1">
                <Printer className="w-3.5 h-3.5" /> {busy ? 'Processing…' : 'Complete Sale'}
              </Button>
              <Button variant="ghost" onClick={holdSale} disabled={busy || cart.length === 0} title="Hold this sale for later">
                <Pause className="w-3.5 h-3.5" /> Hold
              </Button>
              {cart.length > 0 && (
                <button onClick={clearCart} className="px-2 text-neutral-400 hover:text-red-600 cursor-pointer" title="Clear cart"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
