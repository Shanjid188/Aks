import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { navigate } from '../lib/router';
import {
  Banknote,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';

/** Bangladeshi mobile numbers: starts 01, second digit 3-9, then 8 more digits. */
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const PHONE_ERROR_MESSAGE =
  'Please enter a valid Bangladeshi mobile number — সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01712345678)।';

/** Delivery zones — same fees as the backend order flow. */
const DELIVERY_ZONES = [
  { id: 'inside_dhaka', en: 'Inside Dhaka', bn: 'ঢাকার ভিতরে', fee: 120 },
  { id: 'sub_dhaka', en: 'Sub-Dhaka Area', bn: 'ঢাকার আশপাশে', fee: 150 },
  { id: 'outside_dhaka', en: 'Outside Dhaka', bn: 'ঢাকার বাইরে', fee: 200 },
] as const;

type ZoneId = (typeof DELIVERY_ZONES)[number]['id'];

const inputClass =
  'w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A] transition-colors';
const labelClass = 'block text-xs font-bold text-neutral-700 mb-1.5';

export function CheckoutPage() {
  const {
    cart,
    cartSubtotal,
    freeShippingThreshold,
    cartDiscount,
    appliedCoupon,
    currency,
    createOrder,
  } = useStore();

  // Address form — starts empty; never pre-fill customer identity.
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('');
  const [thana, setThana] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<ZoneId>('inside_dhaka');

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Delivery-zone math — totals computed here so the charged amount always
  // matches what the customer sees on this screen.
  const isFreeShip =
    cart.length > 0 &&
    (appliedCoupon?.code === 'FREESHIP' || cartSubtotal >= freeShippingThreshold);
  const activeZone = DELIVERY_ZONES.find((z) => z.id === deliveryMethod) ?? DELIVERY_ZONES[0];
  const zoneShipping = isFreeShip ? 0 : activeZone.fee;
  const orderTotal = Math.max(0, cartSubtotal - cartDiscount + zoneShipping);

  // Empty-cart guard — never allow checkout without items.
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center">
          <Truck className="w-7 h-7 text-neutral-400" />
        </div>
        <h1 className="mt-5 text-xl font-black text-neutral-900 tracking-tight">Your cart is empty</h1>
        <p className="mt-1.5 text-sm text-neutral-500">Add products to your cart before checking out.</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-6 py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    // Real validation (not just HTML `required`) for the customer phone number.
    if (!BD_PHONE_REGEX.test(phone.trim())) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Guard: ignore accidental double-clicks while an order is being placed.
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
        paymentMethod: 'cod',
        subtotal: cartSubtotal,
        discount: cartDiscount,
        shippingFee: zoneShipping,
        couponApplied: appliedCoupon || undefined,
        total: orderTotal,
        estimatedDelivery: 'Delivery time will be confirmed after your order is placed.',
      });
      navigate(`/order-success/${newOrder.id}`);
    } catch {
      // Honest failure: keep the page, keep the cart, let the customer retry.
      setOrderError("We couldn't place your order right now. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsPlacingOrder(false);
    }
  };
  /* __CHECKOUT_FORM__ */
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Delivery address ঠিকানা — please double-check before placing your order.
      </p>

      {orderError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {orderError}
        </div>
      )}

      <form id="checkout-form" onSubmit={handlePlaceOrder} className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left: delivery info + area + payment ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Delivery Information */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D8232A]" /> Delivery Information
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-name" className={labelClass}>Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="co-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="co-phone" className={labelClass}>Mobile Number মোবাইল নম্বর</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="co-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(null); }}
                    placeholder="01XXXXXXXXX"
                    className={`${inputClass} ${phoneError ? 'border-red-400 bg-red-50/40' : ''}`}
                  />
                </div>
                {phoneError && <p className="mt-1.5 text-[11px] font-semibold text-red-600">{phoneError}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-email" className={labelClass}>Email (for order updates)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="co-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className={inputClass} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-street" className={labelClass}>Street Address ঠিকানা</label>
                <input id="co-street" type="text" required value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="House / Road / Landmark" className={`${inputClass} pl-3.5`} />
              </div>
              <div>
                <label htmlFor="co-division" className={labelClass}>Division</label>
                <select id="co-division" value={division} onChange={(e) => setDivision(e.target.value)} className="w-full py-2.5 px-3 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A] bg-white">
                  {['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="co-district" className={labelClass}>District</label>
                <input id="co-district" type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} className={`${inputClass} pl-3.5`} />
              </div>
              <div>
                <label htmlFor="co-thana" className={labelClass}>Thana / Area এলাকা</label>
                <input id="co-thana" type="text" required value={thana} onChange={(e) => setThana(e.target.value)} className={`${inputClass} pl-3.5`} />
              </div>
              <div>
                <label htmlFor="co-postal" className={labelClass}>Postal Code (optional)</label>
                <input id="co-postal" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={`${inputClass} pl-3.5`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-note" className={labelClass}>Delivery Instructions (optional)</label>
                <textarea
                  id="co-note"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  placeholder="e.g. Call before delivery"
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A] resize-none"
                />
              </div>
            </div>
          </section>
          {/* __CHECKOUT_AREA_PAYMENT__ */}
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-[#D8232A]" /> Delivery Area & Payment
            </h2>

            {/* Delivery zones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {DELIVERY_ZONES.map((zone) => {
                const selected = deliveryMethod === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setDeliveryMethod(zone.id)}
                    className={`text-left rounded-xl border-2 p-3 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#D8232A] bg-red-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-900">{zone.en}</span>
                      {selected && <span className="w-2 h-2 rounded-full bg-[#D8232A]" />}
                    </div>
                    <span className="text-[11px] text-neutral-500">{zone.bn}</span>
                    <p className="text-sm font-black text-[#D8232A] mt-1">
                      {isFreeShip ? 'Free' : `BDT ${zone.fee}`}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Payment method — only what's actually supported */}
            <div className="rounded-xl border-2 border-[#D8232A] bg-red-50/40 p-3 flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-[#D8232A] flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#D8232A]" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold text-neutral-900">Cash on Delivery</p>
                <p className="text-[11px] text-neutral-500">ক্যাশ অন ডেলিভারি — pay when your order arrives</p>
              </div>
              <Banknote className="w-4 h-4 text-[#D8232A]" />
            </div>
          </section>

        </div>
        {/* __CHECKOUT_SUMMARY__ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 lg:sticky lg:top-20">
            <h2 className="text-sm font-black text-neutral-900 mb-4">Order Summary</h2>

            {/* Line items */}
            <ul className="divide-y divide-neutral-100 mb-4">
              {cart.map((item) => (
                <li key={item.cartItemId} className="py-2.5 flex items-start gap-3">
                  <img
                    src={item.product.images[0] || item.selectedColor.image}
                    alt={item.product.name}
                    className="w-12 h-14 rounded-lg object-cover bg-neutral-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{item.product.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      {item.selectedColor?.name ?? 'Default'}
                      {item.selectedSize?.size ? ` · ${item.selectedSize.size}` : ''} · ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 shrink-0">
                    {formatPrice(item.product.price * item.quantity, currency)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <dl className="space-y-2 text-xs border-t border-neutral-100 pt-3">
              <div className="flex justify-between text-neutral-600">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-neutral-900">{formatPrice(cartSubtotal, currency)}</dd>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd className="font-semibold">−{formatPrice(cartDiscount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <dt>Delivery ({activeZone.en})</dt>
                <dd className="font-semibold text-neutral-900">
                  {zoneShipping === 0 ? <span className="text-emerald-600 font-bold">Free</span> : formatPrice(zoneShipping, currency)}
                </dd>
              </div>
              <div className="border-t border-neutral-100 pt-2 flex justify-between">
                <dt className="font-black text-neutral-900">Total</dt>
                <dd className="text-base font-black text-[#D8232A]">{formatPrice(orderTotal, currency)}</dd>
              </div>
            </dl>

            {/* Place Order */}
            <button
              type="submit"
              form="checkout-form"
              disabled={isPlacingOrder || !!phoneError}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D8232A] text-white text-xs font-black rounded-full hover:bg-[#b51c22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Placing Order…
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Place Order
                </>
              )}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
              <ShieldCheck className="w-3 h-3" /> Secure checkout · Cash on Delivery
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
