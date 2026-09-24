/**
 * Bundled content pages — the offline fallback for the DB-driven pages
 * (Admin → Content Pages, served by GET /api/pages).
 *
 * The text below is a factual draft built only from promises the storefront
 * already makes (30-day returns, 24–48h delivery inside Dhaka, cash on
 * delivery) and the store details in src/data/aksMart.ts. It is meant to be
 * reviewed and rewritten by the merchant in the admin panel.
 *
 * Body formatting is deliberately dependency-free:
 *   "## " starts a heading, "- " starts a bullet, blank lines split paragraphs.
 */

export interface ContentPageData {
  slug: string;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  seoTitle: string;
  seoDescription: string;
  showInFooter: boolean;
  /** Render the contact form under the body (Admin → Content Pages). */
  contactForm: boolean;
  sortOrder: number;
}

export const DEFAULT_PAGES: ContentPageData[] = [
  {
    slug: 'about',
    title: 'About AKS Mart',
    titleBn: 'একেএস মার্ট সম্পর্কে',
    body: `AKS Mart is Bangladesh's multi-division marketplace — SHUDDHO food, AKS CRAFT handicrafts, AKS HOME living, AKS BEAUTY personal care and AKS PRINT custom print — all under one roof.

## Our promise

"Uncompromising in Quality, Committed to Humanity."

Every product we list is checked before it is dispatched, and every order is delivered to your door across Bangladesh.

## What we sell

- SHUDDHO — rice, oils, dal, spices, honey, ghee and everyday food essentials
- AKS CRAFT — handmade bags, jute products, Nakshi Kantha and home décor
- AKS HOME — bedding, curtains, cushions and kitchen essentials
- AKS BEAUTY — face care, hair care, soap and personal care
- AKS PRINT — business cards, packaging, custom apparel and drinkware

## Questions?

Our team is happy to help — see the Contact Us page for phone, email and our Dhaka office address.`,
    bodyBn: `AKS Mart বাংলাদেশের বহুমুখী মার্কেটপ্লেস — SHUDDHO খাদ্যপণ্য, AKS CRAFT হস্তশিল্প, AKS HOME গৃহসজ্জা, AKS BEAUTY ব্যক্তিগত যত্ন এবং AKS PRINT কাস্টম প্রিন্ট — সবই এক ছাদের নিচে।

## আমাদের অঙ্গীকার

“গুণগত মানে আপসহীন, মানবিকতায় অঙ্গীকারবদ্ধ।”

আমাদের প্রতিটি পণ্য পাঠানোর আগে যাচাই করা হয়, আর প্রতিটি অর্ডার বাংলাদেশ জুড়ে আপনার দোরগোড়ায় পৌঁছে দেওয়া হয়।

## আমরা কী বিক্রি করি

- SHUDDHO — চাল, তেল, ডাল, মসলা, মধু, ঘি ও দৈনন্দিন খাদ্যপ্রয়োজনীয় পণ্য
- AKS CRAFT — হাতে তৈরি ব্যাগ, পাটজাত পণ্য, নকশি কাঁথা ও ঘরসজ্জা
- AKS HOME — বেডিং, পর্দা, কুশন ও রান্নাঘরের প্রয়োজনীয় পণ্য
- AKS BEAUTY — ফেস কেয়ার, হেয়ার কেয়ার, সাবান ও ব্যক্তিগত যত্ন
- AKS PRINT — বিজনেস কার্ড, প্যাকেজিং, কাস্টম পোশাক ও ড্রিংকওয়্যার

## প্রশ্ন আছে?

আমাদের টিম সাহায্য করতে প্রস্তুত — ফোন, ইমেইল ও ঢাকার অফিসের ঠিকানার জন্য যোগাযোগ পেজটি দেখুন।`,
    seoTitle: 'About AKS Mart — five divisions, one trusted destination',
    seoDescription:
      'AKS Mart is a multi-division marketplace in Bangladesh: SHUDDHO food, AKS CRAFT, AKS HOME, AKS BEAUTY and AKS PRINT — quality checked and delivered nationwide.',
    showInFooter: true,
    contactForm: false,
    sortOrder: 1,
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    titleBn: 'যোগাযোগ',
    body: `## Talk to us

- Phone / WhatsApp: +8801728-843503
- Email: info@aksgarments.com.bd
- Office: Paltan Tower, 87 Purana Paltan Line, Dhaka

## Order help

Please keep your order number handy — you will find it on your order confirmation page and in Track Your Order.

## Delivery

Orders inside Dhaka are usually delivered within 24–48 hours. Other districts depend on the courier partner and may take longer.

## Payment

Cash on Delivery (COD) is available at checkout: you pay when the order arrives.`,
    bodyBn: `## আমাদের সাথে যোগাযোগ

- ফোন / হোয়াটসঅ্যাপ: +8801728-843503
- ইমেইল: info@aksgarments.com.bd
- অফিস: পল্টন টাওয়ার, ৮৭ পুরানা পল্টন লাইন, ঢাকা

## অর্ডার সংক্রান্ত সহায়তা

অর্ডার নম্বরটি হাতের কাছে রাখুন — এটি অর্ডার নিশ্চিতকরণ পেজে এবং “অর্ডার ট্র্যাক করুন”-এ পাবেন।

## ডেলিভারি

ঢাকার ভিতরে অর্ডার সাধারণত ২৪–৪৮ ঘণ্টার মধ্যে পৌঁছে যায়। ঢাকার বাইরে কুরিয়ার পার্টনারের উপর নির্ভর করে এবং কিছুটা বেশি সময় লাগতে পারে।

## পেমেন্ট

চেকআউটে ক্যাশ অন ডেলিভারি (COD) সুবিধা আছে: পণ্য পৌঁছানোর সময় টাকা পরিশোধ করবেন।`,
    seoTitle: 'Contact AKS Mart — phone, email and office address',
    seoDescription:
      'Reach AKS Mart by phone or WhatsApp at +8801728-843503, by email at info@aksgarments.com.bd, or visit Paltan Tower, 87 Purana Paltan Line, Dhaka.',
    showInFooter: true,
    contactForm: true,
    sortOrder: 2,
  },
  {
    slug: 'return-refund-policy',
    title: 'Return & Refund Policy',
    titleBn: 'রিটার্ন ও রিফান্ড নীতি',
    body: `## Returns within 30 days

We offer easy returns on eligible items within 30 days of delivery — the same 30-day promise shown on our product pages.

## How to start a return

- Call or message us at +8801728-843503, or email info@aksgarments.com.bd
- Share your order number and the reason for the return
- Our team confirms whether the item is eligible and arranges pickup where available

## Conditions

- The item should be unused and in the condition you received it, with tags and original packaging where applicable
- Food, perishable goods and personalised print items cannot be returned once delivered, unless the item arrived damaged or incorrect
- Keep the item clean and complete — missing parts may affect the refund amount

## Refunds

Once the returned item reaches us and passes inspection, we process the refund or exchange. For Cash on Delivery orders the refund is arranged through an agreed method and we confirm it with you directly.

## Damaged or wrong item?

Tell us within 3 days of delivery with a photo of the item and the packaging, and we will replace it or refund you.`,
    bodyBn: `## ৩০ দিনের মধ্যে রিটার্ন

ডেলিভারির ৩০ দিনের মধ্যে উপযুক্ত পণ্য সহজে ফেরত দেওয়া যায় — আমাদের পণ্য পেজে দেওয়া একই ৩০ দিনের প্রতিশ্রুতি।

## কীভাবে রিটার্ন শুরু করবেন

- +8801728-843503 নম্বরে কল বা মেসেজ করুন, অথবা info@aksgarments.com.bd-এ ইমেইল করুন
- আপনার অর্ডার নম্বর ও ফেরত দেওয়ার কারণ জানান
- পণ্যটি ফেরতযোগ্য কি না তা আমাদের টিম নিশ্চিত করে এবং যেখানে সম্ভব পিকআপের ব্যবস্থা করে

## শর্তাবলি

- পণ্যটি অব্যবহৃত এবং যে অবস্থায় পেয়েছেন সেই অবস্থাতেই থাকতে হবে; সম্ভব হলে ট্যাগ ও মূল প্যাকেজিংসহ
- খাদ্যপণ্য, পচনশীল পণ্য এবং ব্যক্তিগতকৃত প্রিন্ট পণ্য ডেলিভারির পর ফেরত নেওয়া হয় না, তবে পণ্য ক্ষতিগ্রস্ত বা ভুল হলে ব্যতিক্রম
- পণ্যটি পরিষ্কার ও সম্পূর্ণ রাখুন — অংশবিশেষ না থাকলে ফেরতের পরিমাণ কমতে পারে

## রিফান্ড

ফেরত দেওয়া পণ্য আমাদের কাছে পৌঁছে পরীক্ষা-নিরীক্ষার পর আমরা রিফান্ড বা বদল সম্পন্ন করি। ক্যাশ অন ডেলিভারি অর্ডারের ক্ষেত্রে সম্মত পদ্ধতিতে রিফান্ডের ব্যবস্থা করা হয় এবং তা আপনাকে সরাসরি জানিয়ে দেওয়া হয়।

## পণ্য ক্ষতিগ্রস্ত বা ভুল এসেছে?

ডেলিভারির ৩ দিনের মধ্যে পণ্য ও প্যাকেজিংয়ের ছবিসহ আমাদের জানান — আমরা বদলে দেব অথবা রিফান্ড করব।`,
    seoTitle: 'Return & Refund Policy — 30-day returns at AKS Mart',
    seoDescription:
      'AKS Mart accepts returns within 30 days of delivery. Learn how to start a return, the condition requirements and how refunds and exchanges are processed.',
    showInFooter: true,
    contactForm: false,
    sortOrder: 3,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    titleBn: 'প্রাইভেসি নীতি',
    body: `## What we collect

When you place an order we collect the details needed to deliver it:

- Name, phone number and email address
- Delivery address and, where relevant, delivery notes
- What you ordered and the amount payable

## Why we use it

- To confirm and deliver your order
- To contact you about the order (for example a delivery call or a stock update)
- To keep an order record so returns and refunds can be handled later

## What we do not do

- We do not sell or rent your personal information
- We do not share your details with anyone except the delivery and payment partners needed to complete your order

## Your device

Your shopping bag, wishlist and language choice are stored in your own browser (local storage) so they are still there when you return. Clearing your browser data removes them.

## Removing your data

Write to info@aksgarments.com.bd with your order number and we will delete the personal details we no longer need to keep for accounting purposes.`,
    bodyBn: `## আমরা কী তথ্য নিই

অর্ডার করার সময় ডেলিভারির জন্য যেটুকু তথ্য দরকার, ঠিক সেটুকুই নেওয়া হয়:

- নাম, ফোন নম্বর ও ইমেইল ঠিকানা
- ডেলিভারি ঠিকানা এবং প্রয়োজনে ডেলিভারি সংক্রান্ত নির্দেশনা
- আপনি কী অর্ডার করেছেন এবং পরিশোধযোগ্য টাকার পরিমাণ

## কেন ব্যবহার করি

- অর্ডার নিশ্চিত ও ডেলিভারি করতে
- অর্ডার সংক্রান্ত যোগাযোগের জন্য (যেমন ডেলিভারির কল বা স্টকের আপডেট)
- অর্ডারের রেকর্ড রাখতে, যাতে পরে রিটার্ন ও রিফান্ড সামলানো যায়

## আমরা যা করি না

- আপনার ব্যক্তিগত তথ্য বিক্রি বা ভাড়া দেওয়া হয় না
- অর্ডার সম্পন্ন করার জন্য প্রয়োজনীয় ডেলিভারি ও পেমেন্ট পার্টনার ছাড়া অন্য কারও সাথে আপনার তথ্য শেয়ার করা হয় না

## আপনার ডিভাইসে সংরক্ষিত তথ্য

আপনার শপিং ব্যাগ, পছন্দের তালিকা ও ভাষার পছন্দ আপনার নিজের ব্রাউজারে (লোকাল স্টোরেজে) রাখা হয়, যাতে আবার এলে সেগুলো আগের মতোই থাকে। ব্রাউজারের ডেটা মুছে ফেললে সেগুলোও মুছে যাবে।

## আপনার তথ্য মুছে ফেলা

আপনার অর্ডার নম্বরসহ info@aksgarments.com.bd-এ লিখুন — হিসাবরক্ষণের জন্য যা রাখা জরুরি নয়, এমন ব্যক্তিগত তথ্য আমরা মুছে দেব।`,
    seoTitle: 'Privacy Policy — how AKS Mart handles your data',
    seoDescription:
      'How AKS Mart collects, uses and protects customer information for orders, delivery and support — and how to ask us to remove your data.',
    showInFooter: true,
    contactForm: false,
    sortOrder: 4,
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    titleBn: 'শর্তাবলী',
    body: `## Orders

- Placing an order is a request to buy; it is confirmed once our team accepts it
- Orders are subject to stock availability. If an item is unavailable we contact you to adjust or cancel the order
- Prices are shown in Bangladeshi Taka (BDT) and cover the product only; delivery charges appear at checkout before you confirm

## Delivery

- Orders inside Dhaka are usually delivered within 24–48 hours
- Deliveries outside Dhaka depend on the courier partner and may take longer
- Please keep your phone reachable — the courier may call before delivery

## Payment

Cash on Delivery is currently the payment method offered at checkout.

## Products

- Product photos are for illustration; handcrafted and natural items may vary slightly in colour, grain or finish
- Colour reproduction also depends on your screen

## Returns

Returns and refunds follow our Return & Refund Policy.

## Contact

Questions about these terms: info@aksgarments.com.bd or +8801728-843503.`,
    bodyBn: `## অর্ডার

- অর্ডার করা মানে কেনার অনুরোধ; আমাদের টিম গ্রহণ করলে তা নিশ্চিত হয়
- অর্ডার স্টক থাকার উপর নির্ভর করে। কোনো পণ্য না থাকলে আমরা যোগাযোগ করে অর্ডার সমন্বয় বা বাতিল করি
- দাম বাংলাদেশি টাকায় (BDT) দেখানো হয় এবং তা শুধু পণ্যের মূল্য; ডেলিভারি চার্জ নিশ্চিত করার আগেই চেকআউটে দেখা যায়

## ডেলিভারি

- ঢাকার ভিতরে অর্ডার সাধারণত ২৪–৪৮ ঘণ্টার মধ্যে পৌঁছে যায়
- ঢাকার বাইরে ডেলিভারি কুরিয়ার পার্টনারের উপর নির্ভর করে এবং কিছুটা বেশি সময় লাগতে পারে
- ফোনটি সচল রাখুন — ডেলিভারির আগে কুরিয়ার কল করতে পারে

## পেমেন্ট

চেকআউটে বর্তমানে ক্যাশ অন ডেলিভারি পেমেন্টের সুবিধা রয়েছে।

## পণ্য

- পণ্যের ছবি শুধু নমুনার জন্য; হাতে তৈরি ও প্রাকৃতিক পণ্যের রং, দানা বা ফিনিশে সামান্য পার্থক্য থাকতে পারে
- রঙের প্রকাশ আপনার স্ক্রিনের উপরও নির্ভর করে

## রিটার্ন

রিটার্ন ও রিফান্ড আমাদের “রিটার্ন ও রিফান্ড নীতি” অনুযায়ী হয়।

## যোগাযোগ

এই শর্তাবলি নিয়ে প্রশ্ন থাকলে: info@aksgarments.com.bd অথবা +8801728-843503।`,
    seoTitle: 'Terms & Conditions — AKS Mart',
    seoDescription:
      'Ordering, delivery, payment, product and returns terms for shopping at AKS Mart Bangladesh.',
    showInFooter: true,
    contactForm: false,
    sortOrder: 5,
  },
];
