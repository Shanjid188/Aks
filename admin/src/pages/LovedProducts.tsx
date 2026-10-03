import { api } from '../api';
import { ImageSetManager } from '../components/ImageSetManager';

/** Resolve a pasted product slug to that product's photo + click-through link. */
const resolveProduct = async (slug: string): Promise<{ image: string; link: string } | null> => {
  try {
    const product = await api.get<{ slug: string; images: string[] }>(`/products/${slug}`);
    const image = product.images?.[0];
    if (!image) return null;
    return { image, link: `/products/${slug}` };
  } catch {
    return null;
  }
};

/**
 * Loved Products — the products of the "Loved by our customers" circle
 * showcase on the home page (the rounded section above Best Sellers).
 *
 * Paste product links from the merchant's own website — one per line — and
 * they appear there with their full details, in the exact same design. While
 * nothing is picked the section keeps choosing its own trending favourites.
 */
export function LovedProductsPage() {
  return (
    <ImageSetManager
      resource="love-banners"
      addBy="link"
      resolveProduct={resolveProduct}
      title="Loved Products"
      intro="The “Loved by our customers” section on the home page (the circle showcase above Best Sellers). Paste product links from your own website — one per line — and they appear there with their full details."
      guide={{
        title: 'How the showcase uses your products',
        rows: [
          { lead: '#1', text: '— the big centre circle (photo, price, rating, details)' },
          { lead: '#2–#5', text: '— the four products around the circle' },
          { lead: 'Details', text: '— every product shows name, price & rating as usual' },
          { lead: 'Empty', text: '— the section picks trending favourites automatically' },
        ],
      }}
      emptyHint="Paste your product links above — they appear in the section as soon as the first one is in."
      capacity={5}
      overCapacityNote="Only the first 5 products are used — 1 in the big circle and 4 around it."
    />
  );
}
