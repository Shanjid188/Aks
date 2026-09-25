/**
 * Homepage / header copy — DB-driven through store settings
 * (Admin → Storefront → Homepage), with the original hardcoded copy kept as the
 * bundled defaults. Nothing renders empty and the design stays byte-identical
 * until an admin actually edits a field.
 *
 * These strings are billed as English + Bangla pairs: `SiteContent` derives a
 * `…Bn` counterpart for every field (see BanglaOf below), so a field can never
 * be added in one language only. Sections that were English-only render the
 * language the shopper picked; surfaces that already showed both languages
 * (e.g. the “Why Shop With Us” strip) keep doing so.
 */

interface SiteContentBase {
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
  /* Header navigation labels */
  headerAllDepartments: string;
  headerDivisions: string;
  headerOtherDivisions: string;
  headerCategoriesSuffix: string;
  headerShopPrefix: string;
  headerTrendingLabel: string;
  headerMobileShopBy: string;
  headerQuickTrack: string;
  headerQuickClub: string;
  headerOutfitMatcher: string;
  headerSearchPlaceholder: string;
  headerSearchPlaceholderMobile: string;
  /* Product listing / filters (the shop page a merchant most wants in their own voice) */
  listingAllProducts: string;
  /** `{name}` is the division name. */
  listingCollectionSuffix: string;
  /** `{query}` is what the shopper typed. */
  listingSearchResults: string;
  /** `{count}` is the number of matching products. */
  listingProductsCount: string;
  listingTagline: string;
  listingFilters: string;
  /** Screen-reader label for the sort dropdown. */
  listingSortAria: string;
  listingSortFeatured: string;
  listingSortBestSellers: string;
  listingSortPriceLow: string;
  listingSortPriceHigh: string;
  listingSortRating: string;
  listingSortNewest: string;
  listingActiveFilters: string;
  /** `{size}` is the chosen size (e.g. "40 (M)"). */
  listingSizeChip: string;
  listingOnSaleChip: string;
  listingRefine: string;
  listingReset: string;
  listingDepartment: string;
  listingAllDivisions: string;
  listingBrands: string;
  listingSizesFull: string;
  listingSizesShort: string;
  listingDeals: string;
  /** `{count}` is the number of products the filters found. */
  listingApply: string;
  listingClearAll: string;
  listingNoMatchTitle: string;
  listingNoMatchBody: string;
  /* “Why Shop With Us” strip (above the footer) */
  promoTagline: string;
  promoTitle: string;
  promoSubtitle: string;
  promoItem1Title: string;
  /** `{amount}` is replaced with the live free-delivery threshold. */
  promoItem1Sub: string;
  promoItem2Title: string;
  promoItem2Sub: string;
  promoItem4Title: string;
  promoItem4Sub: string;
  promoCta: string;
  /* Footer */
  footerBrand: string;
  footerDivisionsHeading: string;
  footerCareHeading: string;
  footerTrack: string;
  footerGuides: string;
  footerClub: string;
  footerContactHeading: string;
  footerContactPhoneLabel: string;
  footerNewsletterTitle: string;
  footerNewsletterNote: string;
  footerNewsletterCta: string;
  footerNewsletterPlaceholder: string;
  /** `{year}` and `{site}` are replaced automatically; `{store}` is the store name. */
  footerCopyright: string;
}

/** Bangla counterpart of every field (`featuredTitleBn`, …) — always present. */
type BanglaOf<T> = { [K in keyof T as `${K & string}Bn`]: string };

/** Storefront copy: every English field plus its Bangla counterpart. */
export type SiteContent = SiteContentBase & BanglaOf<SiteContentBase>;

/** Copy that only exists as a bilingual pair — used by the admin editor. */
export type SiteContentField = keyof SiteContentBase;

/** The bundled English copy — exactly the text that used to sit in the components. */
const DEFAULT_SITE_CONTENT_BASE: SiteContentBase = {
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

  headerAllDepartments: 'All Departments',
  headerDivisions: 'Divisions',
  headerOtherDivisions: 'Other Divisions',
  headerCategoriesSuffix: 'Categories',
  headerShopPrefix: 'Shop',
  headerTrendingLabel: 'Trending Searches',
  headerMobileShopBy: 'Shop by AKS Mart Division',
  headerQuickTrack: 'Track Order',
  headerQuickClub: 'AKS Mart Club',
  headerOutfitMatcher: 'Outfit Matcher',
  headerSearchPlaceholder: 'Search products (rice, honey, kantha, bedsheets…)',
  headerSearchPlaceholderMobile: 'Search products...',

  listingAllProducts: 'All Products',
  listingCollectionSuffix: '{name} Collection',
  listingSearchResults: 'Search results for "{query}"',
  listingProductsCount: '{count} products',
  listingTagline:
    'SHUDDHO food · AKS CRAFT handiwork · AKS HOME comfort · AKS BEAUTY care · AKS PRINT custom print — one mart, many choices.',
  listingFilters: 'Filters',
  listingSortAria: 'Sort products by',
  listingSortFeatured: 'Sort by: Featured',
  listingSortBestSellers: 'Sort by: Best Sellers',
  listingSortPriceLow: 'Price: Low to High',
  listingSortPriceHigh: 'Price: High to Low',
  listingSortRating: 'Customer Rating',
  listingSortNewest: 'New Arrivals',
  listingActiveFilters: 'Active Filters:',
  listingSizeChip: 'Size: {size}',
  listingOnSaleChip: 'On Sale',
  listingRefine: 'Refine Collection',
  listingReset: 'Reset',
  listingDepartment: 'Department',
  listingAllDivisions: 'All Divisions',
  listingBrands: 'House of Brands',
  listingSizesFull: 'Available Sizes',
  listingSizesShort: 'Sizes',
  listingDeals: 'Deals & On Sale',
  listingApply: 'Apply ({count})',
  listingClearAll: 'Clear All Filters',
  listingNoMatchTitle: 'No products matched your filters',
  listingNoMatchBody:
    'Try clearing some filter criteria, broadening your price range, or exploring another AKS Mart division.',

  promoTagline: 'Why Shop With Us',
  promoTitle: 'One Mart. Many Choices.',
  promoSubtitle:
    'Five curated divisions, one trusted destination — quality products delivered to your doorstep across Bangladesh.',
  promoItem1Title: 'Free Delivery',
  promoItem1Sub: 'On orders above {amount}',
  promoItem2Title: 'Exclusive Deals',
  promoItem2Sub: 'Member-only offers',
  promoItem4Title: 'Quality Promise',
  promoItem4Sub: 'Checked before dispatch',
  promoCta: 'Shop Now',

  footerBrand:
    "AKS Mart is Bangladesh's multi-division marketplace — SHUDDHO food, AKS CRAFT handicrafts, AKS HOME living, AKS BEAUTY personal care and AKS PRINT custom print — all under one roof at aksmartbd.com.",
  footerDivisionsHeading: 'Divisions',
  footerCareHeading: 'Customer Care',
  footerTrack: 'Track Your Order',
  footerGuides: 'Product & Fit Guides',
  footerClub: 'AKS Mart Club Rewards',
  footerContactHeading: 'Contact & Order',
  footerContactPhoneLabel: 'WhatsApp / Call',
  footerNewsletterTitle: 'Subscribe to the AKS Mart Gazette',
  footerNewsletterNote: 'Receive seasonal offers, division launches and private sale alerts.',
  footerNewsletterCta: 'Join',
  footerNewsletterPlaceholder: 'Your email address',
  footerCopyright: '© {year} {store} (Bangladesh). All rights reserved. {site}',
};

/**
 * The bundled Bangla copy. The storefront shows these on the বাংলা toggle; the
 * admin editor shows them as placeholders and can override every one of them.
 */
const DEFAULT_SITE_CONTENT_BN: BanglaOf<SiteContentBase> = {
  featuredEyebrowBn: 'আপনার জন্য বাছাই করা',
  featuredTitleBn: 'নির্বাচিত পণ্য',
  featuredSubtitleBn:
    'AKS Mart-এর সব বিভাগ থেকে বাছাই করা নিত্যপ্রয়োজনীয় পণ্য — নিশ্চিন্তে ভরসা করার মান।',
  featuredActionBn: 'সব নির্বাচিত পণ্য দেখুন',

  newArrivalsEyebrowBn: 'নতুন এসেছে',
  newArrivalsTitleBn: 'নতুন পণ্য',
  newArrivalsSubtitleBn: 'একেবারে নতুন সংযোজন — AKS Mart পরিবারে সাম্প্রতিক যোগ হওয়া পণ্য।',
  newArrivalsActionBn: 'সব নতুন পণ্য দেখুন',

  bestSellersEyebrowBn: 'সর্বাধিক পছন্দ',
  bestSellersTitleBn: 'বেস্ট সেলার',
  bestSellersSubtitleBn: 'AKS Mart ক্রেতাদের সবচেয়ে পছন্দের পণ্য।',
  bestSellersActionBn: 'সব বেস্ট সেলার দেখুন',

  divisionsEyebrowBn: 'এক মার্ট। অনেক পছন্দ।',
  divisionsTitleBn: 'অনেক জগৎ, এক মার্ট',
  divisionsSubtitleBn:
    'পাঁচটি কিউরেটেড ডিভিশন, একটি বিশ্বস্ত গন্তব্য — বাংলাদেশ জুড়ে আপনার দোরগোড়ায় মানসম্পন্ন পণ্য পৌঁছে যাবে।',
  divisionsActionBn: 'সব পণ্য দেখুন',

  offersEyebrowBn: 'আরও সাশ্রয়',
  offersTitleBn: 'চলতি অফার',
  offersSubtitleBn: 'এখনই ব্যবহারযোগ্য কুপন — কোডটি কপি করে আপনার শপিং ব্যাগে যোগ করুন।',

  showcaseEyebrowBn: 'আপনার জন্য বাছাই করা',
  showcaseTitleBn: 'ক্রেতাদের প্রিয়',
  showcaseSubtitleBn: 'আসল পণ্য, আসল রিভিউ — যেগুলো ক্রেতারা বারবার কিনতে ফিরে আসেন।',

  trust1TitleBn: '১০০% অরিজিনাল',
  trust1SubBn: 'AKS Mart সার্টিফায়েড',
  trust2TitleBn: 'দ্রুত ডেলিভারি',
  trust2SubBn: 'ঢাকায় ২৪–৪৮ ঘণ্টা',
  trust3TitleBn: 'সহজ রিটার্ন',
  trust3SubBn: '৩০ দিনের নীতি',

  headerSaleChipBn: 'উৎসব সেল ৪০% পর্যন্ত ছাড়',
  headerSaleChipShortBn: 'উৎসব সেল',

  headerAllDepartmentsBn: 'সব বিভাগ',
  headerDivisionsBn: 'বিভাগসমূহ',
  headerOtherDivisionsBn: 'অন্যান্য বিভাগ',
  headerCategoriesSuffixBn: 'ক্যাটাগরি',
  headerShopPrefixBn: 'কিনুন',
  headerTrendingLabelBn: 'জনপ্রিয় সার্চ',
  headerMobileShopByBn: 'AKS Mart বিভাগ অনুযায়ী কিনুন',
  headerQuickTrackBn: 'অর্ডার ট্র্যাক করুন',
  headerQuickClubBn: 'AKS Mart ক্লাব',
  headerOutfitMatcherBn: 'আউটফিট ম্যাচার',
  headerSearchPlaceholderBn: 'পণ্য খুঁজুন (চাল, মধু, কাঁথা, বেডশিট…)',
  headerSearchPlaceholderMobileBn: 'পণ্য খুঁজুন...',

  listingAllProductsBn: 'সব পণ্য',
  listingCollectionSuffixBn: '{name} কালেকশন',
  listingSearchResultsBn: '"{query}" এর ফলাফল',
  listingProductsCountBn: '{count} টি পণ্য',
  listingTaglineBn:
    'SHUDDHO খাদ্যপণ্য · AKS CRAFT হস্তশিল্প · AKS HOME গৃহসজ্জা · AKS BEAUTY যত্ন · AKS PRINT কাস্টম প্রিন্ট — এক মার্ট, অনেক পছন্দ।',
  listingFiltersBn: 'ফিল্টার',
  listingSortAriaBn: 'পণ্য সাজান',
  listingSortFeaturedBn: 'সাজান: নির্বাচিত',
  listingSortBestSellersBn: 'সাজান: বেস্ট সেলার',
  listingSortPriceLowBn: 'দাম: কম থেকে বেশি',
  listingSortPriceHighBn: 'দাম: বেশি থেকে কম',
  listingSortRatingBn: 'ক্রেতার রেটিং',
  listingSortNewestBn: 'নতুন পণ্য',
  listingActiveFiltersBn: 'সক্রিয় ফিল্টার:',
  listingSizeChipBn: 'সাইজ: {size}',
  listingOnSaleChipBn: 'ছাড়ে',
  listingRefineBn: 'ফিল্টার করুন',
  listingResetBn: 'রিসেট',
  listingDepartmentBn: 'বিভাগ',
  listingAllDivisionsBn: 'সব বিভাগ',
  listingBrandsBn: 'ব্র্যান্ড',
  listingSizesFullBn: 'সাইজ',
  listingSizesShortBn: 'সাইজ',
  listingDealsBn: 'অফার ও ছাড়',
  listingApplyBn: 'দেখুন ({count})',
  listingClearAllBn: 'সব ফিল্টার মুছুন',
  listingNoMatchTitleBn: 'আপনার ফিল্টারে কোনো পণ্য মেলেনি',
  listingNoMatchBodyBn:
    'কিছু ফিল্টার মুছে দেখুন, দামের সীমা বাড়িয়ে দেখুন, অথবা AKS Mart-এর অন্য বিভাগ ঘুরে দেখুন।',

  promoTaglineBn: 'কেন আমাদের থেকে কিনবেন',
  promoTitleBn: 'এক মার্ট। অনেক পছন্দ।',
  promoSubtitleBn:
    'পাঁচটি কিউরেটেড ডিভিশন, একটি বিশ্বস্ত গন্তব্য — বাংলাদেশ জুড়ে আপনার দোরগোড়ায় মানসম্পন্ন পণ্য পৌঁছে যাবে।',
  promoItem1TitleBn: 'ফ্রি ডেলিভারি',
  promoItem1SubBn: '{amount} এর উপরে অর্ডারে',
  promoItem2TitleBn: 'এক্সক্লুসিভ ডিল',
  promoItem2SubBn: 'শুধুমাত্র সদস্যদের অফার',
  promoItem4TitleBn: 'কোয়ালিটি প্রমিস',
  promoItem4SubBn: 'ডিসপ্যাচের আগে যাচাই',
  promoCtaBn: 'এখনই কিনুন',

  footerBrandBn:
    'AKS Mart বাংলাদেশের বহুমুখী মার্কেটপ্লেস — SHUDDHO খাদ্যপণ্য, AKS CRAFT হস্তশিল্প, AKS HOME গৃহসজ্জা, AKS BEAUTY ব্যক্তিগত যত্ন এবং AKS PRINT কাস্টম প্রিন্ট — সবই এক ছাদের নিচে, aksmartbd.com-এ।',
  footerDivisionsHeadingBn: 'বিভাগসমূহ',
  footerCareHeadingBn: 'কাস্টমার কেয়ার',
  footerTrackBn: 'আপনার অর্ডার ট্র্যাক করুন',
  footerGuidesBn: 'পণ্য ও সাইজ গাইড',
  footerClubBn: 'AKS Mart ক্লাব রিওয়ার্ড',
  footerContactHeadingBn: 'যোগাযোগ ও অর্ডার',
  footerContactPhoneLabelBn: 'হোয়াটসঅ্যাপ / কল',
  footerNewsletterTitleBn: 'AKS Mart Gazette-এ সাবস্ক্রাইব করুন',
  footerNewsletterNoteBn: 'মৌসুমি অফার, নতুন বিভাগের খবর ও প্রাইভেট সেলের তথ্য পেতে সাবস্ক্রাইব করুন।',
  footerNewsletterCtaBn: 'যোগ দিন',
  footerNewsletterPlaceholderBn: 'আপনার ইমেইল ঠিকানা',
  footerCopyrightBn: '© {year} {store} (বাংলাদেশ)। সর্বস্বত্ব সংরক্ষিত। {site}',
};

/** English + Bangla merged — what the storefront renders with. */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  ...DEFAULT_SITE_CONTENT_BASE,
  ...DEFAULT_SITE_CONTENT_BN,
};

/** Store-setting key for every English field (namespaced `content.*`). */
const SITE_CONTENT_BASE_KEYS: Record<keyof SiteContentBase, string> = {
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

  headerAllDepartments: 'content.header.allDepartments',
  headerDivisions: 'content.header.divisions',
  headerOtherDivisions: 'content.header.otherDivisions',
  headerCategoriesSuffix: 'content.header.categoriesSuffix',
  headerShopPrefix: 'content.header.shopPrefix',
  headerTrendingLabel: 'content.header.trendingLabel',
  headerMobileShopBy: 'content.header.mobileShopBy',
  headerQuickTrack: 'content.header.quickTrack',
  headerQuickClub: 'content.header.quickClub',
  headerOutfitMatcher: 'content.header.outfitMatcher',
  headerSearchPlaceholder: 'content.header.searchPlaceholder',
  headerSearchPlaceholderMobile: 'content.header.searchPlaceholderMobile',

  listingAllProducts: 'content.listing.allProducts',
  listingCollectionSuffix: 'content.listing.collectionSuffix',
  listingSearchResults: 'content.listing.searchResults',
  listingProductsCount: 'content.listing.productsCount',
  listingTagline: 'content.listing.tagline',
  listingFilters: 'content.listing.filters',
  listingSortAria: 'content.listing.sortAria',
  listingSortFeatured: 'content.listing.sortFeatured',
  listingSortBestSellers: 'content.listing.sortBestSellers',
  listingSortPriceLow: 'content.listing.sortPriceLow',
  listingSortPriceHigh: 'content.listing.sortPriceHigh',
  listingSortRating: 'content.listing.sortRating',
  listingSortNewest: 'content.listing.sortNewest',
  listingActiveFilters: 'content.listing.activeFilters',
  listingSizeChip: 'content.listing.sizeChip',
  listingOnSaleChip: 'content.listing.onSaleChip',
  listingRefine: 'content.listing.refine',
  listingReset: 'content.listing.reset',
  listingDepartment: 'content.listing.department',
  listingAllDivisions: 'content.listing.allDivisions',
  listingBrands: 'content.listing.brands',
  listingSizesFull: 'content.listing.sizesFull',
  listingSizesShort: 'content.listing.sizesShort',
  listingDeals: 'content.listing.deals',
  listingApply: 'content.listing.apply',
  listingClearAll: 'content.listing.clearAll',
  listingNoMatchTitle: 'content.listing.noMatchTitle',
  listingNoMatchBody: 'content.listing.noMatchBody',

  promoTagline: 'content.promoBar.tagline',
  promoTitle: 'content.promoBar.title',
  promoSubtitle: 'content.promoBar.subtitle',
  promoItem1Title: 'content.promoBar.item1Title',
  promoItem1Sub: 'content.promoBar.item1Sub',
  promoItem2Title: 'content.promoBar.item2Title',
  promoItem2Sub: 'content.promoBar.item2Sub',
  promoItem4Title: 'content.promoBar.item4Title',
  promoItem4Sub: 'content.promoBar.item4Sub',
  promoCta: 'content.promoBar.cta',

  footerBrand: 'content.footer.brand',
  footerDivisionsHeading: 'content.footer.divisionsHeading',
  footerCareHeading: 'content.footer.careHeading',
  footerTrack: 'content.footer.track',
  footerGuides: 'content.footer.guides',
  footerClub: 'content.footer.club',
  footerContactHeading: 'content.footer.contactHeading',
  footerContactPhoneLabel: 'content.footer.contactPhoneLabel',
  footerNewsletterTitle: 'content.footer.newsletterTitle',
  footerNewsletterNote: 'content.footer.newsletterNote',
  footerNewsletterCta: 'content.footer.newsletterCta',
  footerNewsletterPlaceholder: 'content.footer.newsletterPlaceholder',
  footerCopyright: 'content.footer.copyright',
};

/**
 * Store-setting key for every content field — the English key plus its Bangla
 * counterpart (`…title` → `…title.bn`), derived so the two can never drift.
 */
export const SITE_CONTENT_KEYS: Record<keyof SiteContent, string> = (() => {
  const keys = {} as Record<keyof SiteContent, string>;
  for (const [field, key] of Object.entries(SITE_CONTENT_BASE_KEYS) as [keyof SiteContentBase, string][]) {
    keys[field] = key;
    keys[`${field}Bn` as keyof SiteContent] = `${key}.bn`;
  }
  return keys;
})();

/** Trending search keywords (header search panel) — comma-separated in settings. */
export const TRENDING_SEARCHES_KEY = 'content.header.trendingSearches';

/** Every content setting key (both languages, plus the trending list). */
export const CONTENT_SETTING_KEYS: string[] = [
  ...Object.values(SITE_CONTENT_KEYS),
  TRENDING_SEARCHES_KEY,
];

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

/* ── Site-wide SEO defaults (Admin → Settings → SEO) ───────────────────────── */

/** Store name (Admin → Settings → Store identity) — used in page titles. */
export const STORE_NAME_KEY = 'storeName';
export const DEFAULT_STORE_NAME = 'AKS Mart';

export interface SiteSeo {
  /** Browser/search title. Individual pages append their own name to it. */
  title: string;
  description: string;
  /** Absolute URL or /path used for og:image. */
  image: string;
  favicon: string;
}

export const DEFAULT_SITE_SEO: SiteSeo = {
  title: 'AKS Mart — Food, Craft, Home, Beauty & Print in Bangladesh',
  description:
    "AKS Mart is Bangladesh's multi-division marketplace — SHUDDHO food, AKS CRAFT handicrafts, AKS HOME living, AKS BEAUTY personal care and AKS PRINT custom printing, delivered nationwide.",
  image: '/AKS.logo.jpg',
  favicon: '/AKS.logo.jpg',
};

export const SEO_SETTING_KEYS: Record<keyof SiteSeo, string> = {
  title: 'seoTitle',
  description: 'seoDescription',
  image: 'ogImage',
  favicon: 'favicon',
};

/** Merge SEO settings over the bundled defaults (empty values are ignored). */
export const siteSeoFromSettings = (raw: Record<string, unknown>): SiteSeo => {
  const out: SiteSeo = { ...DEFAULT_SITE_SEO };
  for (const field of Object.keys(SEO_SETTING_KEYS) as (keyof SiteSeo)[]) {
    const value = raw[SEO_SETTING_KEYS[field]];
    if (typeof value === 'string' && value.trim() !== '') out[field] = value;
  }
  return out;
};
