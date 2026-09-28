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
  /* Product page (product detail) */
  pdpBackToProducts: string;
  /** `{sku}` is the product code. */
  pdpSkuPrefix: string;
  pdpNewArrivalBadge: string;
  pdpQuantity: string;
  pdpAddToBag: string;
  pdpBuyNow: string;
  pdpWishlistTitle: string;
  /** `{count}` pieces left in `{size}`. */
  pdpLowStock: string;
  pdpPairsBadge: string;
  pdpPairsTitle: string;
  pdpWriteReview: string;
  /** `{count}` customer ratings behind the score. */
  pdpRatingBasedOn: string;
  /** The word after the count: "1 written review" / "3 written reviews". */
  pdpWrittenReviewOne: string;
  pdpWrittenReviewMany: string;
  pdpRatingBreakdown: string;
  pdpNoReviews: string;
  pdpCareHeading: string;
  pdpCareDefault: string;
  pdpDeliveryHeading: string;
  pdpDeliveryBody: string;
  pdpReturnsHeading: string;
  pdpReturnsBody: string;
  /* Cart (drawer + cart page) */
  cartBagTitle: string;
  cartPageTitle: string;
  cartEmptyTitle: string;
  cartEmptyHint: string;
  cartContinue: string;
  cartFreeDeliveryUnlocked: string;
  /** `{amount}` is what is still missing for free delivery. */
  cartFreeDeliveryRemaining: string;
  cartPromoPlaceholder: string;
  cartCouponPlaceholder: string;
  cartRemoveItem: string;
  cartSubtotal: string;
  cartCouponDiscount: string;
  cartEstimatedShipping: string;
  cartShippingFree: string;
  cartTotalAmount: string;
  cartProceedToCheckout: string;
  cartOrderSummary: string;
  cartDiscountShort: string;
  cartDeliveryShort: string;
  cartTotalShort: string;
  cartDeliveryFreeWord: string;
  /** `{amount}` is the live free-delivery threshold. */
  cartFreeDeliveryNote: string;
  /** `{size}` is the chosen size. */
  cartSizeBadge: string;
  cartDecreaseQty: string;
  cartIncreaseQty: string;
  cartApplyCoupon: string;
  cartRemoveCoupon: string;
  /** `{code}` and `{description}` of the applied coupon. */
  cartCouponActive: string;
  /** Item count words on the cart page: "1 item" / "3 items". */
  cartItemOne: string;
  cartItemMany: string;
  /* Checkout */
  checkoutEmptyHint: string;
  checkoutDeliveryHeading: string;
  checkoutAreaPaymentHeading: string;
  checkoutFullName: string;
  checkoutNamePlaceholder: string;
  checkoutStreetPlaceholder: string;
  checkoutEmailLabel: string;
  checkoutDivision: string;
  checkoutDistrict: string;
  checkoutPostal: string;
  checkoutNote: string;
  checkoutNotePlaceholder: string;
  checkoutPlaceOrder: string;
  checkoutPlacingOrder: string;
  /* Order status vocabulary — shared by the confirmation and tracking pages */
  orderStatusPending: string;
  orderStatusConfirmed: string;
  orderStatusProcessing: string;
  orderStatusShipped: string;
  orderStatusOutForDelivery: string;
  orderStatusDelivered: string;
  orderStatusCancelled: string;
  orderStatusReturned: string;
  orderStatusRefunded: string;
  /* Order labels + receipt rows (confirmation + tracking pages) */
  orderIdLabel: string;
  orderTrackingLabel: string;
  orderStatusLabel: string;
  orderDeliveryAddress: string;
  orderDeliveryCharge: string;
  /** `{count}` is the line quantity: “Qty 3”. */
  orderItemQty: string;
  /* Order confirmation page (/order-success/:id) */
  orderSuccessLoading: string;
  orderSuccessNotFoundTitle: string;
  orderSuccessNotFoundBody: string;
  orderSuccessCancelledTitle: string;
  orderSuccessTitle: string;
  orderSuccessThanks: string;
  orderSuccessPaymentLabel: string;
  orderSuccessCodNote: string;
  /** `{code}` is the order’s tracking code (kept bold on the page). */
  orderSuccessNextNote: string;
  orderSuccessTrackCta: string;
  /* Order tracking page (/track-order) */
  trackOrderTitle: string;
  trackOrderSubtitle: string;
  trackOrderInputPlaceholder: string;
  trackOrderInputAria: string;
  trackOrderSearch: string;
  trackOrderNotFound: string;
  trackOrderIdleHint: string;
  trackOrderCloseAria: string;
  trackOrderReturnedNotice: string;
  trackOrderRefundedNotice: string;
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

  pdpBackToProducts: 'Back to Products',
  pdpSkuPrefix: 'SKU {sku}',
  pdpNewArrivalBadge: 'New Arrival',
  pdpQuantity: 'Quantity:',
  pdpAddToBag: 'Add to Shopping Bag',
  pdpBuyNow: 'Buy Now (Cash on Delivery)',
  pdpWishlistTitle: 'Save to Wishlist',
  pdpLowStock: '⚡ Only {count} pieces left in size {size}!',
  pdpPairsBadge: 'PAIRS WELL WITH',
  pdpPairsTitle: 'Complete your order',
  pdpWriteReview: 'Write a Review',
  pdpRatingBasedOn: 'Based on {count} customer ratings',
  pdpWrittenReviewOne: 'review',
  pdpWrittenReviewMany: 'reviews',
  pdpRatingBreakdown: 'Rating breakdown',
  pdpNoReviews: 'No customer reviews yet for this product. Be the first to share your thoughts!',
  pdpCareHeading: 'Care & Storage',
  pdpCareDefault:
    'Keep dry goods airtight and store in a cool, dry place away from direct sunlight. Wipe crafted & jute items with a dry cloth only.',
  pdpDeliveryHeading: 'Delivery Information',
  pdpDeliveryBody:
    'Express delivery within 24-48 hours inside Dhaka, 2-4 days nationwide. Cash on Delivery available all over Bangladesh.',
  pdpReturnsHeading: 'Easy Returns',
  pdpReturnsBody:
    'Free returns within 30 days of delivery. If anything is not right, we cover the return shipping — shop happy.',

  cartBagTitle: 'Shopping Bag',
  cartPageTitle: 'Cart',
  cartEmptyTitle: 'Your cart is empty',
  cartEmptyHint: "Find something you'll love.",
  cartContinue: 'Continue Shopping',
  cartFreeDeliveryUnlocked: 'You have unlocked FREE Delivery across Bangladesh!',
  cartFreeDeliveryRemaining: 'Add {amount} more for Free Delivery',
  cartPromoPlaceholder: 'Promo code (e.g. AKS15)',
  cartCouponPlaceholder: 'Coupon code',
  cartRemoveItem: 'Remove item',
  cartSubtotal: 'Subtotal',
  cartCouponDiscount: 'Coupon Discount',
  cartEstimatedShipping: 'Estimated Shipping',
  cartShippingFree: 'FREE',
  cartTotalAmount: 'Total Amount',
  cartProceedToCheckout: 'Proceed to Checkout',
  cartOrderSummary: 'Order Summary',
  cartDiscountShort: 'Discount',
  cartDeliveryShort: 'Delivery',
  cartTotalShort: 'Total',
  cartDeliveryFreeWord: 'Free',
  cartFreeDeliveryNote: 'Free delivery on orders over {amount}',
  cartSizeBadge: 'Size {size}',
  cartDecreaseQty: 'Decrease quantity',
  cartIncreaseQty: 'Increase quantity',
  cartApplyCoupon: 'Apply',
  cartRemoveCoupon: 'Remove',
  cartCouponActive: 'Coupon "{code}" Active ({description})',
  cartItemOne: 'item',
  cartItemMany: 'items',

  checkoutEmptyHint: 'Add products to your cart before checking out.',
  checkoutDeliveryHeading: 'Delivery Information',
  checkoutAreaPaymentHeading: 'Delivery Area & Payment',
  checkoutFullName: 'Full Name',
  checkoutNamePlaceholder: 'Your full name',
  checkoutStreetPlaceholder: 'House / Road / Landmark',
  checkoutEmailLabel: 'Email (for order updates)',
  checkoutDivision: 'Division',
  checkoutDistrict: 'District',
  checkoutPostal: 'Postal Code (optional)',
  checkoutNote: 'Delivery Instructions (optional)',
  checkoutNotePlaceholder: 'e.g. Call before delivery',
  checkoutPlaceOrder: 'Place Order',
  checkoutPlacingOrder: 'Placing Order…',

  /* Order vocabulary — shared by the confirmation + tracking pages */
  orderStatusPending: 'Order Placed',
  orderStatusConfirmed: 'Confirmed',
  orderStatusProcessing: 'Packing',
  orderStatusShipped: 'Shipped',
  orderStatusOutForDelivery: 'Out for Delivery',
  orderStatusDelivered: 'Delivered',
  orderStatusCancelled: 'Cancelled',
  orderStatusReturned: 'Returned',
  orderStatusRefunded: 'Refunded',

  orderIdLabel: 'Order ID',
  orderTrackingLabel: 'Tracking Code',
  orderStatusLabel: 'Status',
  orderDeliveryAddress: 'Delivery Address',
  orderDeliveryCharge: 'Delivery Charge',
  orderItemQty: 'Qty {count}',

  orderSuccessLoading: 'Loading your order…',
  orderSuccessNotFoundTitle: "We couldn't find this order",
  orderSuccessNotFoundBody:
    'The order may have been placed in a different browser. If you have your tracking code (starts with AKS-BD-), you can look it up here.',
  orderSuccessCancelledTitle: 'This order was cancelled',
  orderSuccessTitle: 'Your order has been placed successfully!',
  orderSuccessThanks: 'Thank you for shopping with AKS Mart.',
  orderSuccessPaymentLabel: 'Payment',
  orderSuccessCodNote: 'Cash on Delivery — pay when your order arrives.',
  orderSuccessNextNote:
    "What's next? We'll prepare your order for delivery. Keep your tracking code {code} handy to check its status anytime.",
  orderSuccessTrackCta: 'Track Your Order',

  trackOrderTitle: 'Track Your Order',
  trackOrderSubtitle: 'Enter your order ID or tracking code (e.g. AKS-BD-123456) to see the status.',
  trackOrderInputPlaceholder: 'Order ID or AKS-BD-XXXXXX',
  trackOrderInputAria: 'Order ID or tracking code',
  trackOrderSearch: 'Search',
  trackOrderNotFound: 'No order found with that ID or tracking code. Please check and try again.',
  trackOrderIdleHint: 'Enter an order ID above to track it.',
  trackOrderCloseAria: 'Close order details',
  trackOrderReturnedNotice:
    'This order has been returned to us. Our team will process it shortly — contact support for any questions.',
  trackOrderRefundedNotice:
    'This order has been refunded. The amount will be credited through your original payment method.',

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

  pdpBackToProductsBn: 'পণ্যের তালিকায় ফিরুন',
  pdpSkuPrefixBn: 'এসকেইউ {sku}',
  pdpNewArrivalBadgeBn: 'নতুন',
  pdpQuantityBn: 'পরিমাণ:',
  pdpAddToBagBn: 'ব্যাগে যোগ করুন',
  pdpBuyNowBn: 'এখনই কিনুন (ক্যাশ অন ডেলিভারি)',
  pdpWishlistTitleBn: 'পছন্দের তালিকায় রাখুন',
  pdpLowStockBn: '⚡ সাইজ {size}-এ মাত্র {count} পিস বাকি!',
  pdpPairsBadgeBn: 'সাথে ভালো মানায়',
  pdpPairsTitleBn: 'অর্ডার সম্পূর্ণ করুন',
  pdpWriteReviewBn: 'রিভিউ লিখুন',
  pdpRatingBasedOnBn: '{count} জন ক্রেতার রেটিংয়ের ভিত্তিতে',
  pdpWrittenReviewOneBn: 'টি রিভিউ',
  pdpWrittenReviewManyBn: 'টি রিভিউ',
  pdpRatingBreakdownBn: 'রেটিং বিশ্লেষণ',
  pdpNoReviewsBn: 'এই পণ্যে এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি আপনিই দিন!',
  pdpCareHeadingBn: 'যত্ন ও সংরক্ষণ',
  pdpCareDefaultBn:
    'শুকনো খাদ্যপণ্য বায়ুরোধী পাত্রে রেখে ঠান্ডা, শুকনো ও রোদ থেকে দূরে সংরক্ষণ করুন। হস্তশিল্প ও পাটজাত পণ্য শুকনো কাপড়ে মুছুন।',
  pdpDeliveryHeadingBn: 'ডেলিভারি তথ্য',
  pdpDeliveryBodyBn:
    'ঢাকার ভিতরে ২৪-৪৮ ঘণ্টায় এক্সপ্রেস ডেলিভারি, সারা দেশে ২-৪ দিন। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা আছে।',
  pdpReturnsHeadingBn: 'সহজ রিটার্ন',
  pdpReturnsBodyBn:
    'ডেলিভারির ৩০ দিনের মধ্যে বিনামূল্যে রিটার্ন। কোনো সমস্যা থাকলে রিটার্ন খরচও আমাদের — নিশ্চিন্তে কিনুন।',

  cartBagTitleBn: 'শপিং ব্যাগ',
  cartPageTitleBn: 'কার্ট',
  cartEmptyTitleBn: 'আপনার কার্ট খালি',
  cartEmptyHintBn: 'আপনার পছন্দের কিছু খুঁজে নিন।',
  cartContinueBn: 'কেনাকাটা চালিয়ে যান',
  cartFreeDeliveryUnlockedBn: 'সারা বাংলাদেশে ফ্রি ডেলিভারি আনলক হয়েছে!',
  cartFreeDeliveryRemainingBn: 'ফ্রি ডেলিভারির জন্য আরও {amount} যোগ করুন',
  cartPromoPlaceholderBn: 'প্রোমো কোড (যেমন AKS15)',
  cartCouponPlaceholderBn: 'কুপন কোড',
  cartRemoveItemBn: 'পণ্য সরান',
  cartSubtotalBn: 'সাবটোটাল',
  cartCouponDiscountBn: 'কুপন ছাড়',
  cartEstimatedShippingBn: 'আনুমানিক ডেলিভারি খরচ',
  cartShippingFreeBn: 'ফ্রি',
  cartTotalAmountBn: 'সর্বমোট',
  cartProceedToCheckoutBn: 'চেকআউটে যান',
  cartOrderSummaryBn: 'অর্ডার সারসংক্ষেপ',
  cartDiscountShortBn: 'ছাড়',
  cartDeliveryShortBn: 'ডেলিভারি',
  cartTotalShortBn: 'সর্বমোট',
  cartDeliveryFreeWordBn: 'ফ্রি',
  cartFreeDeliveryNoteBn: '{amount} এর বেশি অর্ডারে ফ্রি ডেলিভারি',
  cartSizeBadgeBn: 'সাইজ {size}',
  cartDecreaseQtyBn: 'পরিমাণ কমান',
  cartIncreaseQtyBn: 'পরিমাণ বাড়ান',
  cartApplyCouponBn: 'প্রয়োগ করুন',
  cartRemoveCouponBn: 'সরিয়ে ফেলুন',
  cartCouponActiveBn: 'কুপন "{code}" সক্রিয় ({description})',
  cartItemOneBn: 'টি পণ্য',
  cartItemManyBn: 'টি পণ্য',

  checkoutEmptyHintBn: 'চেকআউট করার আগে কার্টে পণ্য যোগ করুন।',
  checkoutDeliveryHeadingBn: 'ডেলিভারি তথ্য',
  checkoutAreaPaymentHeadingBn: 'ডেলিভারি এলাকা ও পেমেন্ট',
  checkoutFullNameBn: 'পুরো নাম',
  checkoutNamePlaceholderBn: 'আপনার পুরো নাম',
  checkoutStreetPlaceholderBn: 'বাড়ি / রোড / ল্যান্ডমার্ক',
  checkoutEmailLabelBn: 'ইমেইল (অর্ডার আপডেটের জন্য)',
  checkoutDivisionBn: 'বিভাগ',
  checkoutDistrictBn: 'জেলা',
  checkoutPostalBn: 'পোস্ট কোড (ঐচ্ছিক)',
  checkoutNoteBn: 'ডেলিভারি নির্দেশনা (ঐচ্ছিক)',
  checkoutNotePlaceholderBn: 'যেমন: ডেলিভারির আগে কল করুন',
  checkoutPlaceOrderBn: 'অর্ডার নিশ্চিত করুন',
  checkoutPlacingOrderBn: 'অর্ডার করা হচ্ছে…',

  orderStatusPendingBn: 'অর্ডার করা হয়েছে',
  orderStatusConfirmedBn: 'নিশ্চিত হয়েছে',
  orderStatusProcessingBn: 'প্যাকিং চলছে',
  orderStatusShippedBn: 'পাঠানো হয়েছে',
  orderStatusOutForDeliveryBn: 'ডেলিভারির জন্য বের হয়েছে',
  orderStatusDeliveredBn: 'ডেলিভারি সম্পন্ন',
  orderStatusCancelledBn: 'বাতিল হয়েছে',
  orderStatusReturnedBn: 'ফেরত এসেছে',
  orderStatusRefundedBn: 'টাকা ফেরত হয়েছে',

  orderIdLabelBn: 'অর্ডার আইডি',
  orderTrackingLabelBn: 'ট্র্যাকিং কোড',
  orderStatusLabelBn: 'স্ট্যাটাস',
  orderDeliveryAddressBn: 'ডেলিভারি ঠিকানা',
  orderDeliveryChargeBn: 'ডেলিভারি চার্জ',
  orderItemQtyBn: 'পরিমাণ {count}',

  orderSuccessLoadingBn: 'আপনার অর্ডার লোড হচ্ছে…',
  orderSuccessNotFoundTitleBn: 'এই অর্ডারটি খুঁজে পাওয়া যায়নি',
  orderSuccessNotFoundBodyBn:
    'অর্ডারটি অন্য ব্রাউজারে দেওয়া হয়ে থাকতে পারে। আপনার ট্র্যাকিং কোড (AKS-BD- দিয়ে শুরু) থাকলে এখানেই খুঁজে দেখতে পারেন।',
  orderSuccessCancelledTitleBn: 'এই অর্ডারটি বাতিল করা হয়েছে',
  orderSuccessTitleBn: 'আপনার অর্ডার সফলভাবে সম্পন্ন হয়েছে!',
  orderSuccessThanksBn: 'AKS Mart থেকে কেনাকাটার জন্য ধন্যবাদ।',
  orderSuccessPaymentLabelBn: 'পেমেন্ট',
  orderSuccessCodNoteBn: 'ক্যাশ অন ডেলিভারি — অর্ডার পৌঁছালে টাকা পরিশোধ করুন।',
  orderSuccessNextNoteBn:
    'এরপর কী? আমরা আপনার অর্ডার ডেলিভারির জন্য প্রস্তুত করব। যেকোনো সময় স্ট্যাটাস দেখতে ট্র্যাকিং কোড {code} হাতের কাছে রাখুন।',
  orderSuccessTrackCtaBn: 'আপনার অর্ডার ট্র্যাক করুন',

  trackOrderTitleBn: 'আপনার অর্ডার ট্র্যাক করুন',
  trackOrderSubtitleBn:
    'স্ট্যাটাস দেখতে আপনার অর্ডার আইডি বা ট্র্যাকিং কোড (যেমন AKS-BD-123456) লিখুন।',
  trackOrderInputPlaceholderBn: 'অর্ডার আইডি বা AKS-BD-XXXXXX',
  trackOrderInputAriaBn: 'অর্ডার আইডি বা ট্র্যাকিং কোড',
  trackOrderSearchBn: 'খুঁজুন',
  trackOrderNotFoundBn:
    'এই আইডি বা ট্র্যাকিং কোডে কোনো অর্ডার পাওয়া যায়নি। আবার যাচাই করে চেষ্টা করুন।',
  trackOrderIdleHintBn: 'ট্র্যাক করতে উপরে আপনার অর্ডার আইডি লিখুন।',
  trackOrderCloseAriaBn: 'অর্ডারের বিস্তারিত বন্ধ করুন',
  trackOrderReturnedNoticeBn:
    'এই অর্ডারটি আমাদের কাছে ফেরত এসেছে। আমাদের টিম শীঘ্রই এটি প্রসেস করবে — কোনো প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন।',
  trackOrderRefundedNoticeBn:
    'এই অর্ডারের টাকা ফেরত দেওয়া হয়েছে। আপনার আগের পেমেন্ট মাধ্যমেই টাকা ফেরত যাবে।',

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

  pdpBackToProducts: 'content.pdp.backToProducts',
  pdpSkuPrefix: 'content.pdp.skuPrefix',
  pdpNewArrivalBadge: 'content.pdp.newArrivalBadge',
  pdpQuantity: 'content.pdp.quantity',
  pdpAddToBag: 'content.pdp.addToBag',
  pdpBuyNow: 'content.pdp.buyNow',
  pdpWishlistTitle: 'content.pdp.wishlistTitle',
  pdpLowStock: 'content.pdp.lowStock',
  pdpPairsBadge: 'content.pdp.pairsBadge',
  pdpPairsTitle: 'content.pdp.pairsTitle',
  pdpWriteReview: 'content.pdp.writeReview',
  pdpRatingBasedOn: 'content.pdp.ratingBasedOn',
  pdpWrittenReviewOne: 'content.pdp.writtenReviewOne',
  pdpWrittenReviewMany: 'content.pdp.writtenReviewMany',
  pdpRatingBreakdown: 'content.pdp.ratingBreakdown',
  pdpNoReviews: 'content.pdp.noReviews',
  pdpCareHeading: 'content.pdp.careHeading',
  pdpCareDefault: 'content.pdp.careDefault',
  pdpDeliveryHeading: 'content.pdp.deliveryHeading',
  pdpDeliveryBody: 'content.pdp.deliveryBody',
  pdpReturnsHeading: 'content.pdp.returnsHeading',
  pdpReturnsBody: 'content.pdp.returnsBody',

  cartBagTitle: 'content.cart.bagTitle',
  cartPageTitle: 'content.cart.pageTitle',
  cartEmptyTitle: 'content.cart.emptyTitle',
  cartEmptyHint: 'content.cart.emptyHint',
  cartContinue: 'content.cart.continue',
  cartFreeDeliveryUnlocked: 'content.cart.freeDeliveryUnlocked',
  cartFreeDeliveryRemaining: 'content.cart.freeDeliveryRemaining',
  cartPromoPlaceholder: 'content.cart.promoPlaceholder',
  cartCouponPlaceholder: 'content.cart.couponPlaceholder',
  cartRemoveItem: 'content.cart.removeItem',
  cartSubtotal: 'content.cart.subtotal',
  cartCouponDiscount: 'content.cart.couponDiscount',
  cartEstimatedShipping: 'content.cart.estimatedShipping',
  cartShippingFree: 'content.cart.shippingFree',
  cartTotalAmount: 'content.cart.totalAmount',
  cartProceedToCheckout: 'content.cart.proceedToCheckout',
  cartOrderSummary: 'content.cart.orderSummary',
  cartDiscountShort: 'content.cart.discountShort',
  cartDeliveryShort: 'content.cart.deliveryShort',
  cartTotalShort: 'content.cart.totalShort',
  cartDeliveryFreeWord: 'content.cart.deliveryFreeWord',
  cartFreeDeliveryNote: 'content.cart.freeDeliveryNote',
  cartSizeBadge: 'content.cart.sizeBadge',
  cartDecreaseQty: 'content.cart.decreaseQty',
  cartIncreaseQty: 'content.cart.increaseQty',
  cartApplyCoupon: 'content.cart.applyCoupon',
  cartRemoveCoupon: 'content.cart.removeCoupon',
  cartCouponActive: 'content.cart.couponActive',
  cartItemOne: 'content.cart.itemOne',
  cartItemMany: 'content.cart.itemMany',

  checkoutEmptyHint: 'content.checkout.emptyHint',
  checkoutDeliveryHeading: 'content.checkout.deliveryHeading',
  checkoutAreaPaymentHeading: 'content.checkout.areaPaymentHeading',
  checkoutFullName: 'content.checkout.fullName',
  checkoutNamePlaceholder: 'content.checkout.namePlaceholder',
  checkoutStreetPlaceholder: 'content.checkout.streetPlaceholder',
  checkoutEmailLabel: 'content.checkout.emailLabel',
  checkoutDivision: 'content.checkout.division',
  checkoutDistrict: 'content.checkout.district',
  checkoutPostal: 'content.checkout.postal',
  checkoutNote: 'content.checkout.note',
  checkoutNotePlaceholder: 'content.checkout.notePlaceholder',
  checkoutPlaceOrder: 'content.checkout.placeOrder',
  checkoutPlacingOrder: 'content.checkout.placingOrder',

  orderStatusPending: 'content.order.status.pending',
  orderStatusConfirmed: 'content.order.status.confirmed',
  orderStatusProcessing: 'content.order.status.processing',
  orderStatusShipped: 'content.order.status.shipped',
  orderStatusOutForDelivery: 'content.order.status.outForDelivery',
  orderStatusDelivered: 'content.order.status.delivered',
  orderStatusCancelled: 'content.order.status.cancelled',
  orderStatusReturned: 'content.order.status.returned',
  orderStatusRefunded: 'content.order.status.refunded',

  orderIdLabel: 'content.order.idLabel',
  orderTrackingLabel: 'content.order.trackingLabel',
  orderStatusLabel: 'content.order.statusLabel',
  orderDeliveryAddress: 'content.order.deliveryAddress',
  orderDeliveryCharge: 'content.order.deliveryCharge',
  orderItemQty: 'content.order.itemQty',

  orderSuccessLoading: 'content.orderSuccess.loading',
  orderSuccessNotFoundTitle: 'content.orderSuccess.notFoundTitle',
  orderSuccessNotFoundBody: 'content.orderSuccess.notFoundBody',
  orderSuccessCancelledTitle: 'content.orderSuccess.cancelledTitle',
  orderSuccessTitle: 'content.orderSuccess.title',
  orderSuccessThanks: 'content.orderSuccess.thanks',
  orderSuccessPaymentLabel: 'content.orderSuccess.paymentLabel',
  orderSuccessCodNote: 'content.orderSuccess.codNote',
  orderSuccessNextNote: 'content.orderSuccess.nextNote',
  orderSuccessTrackCta: 'content.orderSuccess.trackCta',

  trackOrderTitle: 'content.trackOrder.title',
  trackOrderSubtitle: 'content.trackOrder.subtitle',
  trackOrderInputPlaceholder: 'content.trackOrder.inputPlaceholder',
  trackOrderInputAria: 'content.trackOrder.inputAria',
  trackOrderSearch: 'content.trackOrder.search',
  trackOrderNotFound: 'content.trackOrder.notFound',
  trackOrderIdleHint: 'content.trackOrder.idleHint',
  trackOrderCloseAria: 'content.trackOrder.closeAria',
  trackOrderReturnedNotice: 'content.trackOrder.returnedNotice',
  trackOrderRefundedNotice: 'content.trackOrder.refundedNotice',

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

/* ── Order status vocabulary (Admin → Storefront → Orders & tracking) ──────── */

/**
 * Order status code → the content field that labels it. The codes come from the
 * API and never change, so this map is the single place the order confirmation
 * and tracking pages agree on what each status is called.
 */
export const ORDER_STATUS_FIELD: Record<string, SiteContentField> = {
  pending: 'orderStatusPending',
  confirmed: 'orderStatusConfirmed',
  processing: 'orderStatusProcessing',
  shipped: 'orderStatusShipped',
  out_for_delivery: 'orderStatusOutForDelivery',
  delivered: 'orderStatusDelivered',
  cancelled: 'orderStatusCancelled',
  returned: 'orderStatusReturned',
  refunded: 'orderStatusRefunded',
};

/** Localized label for an order status; unknown codes fall back to the raw code. */
export const orderStatusLabel = (
  content: SiteContent,
  t: (en: string, bn?: string) => string,
  status: string,
): string => {
  const field = ORDER_STATUS_FIELD[status];
  if (!field) return status;
  return t(content[field], content[`${field}Bn` as keyof SiteContent]);
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
