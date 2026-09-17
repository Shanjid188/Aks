import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { InventoryItem, StockMovementRow } from '../types';
import { Button, EmptyState, Field, Modal, Select, Spinner, TextInput, formatDate } from '../components/ui';
import { RefreshCw, Boxes, PlusCircle, MinusCircle, History } from 'lucide-react';

const bdt = (n: number) => `BDT ${n.toLocaleString('en-IN')}`;

export function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<StockMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [adjust, setAdjust] = useState<{ productId: string; name: string; sku: string; current: number; change: string; reason: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ items: InventoryItem[] }>(`/admin/inventory${query ? `?search=${encodeURIComponent(query)}` : ''}`)
      .then((r) => setRows(r.items))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, [query]);
  useEffect(() => { load(); }, [load]);

  const loadHistory = useCallback(() => {
    api.get<{ movements: StockMovementRow[] }>('/admin/inventory/history')
      .then((r) => setHistory(r.movements))
      .catch(() => setHistory([]));
  }, []);
  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

  const save = async () => {
    if (!adjust || !adjust.change) return;
    setSaving(true);
    try {
      await api.post('/admin/inventory/adjust', { productId: adjust.productId, change: Number(adjust.change) || 0, reason: adjust.reason || 'manual.correction', note: adjust.note || undefined });
      setAdjust(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const lowCount = rows.filter((r) => r.isLow).length;
  const outCount = rows.filter((r) => r.isOut).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div><h2 className="text-lg font-black text-neutral-900">Inventory</h2><p className="text-xs text-neutral-500 mt-0.5">{rows.length} products · <span className="text-amber-700 font-bold">{lowCount} low stock</span> · <span className="text-red-600 font-bold">{outCount} out of stock</span></p></div>
        <div className="flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / SKU / barcode…" className="w-52 text-xs font-semibold rounded-lg border border-neutral-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]" />
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <Button variant="secondary" onClick={() => { loadHistory(); setShowHistory(!showHistory); }}><History className="w-3.5 h-3.5" /> {showHistory ? 'Stock List' : 'History'}</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {showHistory ? (
        <section className="bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><History className="w-4 h-4 text-[#D8232A]" /> Stock Movement History</h3>
            <span className="text-[11px] font-bold text-neutral-400">{history.length} recent</span>
          </header>
          {history.length === 0 ? <EmptyState icon={<History className="w-6 h-6" />} title="No movements yet" hint="Stock changes (orders, purchases, adjustments) appear here." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Product</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">By</th><th className="px-5 py-3 text-right">When</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {history.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/70">
                      <td className="px-5 py-3"><p className="font-bold text-neutral-900">{m.productName}</p><p className="text-[10px] text-neutral-400 font-mono">{m.sku}</p></td>
                      <td className="px-4 py-3"><span className={`inline-block font-black ${m.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.change >= 0 ? '+' : ''}{m.change}</span></td>
                      <td className="px-4 py-3 text-neutral-600">{m.reason}</td>
                      <td className="px-4 py-3 text-neutral-500">{m.createdBy || '—'}</td>
                      <td className="px-5 py-3 text-right text-neutral-500">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-neutral-200">
          <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><Boxes className="w-4 h-4 text-[#D8232A]" /> Products &amp; Stock</h3>
            <span className="text-[11px] font-bold text-neutral-400">{rows.length} items</span>
          </header>
          {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Boxes className="w-6 h-6" />} title={query ? 'No products match' : 'No inventory yet'} hint={query ? 'Try a different search.' : 'Products will appear here automatically.'} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Reserved</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Threshold</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Adjust</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/70">
                      <td className="px-5 py-3 font-bold text-neutral-900">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-neutral-500">{r.sku}</td>
                      <td className="px-4 py-3 font-black text-neutral-900">{r.stockQuantity}</td>
                      <td className="px-4 py-3 text-neutral-500">{r.reserved}</td>
                      <td className="px-4 py-3 font-bold text-neutral-900">{r.available}</td>
                      <td className="px-4 py-3 text-neutral-500">{r.lowStockThreshold}</td>
                      <td className="px-4 py-3">{r.isOut ? <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">Out of stock</span> : r.isLow ? <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Low stock</span> : <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">OK</span>}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setAdjust({ productId: r.id, name: r.name, sku: r.sku, current: r.stockQuantity, change: '+1', reason: 'manual.correction', note: '' })} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Add stock"><PlusCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setAdjust({ productId: r.id, name: r.name, sku: r.sku, current: r.stockQuantity, change: '-1', reason: 'manual.correction', note: '' })} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" title="Remove stock"><MinusCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Adjust Stock — ${adjust?.name ?? ''}`}>
        {adjust && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">SKU <span className="font-mono font-bold">{adjust.sku}</span> · Current: <span className="font-black text-neutral-900">{adjust.current}</span></p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Change (+/-)"><TextInput value={adjust.change} onChange={(e) => setAdjust({ ...adjust, change: e.target.value })} placeholder="e.g. +5 or -3" /></Field>
              <Field label="New quantity preview"><TextInput value={String(Math.max(0, adjust.current + (Number(adjust.change) || 0)))} disabled /></Field>
            </div>
            <Field label="Reason (type)"><Select value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}><option>manual.correction</option><option>stock.added</option><option>stock.removed</option><option>damage</option><option>return.received</option><option>purchase.received</option></Select></Field>
            <Field label="Note"><TextInput value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} placeholder="Optional note for the history log" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdjust(null)}>Cancel</Button>
              <Button disabled={saving || !adjust.change} onClick={save}>{saving ? 'Saving…' : 'Apply Adjustment'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
