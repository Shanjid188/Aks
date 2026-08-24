import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { Order } from '../types';
import Logo from './Logo';
import {
  X,
  CheckCircle2,
  Truck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  User,
  MapPin,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/** Bangladeshi mobile numbers: starts 01, second digit 3-9, then 8 more digits. */
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const PHONE_ERROR_MESSAGE = 'Please enter a valid Bangladeshi mobile number.';
/** Neutral delivery wording — we never promise a timeframe we can't guarantee. */
const ESTIMATED_DELIVERY_NOTE = 'Delivery time will be confirmed after your order is placed.';

/** Delivery zones (owner-configurable fees). */
const DELIVERY_ZONES = [
  { id: 'inside_dhaka', en: 'Inside Dhaka', bn: 'ঢাকার ভিতরে', fee: 120 },
  { id: 'sub_dhaka', en: 'Sub-Dhaka Area', bn: 'ঢাকার আশপাশে', fee: 150 },
  { id: 'outside_dhaka', en: 'Outside Dhaka', bn: 'ঢাকার বাইরে', fee: 200 },
] as const;

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartSubtotal,
    freeShippingThreshold,
    cartDiscount,
    shippingFee,
    cartTotal,
    appliedCoupon,
    currency,
    createOrder,
    setIsOrderTrackerOpen,
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Address form — starts completely empty; we never pre-fill customer identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('');
  const [thana, setThana] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Delivery method — three zones (Inside Dhaka / Sub-Dhaka / Outside Dhaka)
  const [deliveryMethod, setDeliveryMethod] = useState<
    'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka'
  >('inside_dhaka');

  // Payment method — Cash on Delivery is the only live method right now
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'card' | 'cod'>('cod');

  // Completed Order Record
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Inline validation & submission feedback
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Delivery-zone math — totals are computed here so the charged amount always
  // matches what the customer sees on this screen.
  const isFreeShip =
    cart.length > 0 &&
    (appliedCoupon?.code === 'FREESHIP' || cartSubtotal >= freeShippingThreshold);
  const activeZone = DELIVERY_ZONES.find((z) => z.id === deliveryMethod) ?? DELIVERY_ZONES[0];
  const zoneShipping = isFreeShip ? 0 : activeZone.fee;
  const orderTotal = Math.max(0, cartSubtotal - cartDiscount + zoneShipping);

      if (!isCheckoutOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Real validation (not just HTML `required`) for the customer phone number.
    if (!BD_PHONE_REGEX.test(phone.trim())) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      return;
    }
    setPhoneError(null);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

    const handlePlaceOrder = async () => {
    // Guard: never submit an empty order.
    if (cart.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }
    // Defense-in-depth: re-validate phone at submission time.
    if (!BD_PHONE_REGEX.test(phone.trim())) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      setStep(1);
      return;
    }
    // Guard: ignore accidental double-clicks while an order is already being placed.
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setOrderError(null);
    try {
      const newOrder = await createOrder({
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
        paymentMethod,
        subtotal: cartSubtotal,
        discount: cartDiscount,
        shippingFee: zoneShipping,
        couponApplied: appliedCoupon || undefined,
        total: orderTotal,
        estimatedDelivery: ESTIMATED_DELIVERY_NOTE,
      });

      setCompletedOrder(newOrder);
      setStep(4);
    } catch {
      // Honest failure: keep the modal open, keep the cart, let the user retry.
      setOrderError("We couldn't place your order right now. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
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
            <Logo className="h-7 w-7 rounded-sm shrink-0" />
            <span className="font-bold text-sm tracking-tight text-neutral-100">
              {step === 4 ? 'Order Confirmation' : 'Checkout'}
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
          {/* Empty-cart guard: never allow checkout without items */}
          {step !== 4 && cart.length === 0 && (
            <div className="py-14 text-center space-y-3">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">Your cart is empty.</h3>
              <p className="text-xs text-neutral-500">Add products to your cart before checking out.</p>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="mt-2 py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          )}

          {/* STEP 1: Shipping Address */}
          {step === 1 && cart.length > 0 && (
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
                      placeholder="আপনার পূর্ণ নাম / Your full name"
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
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="01XXXXXXXXX"
                      className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl outline-none focus:border-[#D8232A] ${
                        phoneError ? 'border-red-400 bg-red-50/40' : 'border-neutral-300'
                      }`}
                    />
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1">{phoneError}</p>
                  )}
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
                    placeholder="example@email.com"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
          {step === 2 && cart.length > 0 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">
                Select Your Delivery Preference
              </h3>

              <div className="space-y-3">
                {DELIVERY_ZONES.map((zone) => {
                  const active = deliveryMethod === zone.id;
                  const eff = isFreeShip ? 0 : zone.fee;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setDeliveryMethod(zone.id)}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-start justify-between text-left cursor-pointer ${
                        active
                          ? 'border-[#D8232A] bg-red-50/40 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            active ? 'border-[#D8232A]' : 'border-neutral-300'
                          }`}
                        >
                          {active && <span className="w-2 h-2 rounded-full bg-[#D8232A]" />}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-neutral-900 flex items-center gap-2">
                            <span>{zone.en}</span>
                            <span className="text-[11px] font-semibold text-neutral-500">{zone.bn}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Home delivery — timing confirmed after you place your order.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-neutral-900">
                        {eff === 0 ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black text-[10px]">
                            FREE
                          </span>
                        ) : (
                          formatPrice(eff, currency)
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isFreeShip && (
                <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  🎉 FREE delivery unlocked on this order!
                </p>
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
          {step === 3 && cart.length > 0 && (
            <div className="space-y-5">
              <h3 className="font-black text-lg text-neutral-900 tracking-tight">
                Payment Method
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'cod', label: 'Cash on Delivery', color: '#18181B', tag: 'Recommended', available: true },
                  { id: 'bkash', label: 'bKash', color: '#D12053', tag: 'Coming Soon', available: false },
                  { id: 'nagad', label: 'Nagad', color: '#F7941D', tag: 'Coming Soon', available: false },
                  { id: 'card', label: 'Cards / Visa', color: '#1E3A8A', tag: 'Coming Soon', available: false },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => {
                      if (pm.available) setPaymentMethod(pm.id as any);
                    }}
                    disabled={!pm.available}
                    title={pm.available ? undefined : 'Online payment coming soon'}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      !pm.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
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
                    <span className={`text-[10px] ${pm.available ? 'text-emerald-600 font-bold' : 'text-neutral-400'}`}>
                      {pm.tag}
                    </span>
                  </button>
                ))}
              </div>

              {/* COD explanation */}
              {paymentMethod === 'cod' && (
                <p className="text-[11px] text-neutral-500 flex items-start gap-1.5 -mt-1">
                  <Truck className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>Pay when your order is delivered. Online payment options are coming soon.</span>
                </p>
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
                    {zoneShipping === 0 ? (
                      <span className="text-emerald-700">FREE</span>
                    ) : (
                      formatPrice(zoneShipping, currency)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Grand Total to Pay</span>
                  <span className="text-base text-[#D8232A]">{formatPrice(orderTotal, currency)}</span>
                </div>
              </div>

              {/* Honest failure message — order was NOT placed */}
              {orderError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-3">
                  {orderError}
                </div>
              )}

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
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
                  disabled={isPlacingOrder || cart.length === 0}
                  className="w-full sm:w-auto justify-center py-4 px-8 bg-[#D8232A] hover:bg-[#b51c22] text-white text-sm font-black rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isPlacingOrder ? 'Placing Order…' : `Confirm & Place Order (${formatPrice(cartTotal, currency)})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Order Confirmation Receipt */}
          {step === 4 && completedOrder && (
            <div className="text-center py-4 space-y-6 print-area">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Thank You for Your Order!
                </h3>
                <p className="text-base font-bold text-neutral-700 -mt-3">
                  আপনার অর্ডারের জন্য ধন্যবাদ!
                </p>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  We've received your order. Our team will contact you to confirm the delivery details.
                  <span className="block mt-1">
                    আপনার অর্ডার পেয়েছি — ডেলিভারি নিশ্চিত করতে আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।
                  </span>
                </p>
              </div>

              {/* Invoice — international standard layout */}
              <div className="bg-white rounded-xl border border-neutral-300 text-left">
                {/* Seller + Invoice meta */}
                <div className="flex flex-wrap justify-between gap-4 p-5 pb-4 border-b border-neutral-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Logo className="h-9 w-9 rounded-md" />
                      <p className="font-black text-lg text-neutral-900 tracking-tight">AKS Mart</p>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1.5">{AKS_MART.address}</p>
                    <p className="text-[11px] text-neutral-500">
                      www.{AKS_MART.site} · {AKS_MART.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black uppercase tracking-widest text-[#D8232A]">Invoice</p>
                    <p className="font-mono text-sm font-bold text-neutral-900 mt-1">
                      {completedOrder.trackingCode}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Date: {formatInvoiceDate(completedOrder.createdAt)}
                    </p>
                    <p className="text-[11px] font-semibold text-neutral-700 capitalize">
                      Payment: {completedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : completedOrder.paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Bill To / Deliver To */}
                <div className="grid sm:grid-cols-2 gap-4 px-5 py-4 text-xs border-b border-neutral-100">
                  <div>
                    <p className="font-black uppercase tracking-wider text-neutral-400 text-[10px] mb-1">Billed To</p>
                    <p className="font-bold text-neutral-900">{completedOrder.shippingAddress.fullName}</p>
                    <p className="text-neutral-600">{completedOrder.shippingAddress.phone}</p>
                    {completedOrder.shippingAddress.email && (
                      <p className="text-neutral-500">{completedOrder.shippingAddress.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-wider text-neutral-400 text-[10px] mb-1">Deliver To</p>
                    <p className="text-neutral-600 leading-relaxed">
                      {completedOrder.shippingAddress.streetAddress}, {completedOrder.shippingAddress.thana},{' '}
                      {completedOrder.shippingAddress.district}, {completedOrder.shippingAddress.division}
                      {completedOrder.shippingAddress.postalCode ? ` - ${completedOrder.shippingAddress.postalCode}` : ''}
                    </p>
                  </div>
                </div>

                {/* Items table */}
                <div className="px-5 py-4 overflow-x-auto">
                  <table className="w-full text-xs min-w-[430px]">
                    <thead>
                      <tr className="border-b border-neutral-300 uppercase tracking-wider text-[10px] text-neutral-500">
                        <th className="py-2 pr-2 font-bold text-left">#</th>
                        <th className="py-2 pr-2 font-bold text-left">Item</th>
                        <th className="py-2 pr-2 font-bold text-left">Size</th>
                        <th className="py-2 pr-2 font-bold text-center">Qty</th>
                        <th className="py-2 pr-2 font-bold text-right">Unit Price</th>
                        <th className="py-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {completedOrder.items.map((it, idx) => (
                        <tr key={it.cartItemId}>
                          <td className="py-2 pr-2 text-neutral-500">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <span className="font-semibold text-neutral-900">{it.product.name}</span>
                            {PRODUCT_BN[it.product.slug] && (
                              <span className="block text-[10px] text-neutral-400">{PRODUCT_BN[it.product.slug]}</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-neutral-600">{it.selectedSize.size}</td>
                          <td className="py-2 pr-2 text-center text-neutral-600">{it.quantity}</td>
                          <td className="py-2 pr-2 text-right text-neutral-600">
                            {formatPrice(it.product.price, currency)}
                          </td>
                          <td className="py-2 text-right font-bold text-neutral-900">
                            {formatPrice(it.product.price * it.quantity, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 no-print">
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setIsOrderTrackerOpen(true);
                  }}
                  className="py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Track Your Order
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
