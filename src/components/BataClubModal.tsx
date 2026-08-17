import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Award,
  Gift,
  Crown,
  Sparkles,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';

export const BataClubModal: React.FC = () => {
  const { isBataClubOpen, setIsBataClubOpen, addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'benefits' | 'rewards' | 'tiers'>('benefits');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  if (!isBataClubOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsJoined(true);
    addToast({
      type: 'success',
      title: 'Welcome to AKS Privé Club!',
      message: '500 bonus welcome reward points have been credited to your mobile membership account.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsBataClubOpen(false)}
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
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                  AKS Privé Loyalty Club
                </h2>
                <span className="text-[10px] uppercase font-bold text-[#D8232A] bg-red-50 px-2 py-0.5 rounded">
                  Haute Privileges
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Earn points on artisanal bespoke apparel, unlock complimentary alterations & private runway previews
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBataClubOpen(false)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Status Banner */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
              AKS
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900">
                {isJoined ? 'Active Privé Member • Elite Gold Tier' : 'Not an AKS Privé Member Yet?'}
              </p>
              <p className="text-[11px] text-neutral-500">
                {isJoined
                  ? 'Current Balance: 750 Points (Equivalent to ৳375 Credit)'
                  : 'Enroll today with your mobile number to receive 500 Welcome Points'}
              </p>
            </div>
          </div>

          {!isJoined ? (
            <form onSubmit={handleJoin} className="flex gap-2 w-full sm:w-auto">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                required
                className="px-3 py-1.5 bg-white text-xs rounded-lg border border-neutral-200 outline-none focus:border-neutral-900 w-36"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Join Free
              </button>
            </form>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
            </span>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 px-6 pt-2">
          {[
            { id: 'benefits', label: 'Privé Benefits' },
            { id: 'rewards', label: 'Redeemable Vouchers' },
            { id: 'tiers', label: 'Membership Tiers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'benefits' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: <Zap className="w-4 h-4 text-amber-500" />,
                  title: '1 Reward Point for Every ৳10',
                  desc: 'Redeem your points directly for discounts on panjabis, formal shirts & festive sarees.',
                },
                {
                  icon: <Gift className="w-4 h-4 text-[#D8232A]" />,
                  title: 'Birthday Month Special',
                  desc: 'Enjoy an exclusive flat 20% discount coupon during your entire birthday month.',
                },
                {
                  icon: <Sparkles className="w-4 h-4 text-purple-500" />,
                  title: 'Early Eid & Festive Previews',
                  desc: 'Reserve limited-edition silk panjabis and designer sarees 48 hours before public launch.',
                },
                {
                  icon: <Award className="w-4 h-4 text-emerald-500" />,
                  title: 'Complimentary Master Tailoring',
                  desc: 'Free sleeve adjustment, fitting, and hem alterations at all AKS Flagship Boutiques.',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <h4 className="text-xs font-bold text-neutral-900">{item.title}</h4>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-3">
              {[
                { points: 200, reward: '৳150 Instant Garment Voucher', code: 'AKS150' },
                { points: 500, reward: '৳400 Festive Shopping Voucher', code: 'AKS400' },
                { points: 1000, reward: 'Complimentary Silk Pocket Square & Brooch Set', code: 'AKSGIFT' },
                { points: 2000, reward: '৳2,000 Bespoke Haute Couture Voucher', code: 'AKS2000' },
              ].map((r, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-neutral-200 flex items-center justify-between bg-white hover:border-neutral-300 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-900">{r.reward}</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Required: {r.points} AKS Privé Points</p>
                  </div>
                  <button
                    onClick={() =>
                      addToast({
                        type: 'info',
                        title: 'Reward Selected',
                        message: `Apply promo code ${r.code} in your shopping bag.`,
                      })
                    }
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Redeem
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Silver Privé', spend: '৳0 - ৳8,000', rate: '1x Points', perk: 'Seasonal launch invitations' },
                { name: 'Gold Privé', spend: '৳8,001 - ৳25,000', rate: '1.5x Points', perk: 'Free Dhaka Express Shipping + 2 Free Alterations' },
                { name: 'Platinum Sovereign', spend: '৳25,000+', rate: '2x Points', perk: 'Dedicated Personal Stylist & Private Atelier Access' },
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border space-y-2 text-center ${
                    tier.name.includes('Gold') ? 'border-[#D8232A] bg-red-50/20' : 'border-neutral-200 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-neutral-900">{tier.name}</span>
                  <p className="text-[11px] text-neutral-400">Annual Spend: {tier.spend}</p>
                  <div className="pt-2 border-t border-neutral-100 text-xs">
                    <p className="font-semibold text-neutral-800">{tier.rate}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{tier.perk}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
