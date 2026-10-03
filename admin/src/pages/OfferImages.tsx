import { ImageSetManager } from '../components/ImageSetManager';

/**
 * Offer Images — the artwork of the homepage "Active Offers" section (rendered
 * by PromoCampaign). While this page is empty the section keeps showing the
 * coupon tickets built from Admin → Coupons.
 */
export function OfferImagesPage() {
  return (
    <ImageSetManager
      resource="offer-banners"
      title="Offer Images"
      intro="The “Active Offers” section on the home page. Add your offer artwork and it appears there — nothing else to fill in."
      guide={{
        title: 'How the offers section uses your images',
        rows: [
          { lead: '#1', text: '— wide banner (≈2:1 — the biggest spot)' },
          { lead: '#2–#4', text: '— the row of tiles below it (≈4:3)' },
          { lead: 'Tip', text: '— write the offer & code inside the image' },
          { lead: '5+', text: '— not shown (the section holds 4)' },
        ],
        note: 'While this page is empty the section keeps showing the coupon tickets from Admin → Coupons, so nothing breaks.',
      }}
      emptyHint="Add your offer artwork above — it appears in the Active Offers section right away."
      capacity={4}
      overCapacityNote="Only the first 4 images are shown in the offers section."
    />
  );
}
