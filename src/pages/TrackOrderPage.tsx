import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import type { Order } from '../types';
import { Package, Search, Loader2, X } from 'lucide-react';

const TRACKER_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'] as const;
const TRACKER_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Packing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * Dedicated order-tracking page at /track-order.
 * Looks up orders by ID or AKS-BD tracking code — from local state first,
 * then the backend so guests and refreshed sessions work too.
 */
export function TrackOrderPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const { getOrderById, fetchOrderById, fetchOrderByTracking } = useStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || searching) return;
    setSearching(true);
    setError('');
    setResult(null);
    try {
      // 1) Local state (orders placed in this browser).
      let found = getOrderById(q);
      // 2) Backend — tracking codes use the public track endpoint, plain IDs
      //    use the public order endpoint.
      if (!found) {
        found = /^AKS-BD-/i.test(q)
          ? await fetchOrderByTracking(q)
          : await fetchOrderById(q);
      }
      if (found) setResult(found);
      else setError('No order found with that ID or tracking code. Please check and try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <Package className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Track Your Order</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Enter your order ID or tracking code (e.g. AKS-BD-123456) to see the status.
        </p>
      </div>
      <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Order ID or AKS-BD-XXXXXX"
              aria-label="Order ID or tracking code"
              className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 bg-[#D8232A] text-white text-xs font-black rounded-xl hover:bg-[#b51c22] transition-colors cursor-pointer disabled:opacity-60"
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {searching && (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-[#D8232A] animate-spin mx-auto" />
        </div>
      )}

      {error && !searching && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 text-center">
          {error}
        </div>
      )}

      {result && !searching && <OrderResult order={result} onClose={() => setResult(null)} />}

      {!result && !error && !searching && (
        <p className="text-center text-xs text-neutral-400 mt-8">
          Enter an order ID above to track it.
        </p>
      )}
    </div>
  );
}

/** Result card for a tracked order — status progress, items, totals, address. */
function OrderResult({ order, onClose }: { order: Order; onClose: () => void }) {
  const isCancelled = order.status === 'cancelled';
  const currentStep = TRACKER_FLOW.indexOf(order.status as (typeof TRACKER_FLOW)[number]);
  const addr = order.shippingAddress;

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 relative">
      <button
        onClick={onClose}
        aria-label="Close order details"
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Reference */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4 border-b border-neutral-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Order ID</p>
          <p className="text-sm font-black text-neutral-900 break-all">{order.id}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Tracking Code</p>
          <p className="text-sm font-black text-[#D8232A]">{order.trackingCode}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Status</p>
          <span
            className={`inline-block text-[11px] font-black px-2.5 py-1 rounded-full ${
              isCancelled ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {TRACKER_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Status progress */}
      {!isCancelled && currentStep >= 0 && (
        <div className="py-5 border-b border-neutral-100 overflow-x-auto">
          <div className="flex items-center min-w-[420px]">
            {TRACKER_FLOW.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      i <= currentStep ? 'bg-[#D8232A] text-white' : 'bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[9px] font-bold text-neutral-500 mt-1 text-center">
                    {TRACKER_LABELS[step]}
                  </span>
                </div>
                {i < TRACKER_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-[#D8232A]' : 'bg-neutral-200'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="py-4 space-y-3 border-b border-neutral-100">
        {order.items.map((item) => (
          <div key={item.cartItemId} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
              {item.product.images?.[0] ? (
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <Package className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{item.product.name}</p>
              <p className="text-[11px] text-neutral-500">
                {[item.selectedColor?.name, item.selectedSize?.size].filter(Boolean).join(' · ')}
                {` · Qty ${item.quantity}`}
              </p>
            </div>
            <p className="text-sm font-black text-neutral-900">
              {formatPrice(item.product.price * item.quantity, 'BDT')}
            </p>
          </div>
        ))}
      </div>

      {/* Totals + address */}
      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-black text-neutral-900 mb-1.5">Delivery Address</p>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {addr?.fullName}
            <br />
            {addr?.phone}
            <br />
            {[addr?.streetAddress, addr?.thana, addr?.district, addr?.division]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="font-semibold">{formatPrice(order.subtotal, 'BDT')}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span className="font-semibold">−{formatPrice(order.discount, 'BDT')}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-600">
            <span>Delivery Charge</span>
            <span className="font-semibold">
              {order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee, 'BDT')}
            </span>
          </div>
          <div className="flex justify-between pt-1.5 text-base font-black text-neutral-900">
            <span>Total</span>
            <span className="text-[#D8232A]">{formatPrice(order.total, 'BDT')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
