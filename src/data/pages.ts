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
    bodyBn: '',
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
    bodyBn: '',
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
    bodyBn: '',
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
    bodyBn: '',
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
    bodyBn: '',
    seoTitle: 'Terms & Conditions — AKS Mart',
    seoDescription:
      'Ordering, delivery, payment, product and returns terms for shopping at AKS Mart Bangladesh.',
    showInFooter: true,
    contactForm: false,
    sortOrder: 5,
  },
];
