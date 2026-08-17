import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Truck,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartSubtotal,
    cartDiscount,
    shippingFee,
    cartTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    freeShippingThreshold,
    currency,
    setIsCheckoutOpen,
    clearCart,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');

  if (!isCartDrawerOpen) return null;

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Free shipping math
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartDrawerOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsCartDrawerOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D8232A]" />
            <h2 className="font-black text-base text-neutral-900 tracking-tight">
              Shopping Bag ({totalCartCount})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-neutral-400 hover:text-red-600 font-semibold transition-colors mr-2 cursor-pointer"
              >
                Empty
              </button>
            )}
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="bg-amber-50/80 px-5 py-3 border-b border-amber-200/60">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#D8232A]" />
              {amountNeededForFreeShipping === 0 ? (
                <span className="text-emerald-700 font-black">🎉 You have unlocked FREE Delivery across Bangladesh!</span>
              ) : (
                <span>
                  Add <strong className="text-[#D8232A]">{formatPrice(amountNeededForFreeShipping, currency)}</strong> more for Free Delivery
                </span>
              )}
            </span>
            <span className="text-neutral-500">{freeShippingProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-amber-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D8232A] rounded-full transition-all duration-500"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-50 text-[#D8232A] rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Your shopping bag is empty</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Explore our authentic collections of artisanal panjabis, tailored shirts, festive sarees, and accessories.
              </p>
              <button
                onClick={() => setIsCartDrawerOpen(false)}
                className="mt-6 px-6 py-2.5 bg-[#D8232A] text-white text-xs font-bold rounded-full hover:bg-[#b51c22] transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-3.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 relative"
              >
                {/* Image */}
                <img
                  src={item.selectedColor.image || item.product.images[0]}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 object-cover rounded-xl border border-neutral-200 shrink-0 bg-white"
                />

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        {item.product.brand}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-neutral-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {item.product.name}
                    </h4>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
                      <span>Size: <strong className="text-neutral-800">{item.selectedSize.size}</strong></span>
                      <span>•</span>
                      <span className="truncate max-w-[100px]">{item.selectedColor.name}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Price */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/60">
                    <div className="flex items-center border border-neutral-300 rounded-lg bg-white p-0.5">
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                        className="p-1 hover:bg-neutral-100 text-neutral-600 rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                        className="p-1 hover:bg-neutral-100 text-neutral-600 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-black text-neutral-900">
                      {formatPrice(item.product.price * item.quantity, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Promo Code & Checkout Totals */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 space-y-4">
            {/* Promo Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon "{appliedCoupon.code}" Active ({appliedCoupon.description})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-red-600 hover:underline text-[11px] cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Promo code (e.g. AKS15)"
                      className="w-full pl-8 pr-3 py-2 bg-white text-xs rounded-xl border border-neutral-300 outline-none focus:border-[#D8232A] uppercase"
                    />
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-neutral-900">{formatPrice(cartSubtotal, currency)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(cartDiscount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-bold text-neutral-900">
                  {shippingFee === 0 ? <span className="text-emerald-700">FREE</span> : formatPrice(shippingFee, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total Amount</span>
                <span className="text-base text-[#D8232A]">{formatPrice(cartTotal, currency)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 px-6 bg-[#D8232A] hover:bg-[#b51c22] text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
