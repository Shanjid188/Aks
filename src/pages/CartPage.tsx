import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { Link, useRouter } from '../lib/router';
import { ShoppingBag, Trash2, Minus, Plus, Tag, ArrowRight, Truck } from 'lucide-react';

/** Dedicated cart page at /cart. */
export const CartPage: React.FC = () => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    shippingFee,
    currency,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useStore();
  const { navigate } = useRouter();
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = await applyCoupon(couponInput.trim());
    setCouponMsg({ ok: res.success, text: res.message });
    if (res.success) setCouponInput('');
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-[#D8232A] rounded-full flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-neutral-900">Your cart is empty</h1>
        <p className="text-sm text-neutral-500 mt-2">Find something you'll love.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#D8232A] text-white text-xs font-bold rounded-full hover:bg-[#b51c22] transition-colors"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* __CART_HEAD__ */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-neutral-900">Cart</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-neutral-400 hover:text-[#D8232A] transition-colors cursor-pointer"
        >
          Clear cart
        </button>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2">
          <ul className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {cart.map((item) => (
              <li key={item.cartItemId} className="p-4 sm:p-5 flex gap-4">
                <Link to={`/products/${item.product.slug}`} className="shrink-0">
                  <img
                    src={item.product.images[0] || item.selectedColor.image}
                    alt={item.product.name}
                    className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl object-cover bg-neutral-100"
                    loading="lazy"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-neutral-500">
                        {item.selectedColor?.hex && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-200 inline-block"
                            style={{ backgroundColor: item.selectedColor.hex }}
                            title={item.selectedColor.name}
                          />
                        )}
                        <span>{item.selectedColor?.name}</span>
                        {item.selectedSize?.size && (
                          <>
                            <span className="text-neutral-300">·</span>
                            <span>Size {item.selectedSize.size}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="p-1.5 rounded-lg text-neutral-300 hover:text-[#D8232A] hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="inline-flex items-center border border-neutral-200 rounded-full">
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-neutral-900">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-black text-neutral-900">
                      {formatPrice(item.product.price * item.quantity, currency)}
                    </p>
                  </div>

                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-neutral-500 hover:text-[#D8232A] transition-colors"
          >
            ← Continue shopping
          </Link>
        </div>
        {/* __CART_SUMMARY__ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-black text-neutral-900 mb-4">Order Summary</h2>
            {/* __CART_SUMMARY_ROWS__ */}
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-neutral-900">{formatPrice(cartSubtotal, currency)}</dd>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</dt>
                  <dd className="font-semibold">−{formatPrice(cartDiscount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <dt>Delivery</dt>
                <dd className="font-semibold text-neutral-900">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold">Free</span>
                  ) : (
                    formatPrice(shippingFee, currency)
                  )}
                </dd>
              </div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between">
                <dt className="font-black text-neutral-900">Total</dt>
                <dd className="text-base font-black text-[#D8232A]">{formatPrice(cartTotal, currency)}</dd>
              </div>
            </dl>

            {/* __CART_COUPON__ */}
            {appliedCoupon ? (
              <div className="mt-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <Tag className="w-3.5 h-3.5" /> {appliedCoupon.code}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-bold text-emerald-700 hover:text-red-600 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="flex-1 min-w-0 text-xs font-semibold rounded-lg border border-neutral-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
                />
                <button
                  type="submit"
                  className="text-xs font-black rounded-lg px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}
            {couponMsg && (
              <p className={`mt-2 text-[11px] font-bold ${couponMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {couponMsg.text}
              </p>
            )}

            <Link
              to="/checkout"
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D8232A] text-white text-xs font-black rounded-full hover:bg-[#b51c22] transition-colors"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
              <Truck className="w-3.5 h-3.5" /> Free delivery on orders over ৳2,500
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
