/**
 * Homepage / header copy — DB-driven through store settings
 * (Admin → Storefront → Homepage), with the original hardcoded copy kept as the
 * bundled defaults. Nothing renders empty and the design stays byte-identical
 * until an admin actually edits a field.
 *
 * These strings are English-only in the UI today, so one field maps to one
 * setting. Bilingual surfaces (e.g. the “Why Shop With Us” strip, which uses
 * <Bi/>) are handled in a later pass.
 */

export interface SiteContent {
  /* Featured products */
  featuredEyebrow: string;
  featuredTitle: string;
  featuredSubtitle: string;
  featuredAction: string;
  /* New arrivals */
  newArrivalsEyebrow: string;
  newArrivalsTitle: string;
  newArrivalsSubtitle: string;
  newArrivalsAction: string;
  /* Best sellers */
  bestSellersEyebrow: string;
  bestSellersTitle: string;
  bestSellersSubtitle: string;
  bestSellersAction: string;
  /* Division showcase grid */
  divisionsEyebrow: string;
  divisionsTitle: string;
  divisionsSubtitle: string;
  divisionsAction: string;
  /* Active offers */
  offersEyebrow: string;
  offersTitle: string;
  offersSubtitle: string;
  /* Circle showcase */
  showcaseEyebrow: string;
  showcaseTitle: string;
  showcaseSubtitle: string;
  /* Trust strip under the circle showcase */
  trust1Title: string;
  trust1Sub: string;
  trust2Title: string;
  trust2Sub: string;
  trust3Title: string;
  trust3Sub: string;
  /* Header */
  headerSaleChip: string;
  headerSaleChipShort: string;
}

/** The bundled defaults — exactly the copy that used to live in the components. */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  featuredEyebrow: 'Curated For You',
  featuredTitle: 'Featured Products',
  featuredSubtitle: 'Handpicked essentials across all AKS Mart divisions — quality you can trust.',
  featuredAction: 'View All Featured',

  newArrivalsEyebrow: 'Just Landed',
  newArrivalsTitle: 'New Arrivals',
  newArrivalsSubtitle: 'Fresh picks and latest additions to the AKS Mart family.',
  newArrivalsAction: 'View All New',

  bestSellersEyebrow: 'Top Picks',
  bestSellersTitle: 'Best Sellers',
  bestSellersSubtitle: 'Most-loved products chosen by the AKS Mart community.',
  bestSellersAction: 'View All Best Sellers',

  divisionsEyebrow: 'One Mart. Many Choices.',
  divisionsTitle: 'Many Worlds, One Mart',
  divisionsSubtitle:
    'Pure food, handiwork, home comfort, beauty care and custom print — five curated divisions, one trusted destination.',
  divisionsAction: 'Browse all products',

  offersEyebrow: 'Save More',
  offersTitle: 'Active Offers',
  offersSubtitle: 'Real coupons you can use right now — copy a code and apply it in your shopping bag.',

  showcaseEyebrow: 'Handpicked for you',
  showcaseTitle: 'Loved by our customers',
  showcaseSubtitle: 'Real products, real reviews — the favourites our shoppers keep coming back for.',

  trust1Title: '100% Authentic',
  trust1Sub: 'AKS Mart Certified',
  trust2Title: 'Express Delivery',
  trust2Sub: '24–48h in Dhaka',
  trust3Title: 'Easy Returns',
  trust3Sub: '30-Day Policy',

  headerSaleChip: 'Festive Sale Up to 40%',
  headerSaleChipShort: 'Festive Sale',
};

/** Store-setting key for every content field (namespaced `content.*`). */
export const SITE_CONTENT_KEYS: Record<keyof SiteContent, string> = {
  featuredEyebrow: 'content.featured.eyebrow',
  featuredTitle: 'content.featured.title',
  featuredSubtitle: 'content.featured.subtitle',
  featuredAction: 'content.featured.action',

  newArrivalsEyebrow: 'content.newArrivals.eyebrow',
  newArrivalsTitle: 'content.newArrivals.title',
  newArrivalsSubtitle: 'content.newArrivals.subtitle',
  newArrivalsAction: 'content.newArrivals.action',

  bestSellersEyebrow: 'content.bestSellers.eyebrow',
  bestSellersTitle: 'content.bestSellers.title',
  bestSellersSubtitle: 'content.bestSellers.subtitle',
  bestSellersAction: 'content.bestSellers.action',

  divisionsEyebrow: 'content.divisions.eyebrow',
  divisionsTitle: 'content.divisions.title',
  divisionsSubtitle: 'content.divisions.subtitle',
  divisionsAction: 'content.divisions.action',

  offersEyebrow: 'content.offers.eyebrow',
  offersTitle: 'content.offers.title',
  offersSubtitle: 'content.offers.subtitle',

  showcaseEyebrow: 'content.showcase.eyebrow',
  showcaseTitle: 'content.showcase.title',
  showcaseSubtitle: 'content.showcase.subtitle',

  trust1Title: 'content.trust.item1Title',
  trust1Sub: 'content.trust.item1Sub',
  trust2Title: 'content.trust.item2Title',
  trust2Sub: 'content.trust.item2Sub',
  trust3Title: 'content.trust.item3Title',
  trust3Sub: 'content.trust.item3Sub',

  headerSaleChip: 'content.header.saleChip',
  headerSaleChipShort: 'content.header.saleChipShort',
};

/** Trending search keywords (header search panel) — comma-separated in settings. */
export const TRENDING_SEARCHES_KEY = 'content.header.trendingSearches';

export const DEFAULT_TRENDING_SEARCHES: string[] = [
  'Miniket Rice',
  'Mustard Oil',
  'Nakshi Kantha',
  'Jute Bag',
  'Bedsheet',
  'Face Wash',
  'Business Cards',
  'Custom Mug',
];

/** Merge a raw settings map over the bundled defaults (empty values are ignored). */
export const siteContentFromSettings = (raw: Record<string, unknown>): SiteContent => {
  const out: SiteContent = { ...DEFAULT_SITE_CONTENT };
  for (const field of Object.keys(SITE_CONTENT_KEYS) as (keyof SiteContent)[]) {
    const value = raw[SITE_CONTENT_KEYS[field]];
    if (typeof value === 'string' && value.trim() !== '') out[field] = value;
  }
  return out;
};

/** Comma-separated keyword setting → trimmed list (falls back to the bundled set). */
export const trendingSearchesFromSettings = (raw: Record<string, unknown>): string[] => {
  const value = raw[TRENDING_SEARCHES_KEY];
  if (typeof value !== 'string') return DEFAULT_TRENDING_SEARCHES;
  const list = value
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_TRENDING_SEARCHES;
};
