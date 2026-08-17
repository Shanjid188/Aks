import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';

export const OrderTrackerModal: React.FC = () => {
  const { isOrderTrackerOpen, setIsOrderTrackerOpen, orders, currency } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOrderTrackerOpen) return null;

  // Selected or latest order
  const foundOrder = orders.find(
    (o) =>
      o.trackingCode.toLowerCase() === searchQuery.trim().toLowerCase() ||
      o.id.toLowerCase() === searchQuery.trim().toLowerCase() ||
      o.shippingAddress.phone.includes(searchQuery.trim())
  ) || orders[0];

  const orderStages = [
    { label: 'Order Confirmed', date: 'Yesterday, 4:30 PM', completed: true },
    { label: 'Artisanal Finishing & Packed at AKS Atelier', date: 'Today, 9:15 AM', completed: true },
    { label: 'Handed to AKS Express Logistics', date: 'Today, 2:40 PM', completed: true },
    { label: 'Out for Delivery (Dhaka Hub)', date: 'Expected Tomorrow', completed: false, active: true },
    { label: 'Delivered & Signed', date: 'Pending', completed: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOrderTrackerOpen(false)}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                Live Order & Parcel Tracker
              </h2>
              <p className="text-xs text-neutral-500">
                Track your AKS online garment shipment across Bangladesh in real-time
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOrderTrackerOpen(false)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-200">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter your Tracking Code (e.g. AKS-BD-8932) or Mobile Number..."
              className="w-full pl-9 pr-4 py-2.5 bg-white text-xs rounded-xl border border-neutral-200 outline-none focus:border-neutral-900 transition-colors"
            />
          </div>
        </div>

        {/* Tracking Details */}
        <div className="p-6 overflow-y-auto space-y-6">
          {foundOrder ? (
            <div className="space-y-6">
              {/* Order summary card */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Tracking Number
                  </span>
                  <p className="font-mono font-bold text-sm text-[#D8232A]">
                    {foundOrder.trackingCode}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Estimated Delivery
                  </span>
                  <p className="font-bold text-xs text-neutral-900">
                    {foundOrder.estimatedDelivery}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Order Total
                  </span>
                  <p className="font-bold text-xs text-neutral-900">
                    {formatPrice(foundOrder.total, currency)} ({foundOrder.paymentMethod.toUpperCase()})
                  </p>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Shipment Progress Timeline
                </h4>

                <div className="relative pl-6 space-y-5 border-l-2 border-neutral-200">
                  {orderStages.map((stage, idx) => (
                    <div key={idx} className="relative">
                      {/* Step node indicator */}
                      <span
                        className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          stage.completed
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : stage.active
                            ? 'border-[#D8232A] bg-white ring-4 ring-red-100'
                            : 'border-neutral-300'
                        }`}
                      >
                        {stage.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </span>

                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            stage.completed || stage.active
                              ? 'text-neutral-900'
                              : 'text-neutral-400'
                          }`}
                        >
                          {stage.label}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{stage.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900">Delivery Destination:</span>
                    <p className="text-neutral-600 mt-0.5">
                      {foundOrder.shippingAddress.fullName} • {foundOrder.shippingAddress.streetAddress},{' '}
                      {foundOrder.shippingAddress.thana}, {foundOrder.shippingAddress.district}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 text-neutral-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact: {foundOrder.shippingAddress.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-neutral-400">
              No orders found matching the tracking details provided.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
