import React, { useEffect, useState } from 'react';
import { useRouter, matchRoute, Link } from '../lib/router';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import type { Order } from '../types';
import { CheckCircle2, Package, Truck, MapPin, Banknote, Loader2, SearchX } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Packing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

/**
 * Dedicated order-confirmation page at /order-success/:id.
 * The ID comes from the URL path (with a legacy ?id= fallback) and the order
 * is loaded from local state first, then from the backend so the page
 * survives a refresh and works even after the cart has been cleared.
 */
export function OrderSuccessPage() {
  const { path, query } = useRouter();
  const { getOrderById, fetchOrderById } = useStore();

  const pathId = matchRoute('/order-success/:id', path)?.id ?? '';
  const id = pathId || query.get('id') || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Instant: the order just placed lives in local state (also persisted
      //    to localStorage, so a refresh in the same browser finds it here).
      const local = getOrderById(id);
      if (local && !cancelled) {
        setOrder(local);
        setLoading(false);
        return;
      }
      // 2) Backend: survives refreshes and works for guest checkout too.
      const fetched = await fetchOrderById(id);
      if (!cancelled) {
        setOrder(fetched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Loader2 className="w-8 h-8 text-[#D8232A] animate-spin mx-auto" />
        <p className="mt-4 text-sm text-neutral-500">Loading your order…</p>
      </div>
    );
  }

  /* ── Not found ── */
  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-16 h-16 bg-red-50 text-[#D8232A] rounded-full flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-neutral-900">We couldn't find this order</h1>
        <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
          The order may have been placed in a different browser. If you have your tracking code
          (starts with AKS-BD-), you can look it up here.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/track-order"
            className="px-6 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-black rounded-full transition-colors"
          >
            Track Your Order
          </Link>
          <Link
            to="/products"
            className="px-6 py-2.5 border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-bold rounded-full transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  const addr = order.shippingAddress;
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Headline */}
      <div className="text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isCancelled ? 'bg-red-50 text-[#D8232A]' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {isCancelled ? <SearchX className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
          {isCancelled ? 'This order was cancelled' : 'Your order has been placed successfully!'}
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">Thank you for shopping with AKS Mart.</p>
      </div>
      {/* Order reference card */}
      <div className="mt-8 bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Order ID</p>
            <p className="text-sm font-black text-neutral-900 break-all">{order.orderNumber || order.id}</p>
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
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </div>
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

        {/* Summary */}
        <div className="py-4 space-y-1.5 text-sm border-b border-neutral-100">
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
        {/* Shipping + payment */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex gap-2.5">
            <MapPin className="w-4 h-4 text-[#D8232A] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-neutral-900">Delivery Address</p>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {addr?.fullName}
                <br />
                {addr?.phone}
                <br />
                {[addr?.streetAddress, addr?.thana, addr?.district, addr?.division]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Banknote className="w-4 h-4 text-[#D8232A] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-neutral-900">Payment</p>
              <p className="text-xs text-neutral-600 mt-1">
                Cash on Delivery — pay when your order arrives.
              </p>
              {order.estimatedDelivery && (
                <p className="text-[11px] text-neutral-400 mt-1.5">{order.estimatedDelivery}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next step + CTAs */}
      <div className="mt-6 flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
        <Truck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600 leading-relaxed">
          What's next? We'll prepare your order for delivery. Keep your tracking code{' '}
          <span className="font-bold text-neutral-900">{order.trackingCode}</span> handy to check
          its status anytime.
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/track-order"
          className="w-full sm:w-auto px-6 py-3 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-black rounded-full transition-colors text-center"
        >
          Track Your Order
        </Link>
        <Link
          to="/products"
          className="w-full sm:w-auto px-6 py-3 border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-bold rounded-full transition-colors text-center"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
