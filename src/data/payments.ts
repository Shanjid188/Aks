/**
 * Footer "Pay with" brand strip.
 *
 * Every badge is self-drawn (no external CDN assets — project convention), so
 * the row stays crisp at any size and works offline:
 *   - mobile wallets / gateways → coloured pill with a white wordmark
 *   - card schemes              → white pill with the brand wordmark / mark
 *
 * The *live* checkout methods (Admin → Settings) are rendered after this list
 * by `Footer.tsx`, so Cash on Delivery / bank transfer show up automatically
 * with the store's own labels and colours.
 *
 * To add, remove or reorder a brand just edit this array — one line each.
 * `size` is only a wordmark tweak: 'xs' | 'sm' (default) | 'md'.
 */
export type PayBrandMark = 'none' | 'mastercard' | 'card';

export interface PayBrand {
  id: string;
  /** Wordmark text — payment brand names stay in English in both locales. */
  label: string;
  /** Wordmark colour (white when the pill itself is coloured). */
  color: string;
  /** Pill background; omitted ⇒ white pill. */
  bg?: string;
  /** Small glyph drawn before the wordmark. */
  mark?: PayBrandMark;
  /** Wordmarks such as VISA / AMEX / NEXUS render italic and a touch larger. */
  italic?: boolean;
  /** Wordmark size tweak. */
  size?: 'xs' | 'sm' | 'md';
}

export const PAYMENT_BRANDS: PayBrand[] = [
  // Mobile wallets
  { id: 'bkash', label: 'bKash', color: '#FFFFFF', bg: '#E2136E', size: 'md' },
  { id: 'nagad', label: 'Nagad', color: '#FFFFFF', bg: '#F58220', size: 'md' },
  { id: 'rocket', label: 'Rocket', color: '#FFFFFF', bg: '#8C3494', size: 'md' },
  { id: 'upay', label: 'upay', color: '#FFFFFF', bg: '#E4002B', size: 'md' },

  // Card schemes
  { id: 'visa', label: 'VISA', color: '#1A1F71', italic: true, size: 'md' },
  { id: 'mastercard', label: 'mastercard', color: '#3F3F46', mark: 'mastercard', size: 'xs' },
  { id: 'amex', label: 'AMEX', color: '#FFFFFF', bg: '#006FCF', italic: true, size: 'md' },
  { id: 'nexus', label: 'NEXUS', color: '#007B5F', italic: true, size: 'md' },

  // Bank cards
  { id: 'citybank', label: 'City Bank', color: '#003DA5', size: 'sm' },
  { id: 'bankcard', label: 'Bank Card', color: '#3F3F46', mark: 'card', size: 'sm' },
];
