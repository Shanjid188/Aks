import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { STORE_LOCATIONS } from '../data/stores';
import { Order } from '../types';
import {
  X,
  CheckCircle2,
  Truck,
  CreditCard,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  User,
  MapPin,
  Sparkles,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartSubtotal,
    cartDiscount,
    shippingFee,
    cartTotal,
    appliedCoupon,
    currency,
    createOrder,
    setIsOrderTrackerOpen,
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Address form
  const [fullName, setFullName] = useState('Tanvir Ahmed');
  const [phone, setPhone] = useState('01712345678');
  const [email, setEmail] = useState('tanvir.ahmed@example.com');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [thana, setThana] = useState('Gulshan');
  const [streetAddress, setStreetAddress] = useState('House 24, Road 11, Block D');
  const [postalCode, setPostalCode] = useState('1212');
  const [deliveryInstructions, setDeliveryInstructions] = useState('Please call before delivery.');

  // Delivery method
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'pickup'>('standard');
  const [pickupStore, setPickupStore] = useState(STORE_LOCATIONS[0].name);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'card' | 'cod'>('bkash');
  const [bkashNumber, setBkashNumber] = useState('01712345678');
  const [bkashOtp, setBkashOtp] = useState('');
  const [bkashPin, setBkashPin] = useState('');
  const [bkashStep, setBkashStep] = useState<'number' | 'otp' | 'pin'>('number');

  // Completed Order Record
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isCheckoutOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handlePlaceOrder = () => {
    const newOrder = createOrder({
      items: cart,
      shippingAddress: {
        fullName,
        phone,
        email,
        division,
        district,
        thana,
        streetAddress,
        postalCode,
        deliveryInstructions,
      },
      deliveryMethod,
      pickupStore: deliveryMethod === 'pickup' ? pickupStore : undefined,
      paymentMethod,
      subtotal: cartSubtotal,
      discount: cartDiscount,
      shippingFee: deliveryMethod === 'pickup' ? 0 : shippingFee,
      couponApplied: appliedCoupon || undefined,
      total: cartTotal,
      estimatedDelivery: '3 - 4 Business Days',
    });

    setCompletedOrder(newOrder);
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (step !== 4) setIsCheckoutOpen(false);
        }}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
      />

      {/* Main Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-xl italic text-[#D8232A] bg-white px-2 py-0.5 rounded-sm">
              AKS
            </span>
            <span className="font-bold text-sm tracking-tight text-neutral-100">
              {step === 4 ? 'Order Confirmation' : 'Secure Express Checkout'}
            </span>
          </div>

          {step !== 4 && (
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Indicator (Steps 1-3) */}
        {step !== 4 && (
          <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-600">
            <div
              className={`flex items-center gap-1.5 ${
                step >= 1 ? 'text-[#D8232A]' : 'text-neutral-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Address</span>
            </div>
            <span className="w-8 h-px bg-neutral-300" />
            <div
              className={`flex items-center gap-1.5 ${
                step >= 2 ? 'text-[#D8232A]' : 'text-neutral-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Shipping</span>
            </div>
            <span className="w-8 h-px bg-neutral-300" />
            <div
              className={`flex items-center gap-1.5 ${
                step >= 3 ? 'text-[#D8232A]' : 'text-neutral-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Payment</span>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {/* STEP 1: Shipping Address */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">
                Where should we deliver your order?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Full Recipient Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
                    />
                    <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
                    />
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address (For Order Updates) *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Division</label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full py-2 px-2 text-xs border border-neutral-300 rounded-xl outline-none"
                  >
                    {['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'].map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full py-2 px-2 text-xs border border-neutral-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Thana / Area</label>
                  <input
                    type="text"
                    required
                    value={thana}
                    onChange={(e) => setThana(e.target.value)}
                    className="w-full py-2 px-2 text-xs border border-neutral-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Street Address & Flat / Holding No. *
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. House 42, Road 11, Flat 4B"
                  className="w-full py-2 px-3 text-xs border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="py-3.5 px-6 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Shipping Method</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Delivery Speed & Pickup */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">
                Select Your Delivery Preference
              </h3>

              <div className="space-y-3">
                {/* Standard */}
                <label
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
                    deliveryMethod === 'standard'
                      ? 'border-[#D8232A] bg-red-50/40 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryMethod === 'standard'}
                      onChange={() => setDeliveryMethod('standard')}
                      className="mt-1 text-[#D8232A] focus:ring-[#D8232A]"
                    />
                    <div>
                      <div className="font-bold text-xs text-neutral-900 flex items-center gap-2">
                        <span>Standard Home Delivery Across Bangladesh</span>
                        {shippingFee === 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded font-black">
                            FREE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Delivered in 2-3 days in Dhaka, 3-5 days nationwide via AKS Express Fleet.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-neutral-900">
                    {shippingFee === 0 ? '৳0' : formatPrice(120, currency)}
                  </span>
                </label>

                {/* Express Dhaka */}
                <label
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
                    deliveryMethod === 'express'
                      ? 'border-[#D8232A] bg-red-50/40 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryMethod === 'express'}
                      onChange={() => setDeliveryMethod('express')}
                      className="mt-1 text-[#D8232A] focus:ring-[#D8232A]"
                    />
                    <div>
                      <div className="font-bold text-xs text-neutral-900 flex items-center gap-2">
                        <span>Dhaka City Super-Express (24 Hours)</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.2 rounded font-black">
                          FASTEST
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Guaranteed next-day priority dispatch from Tongi Central Hub.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-neutral-900">
                    {formatPrice(180, currency)}
                  </span>
                </label>

                {/* Store Pickup Click & Collect */}
                <label
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
                    deliveryMethod === 'pickup'
                      ? 'border-[#D8232A] bg-red-50/40 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryMethod === 'pickup'}
                      onChange={() => setDeliveryMethod('pickup')}
                      className="mt-1 text-[#D8232A] focus:ring-[#D8232A]"
                    />
                    <div>
                      <div className="font-bold text-xs text-neutral-900 flex items-center gap-2">
                        <span>Free Click & Collect at AKS Boutique</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded font-black">
                          FREE
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Try on garments in-store and collect at your convenience with free bespoke alteration.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700">FREE</span>
                </label>
              </div>

              {/* Pickup store selection */}
              {deliveryMethod === 'pickup' && (
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    Select Pickup Store:
                  </label>
                  <select
                    value={pickupStore}
                    onChange={(e) => setPickupStore(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    {STORE_LOCATIONS.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name} ({st.area}, {st.division})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Back to Address
                </button>
                <button
                  type="submit"
                  className="py-3.5 px-6 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Payment */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">
                Select Secure Payment Method
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'bkash', label: 'bKash', color: '#D12053', tag: 'Fast & Instant' },
                  { id: 'nagad', label: 'Nagad', color: '#F7941D', tag: 'Mobile Wallet' },
                  { id: 'card', label: 'Cards / Visa', color: '#1E3A8A', tag: 'SSLCommerz' },
                  { id: 'cod', label: 'Cash on Delivery', color: '#18181B', tag: 'Pay on Hand' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === pm.id
                        ? 'border-[#D8232A] bg-red-50/50 shadow-xs ring-2 ring-[#D8232A]/20'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg text-white font-black text-[10px] flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: pm.color }}
                    >
                      {pm.label.substring(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{pm.label}</span>
                    <span className="text-[10px] text-neutral-400">{pm.tag}</span>
                  </button>
                ))}
              </div>

              {/* bKash Interactive Panel */}
              {paymentMethod === 'bkash' && (
                <div className="bg-[#D12053]/5 border border-[#D12053]/20 p-4 sm:p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#D12053]">
                      bKash Payment Gateway
                    </span>
                    <span className="text-xs font-bold text-neutral-800">
                      Amount: {formatPrice(cartTotal, currency)}
                    </span>
                  </div>

                  {bkashStep === 'number' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-neutral-700">
                        Your bKash Account Number:
                      </label>
                      <input
                        type="text"
                        value={bkashNumber}
                        onChange={(e) => setBkashNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl bg-white outline-none focus:border-[#D12053]"
                      />
                      <button
                        type="button"
                        onClick={() => setBkashStep('otp')}
                        className="w-full py-2.5 bg-[#D12053] text-white text-xs font-bold rounded-xl"
                      >
                        Send Verification Code (OTP)
                      </button>
                    </div>
                  )}

                  {bkashStep === 'otp' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-neutral-700">
                        Enter 6-digit OTP sent to {bkashNumber}:
                      </label>
                      <input
                        type="text"
                        value={bkashOtp}
                        onChange={(e) => setBkashOtp(e.target.value)}
                        placeholder="1 2 3 4 5 6"
                        className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl bg-white outline-none text-center font-mono text-base tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setBkashStep('pin')}
                        className="w-full py-2.5 bg-[#D12053] text-white text-xs font-bold rounded-xl"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}

                  {bkashStep === 'pin' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-neutral-700">
                        Enter bKash PIN:
                      </label>
                      <input
                        type="password"
                        value={bkashPin}
                        onChange={(e) => setBkashPin(e.target.value)}
                        placeholder="• • • • •"
                        className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl bg-white outline-none text-center text-lg"
                      />
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>256-bit encrypted bKash secure sandbox</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Summary Recap */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="font-bold text-neutral-900">{formatPrice(cartSubtotal, currency)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount</span>
                    <span>-{formatPrice(cartDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-bold text-neutral-900">
                    {deliveryMethod === 'pickup' ? 'FREE' : shippingFee === 0 ? 'FREE' : formatPrice(shippingFee, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Grand Total to Pay</span>
                  <span className="text-base text-[#D8232A]">{formatPrice(cartTotal, currency)}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="py-4 px-8 bg-[#D8232A] hover:bg-[#b51c22] text-white text-sm font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Place Order ({formatPrice(cartTotal, currency)})</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Order Confirmation Receipt */}
          {step === 4 && completedOrder && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Thank You for Your Order!
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  We've received your order and are preparing your bespoke garments at AKS Atelier & Central Warehouse.
                </p>
              </div>

              {/* Order Reference Box */}
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 text-left space-y-3">
                <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Tracking Reference
                    </span>
                    <p className="font-mono font-black text-sm text-[#D8232A]">
                      {completedOrder.trackingCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Payment Mode
                    </span>
                    <p className="font-bold text-xs uppercase text-neutral-800">
                      {completedOrder.paymentMethod} • Paid {formatPrice(completedOrder.total, currency)}
                    </p>
                  </div>
                </div>

                {/* Items Ordered */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Ordered Garments ({completedOrder.items.length} Items)
                  </span>
                  <div className="divide-y divide-neutral-100">
                    {completedOrder.items.map((it) => (
                      <div key={it.cartItemId} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="text-neutral-800 font-semibold truncate max-w-xs">
                          {it.product.name} ({it.selectedSize.size}) x{it.quantity}
                        </span>
                        <span className="font-bold text-neutral-900">
                          {formatPrice(it.product.price * it.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping info */}
                <div className="border-t border-neutral-200 pt-3 text-xs text-neutral-600">
                  <p className="font-bold text-neutral-900">
                    Delivery To: {completedOrder.shippingAddress.fullName} ({completedOrder.shippingAddress.phone})
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {completedOrder.shippingAddress.streetAddress}, {completedOrder.shippingAddress.thana},{' '}
                    {completedOrder.shippingAddress.district}, {completedOrder.shippingAddress.division}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setIsOrderTrackerOpen(true);
                  }}
                  className="py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Track Live Order Status
                </button>

                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="py-3 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="py-3 px-6 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
