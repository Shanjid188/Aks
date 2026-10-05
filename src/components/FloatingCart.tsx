import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/*
 * Compact floating cart pinned to the right edge of the storefront.
 *
 * Purely presentational — it reads the existing cart state from StoreContext and
 * opens the existing CartDrawer. No cart logic, storage or pricing lives here, so
 * adding/changing/removing items or quantities updates it automatically.
 *
 * Always visible so shoppers always have one-tap access to their cart. When the
 * cart is empty the quantity badge is simply omitted — the button stays put.
 */
export const FloatingCart: React.FC = () => {
  const { cart, cartSubtotal, currency, setIsCartDrawerOpen } = useStore();

  // Total units across every line (2 products x3 = 6), not the number of lines.
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Re-key the pop animation on the count so every add nudges the badge.
  const [popKey, setPopKey] = useState(0);
  const prevCount = useRef(totalCount);
  useEffect(() => {
    if (totalCount !== prevCount.current) {
      prevCount.current = totalCount;
      setPopKey((k) => k + 1);
    }
  }, [totalCount]);

  // Same figure the navbar bag shows (merchandise subtotal — no shipping),
  // so the two never disagree. The fade below only smooths the swap.
  const totalLabel = formatPrice(cartSubtotal, currency);
  const isEmpty = totalCount <= 0;

  const itemWord = totalCount === 1 ? 'item' : 'items';

  return (
    <AnimatePresence>
      <motion.button
        key="floating-cart"
        type="button"
        data-floating-cart=""
        onClick={() => setIsCartDrawerOpen(true)}
        aria-label={
          isEmpty
            ? 'Cart is empty'
            : `View cart, ${totalCount} ${itemWord}, total ${totalLabel}`
        }
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        // Edge-pinned and kept clear of the bottom-right toast stack, which is
        // pinned at right-24 (i.e. LEFT of this 54–66px rail) so it never covers
        // the bag. Vertical spacing is belt-and-braces anyway: the 248/300px offset
        // (literal px, immune to the ≥1280 root-size bump) clears even a
        // two-toast stack and leaves ~197–234px of air above the WhatsApp button's
        // top (drawers at z-50 slide under freely).
        // No overflow-hidden here — the count badge needs bleed room so it is
        // never clipped; corners are rounded per-section instead.
        className="group fixed bottom-[248px] right-0 z-40 flex w-[54px] cursor-pointer flex-col rounded-l-2xl border border-r-0 border-[#E5E7EB] bg-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_rgba(216,35,42,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8232A] focus-visible:ring-offset-2 motion-reduce:transform-none sm:bottom-[300px] sm:w-[66px]"
      >
        {/* Bag body — white area with a stitched handle arch + bag icon.
            Extra top padding + inset badge position keep the count fully inside. */}
        <div className="relative flex h-[52px] flex-col items-center justify-end rounded-tl-2xl pb-1 sm:h-[58px]">
          {/* Handle arch */}
          <span
            aria-hidden="true"
            className={`absolute left-1/2 top-[6px] h-[12px] w-[26px] -translate-x-1/2 rounded-t-full border-[2.5px] border-b-0 sm:top-[7px] sm:h-[13px] sm:w-[30px] ${
              isEmpty ? 'border-slate-200' : 'border-slate-400'
            }`}
          />
          <ShoppingBag
            className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 sm:h-7 sm:w-7 ${
              isEmpty ? 'text-slate-300' : 'text-slate-600'
            }`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {/* Quantity badge — inset from the edges (top-1, small ring) so nothing
              gets cut, tabular-nums + padding keep 2-3 digits tidy. Hidden
              while empty so the button reads as a clean, quiet affordance. */}
          {!isEmpty && (
            <motion.span
              key={popKey}
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.25, 1] }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D8232A] px-1 text-[10px] font-black tabular-nums leading-none text-white shadow-[0_2px_6px_rgba(216,35,42,0.45)] ring-2 ring-white sm:right-2 sm:top-1 sm:h-[18px] sm:min-w-[18px] sm:text-[11px]"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </motion.span>
          )}
        </div>

        {/* Red total bar — rounded to close the bag bottom; always filled so
            the control reads as a solid, reliable target even when empty. */}
        <motion.span
          key={totalLabel}
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex h-[26px] items-center justify-center whitespace-nowrap rounded-bl-2xl bg-gradient-to-b from-[#E0292F] to-[#C71C23] px-1 text-[10px] font-black tabular-nums leading-none tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] sm:h-[28px] sm:text-[11px]"
        >
          {totalLabel}
        </motion.span>
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingCart;