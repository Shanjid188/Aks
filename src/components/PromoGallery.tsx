import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { dataLoader } from '../lib/dataLoader';
import { PROMO_GALLERY } from '../data/promos';
import type { PromoGalleryItem } from '../data/promos';
import type { ApiGalleryBanner, ApiPromotion } from '../api';
import { Link } from '../lib/router';
import { Bi } from './Bi';
import { SectionAction } from './SectionAction';
import { useLocalized } from './Localized';
import { useSiteContent } from '../context/SiteContentContext';
import { SkeletonBlock } from './Skeleton';

/** The gallery holds four tiles: one wide banner, two squares and one
 *  full-height column. Any further promotion is ignored. */
const MAX_TILES = 4;

/** Merchant promotions → gallery tiles. Only rows that carry artwork can
 *  appear, because every tile is pure image. */
function fromPromotions(promotions: ApiPromotion[]): PromoGalleryItem[] {
  return promotions
    .filter((p) => Boolean(p.image))
    .slice(0, MAX_TILES)
    .map((p) => {
      const tile: PromoGalleryItem = {
        id: `promotion-${p.id}`,
        image: p.image as string,
        alt: p.title,
      };
      if (p.link) {
        if (p.link.startsWith('/')) tile.to = p.link;
        else tile.href = p.link;
      }
      return tile;
    });
}

/** Merchant gallery images → tiles. Added from Admin → Gallery Images, where
 *  uploading a picture is the whole job — so there is no title to fall back on
 *  and the alt text stays generic. */
function fromGalleryBanner(b: ApiGalleryBanner): PromoGalleryItem {
  const tile: PromoGalleryItem = {
    id: `gallery-${b.id}`,
    image: b.image,
    alt: 'AKS Mart promotion banner',
  };
  if (b.link) {
    if (b.link.startsWith('/')) tile.to = b.link;
    else tile.href = b.link;
  }
  return tile;
}

/** One artwork tile — rounded, ringed, slow zoom on hover. */
const GalleryTile: React.FC<{ item: PromoGalleryItem; className?: string }> = ({ item, className }) => {
  const clickable = Boolean(item.to || item.href);

  const classes = [
    'group relative block overflow-hidden rounded-2xl bg-neutral-200 ring-1 ring-black/5',
    clickable
      ? 'cursor-pointer transition-shadow duration-300 hover:shadow-xl hover:shadow-neutral-900/15 hover:ring-black/10'
      : 'cursor-default',
    className || '',
  ].join(' ');

  const artwork = (
    <img
      src={item.image}
      alt={item.alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover object-center ${
        clickable ? 'transition-transform duration-700 ease-out group-hover:scale-[1.06]' : ''
      }`}
    />
  );

  if (item.to) {
    return (
      <Link to={item.to} ariaLabel={item.alt} className={classes}>
        {artwork}
      </Link>
    );
  }
  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" aria-label={item.alt} className={classes}>
        {artwork}
      </a>
    );
  }
  return <div className={classes}>{artwork}</div>;
};

/**
 * Promo gallery — the last homepage section, sitting right above the footer.
 *
 * An image-only bento grid (wide banner + two squares beside it + one
 * full-height column) built from the merchant's own images in Admin → Gallery
 * Images, where uploading a picture is the only step. If nothing has been
 * uploaded there, promo artwork from Admin → Storefront → Promotions is used,
 * and failing that the bundled division banners in `PROMO_GALLERY` keep the
 * grid whole — so the section is never half empty.
 *
 * The heading above the grid is the editable homepage copy, so the section
 * reads as a finished merchant block rather than a bare image dump.
 */
export const PromoGallery: React.FC = () => {
  const t = useLocalized();
  const { content } = useSiteContent();
  const [tiles, setTiles] = useState<PromoGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Source priority — whatever the merchant has set up wins, and the section
    // is never half empty: 1) images added in Admin → Gallery Images, 2) promo
    // rows that carry uploaded artwork, 3) the bundled division banners.
    Promise.all([dataLoader.loadGalleryBanners(), dataLoader.loadPromotions()]).then(([gallery, promotions]) => {
      if (cancelled) return;
      if (gallery) {
        setTiles(gallery.map(fromGalleryBanner));
        setLoading(false);
        return;
      }
      const uploaded = fromPromotions(promotions);
      setTiles(uploaded.length > 0 ? uploaded : PROMO_GALLERY);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Placeholder tiles while the gallery is on its way — the bundled artwork is
  // only used if the API really has nothing.
  if (loading) {
    return (
      <section className="bg-white" aria-hidden="true">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 sm:gap-4">
              <SkeletonBlock className="aspect-[2048/1365]" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <SkeletonBlock className="aspect-[16/10] sm:aspect-square" />
                <SkeletonBlock className="hidden aspect-square sm:block" />
              </div>
            </div>
            <SkeletonBlock className="aspect-[4/5] md:aspect-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (tiles.length === 0) return null;
  const shown = tiles.slice(0, MAX_TILES);
  const wide = 'aspect-[16/9] sm:aspect-[5/2]';
  const square = 'aspect-[16/10] sm:aspect-square';

  let grid: React.ReactNode;
  if (shown.length >= 4) {
    grid = (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 sm:gap-4">
          <GalleryTile item={shown[0]} className="aspect-[2048/1365]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <GalleryTile item={shown[1]} className={square} />
            {/* Second square only fits once there is room for two columns. */}
            <GalleryTile item={shown[2]} className={`hidden sm:block ${square}`} />
          </div>
        </div>
        <GalleryTile item={shown[3]} className="aspect-[4/5] md:aspect-auto md:h-full" />
      </div>
    );
  } else if (shown.length === 3) {
    grid = (
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <GalleryTile item={shown[0]} className={wide} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <GalleryTile item={shown[1]} className={square} />
          <GalleryTile item={shown[2]} className={square} />
        </div>
      </div>
    );
  } else if (shown.length === 2) {
    grid = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <GalleryTile item={shown[0]} className={square} />
        <GalleryTile item={shown[1]} className={square} />
      </div>
    );
  } else {
    grid = <GalleryTile item={shown[0]} className={wide} />;
  }

  return (
    <section className="relative overflow-hidden bg-white" aria-label={t('Featured collections', 'ফিচার্ড কালেকশন')}>
      {/* Soft brand wash behind the heading — keeps the block from reading as a
          bare image dump without competing with the merchant's artwork. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#D8232A]/[0.06] via-[#D8232A]/[0.02] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#D8232A]/[0.07] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* ── Section head: Offers & Collections / One Mart. Many Choices. ── */}
        <header className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {/* Eyebrow — solid brand pill so it anchors the block */}
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D8232A] to-[#e8464d] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#D8232A]/25">
              <Sparkles className="h-3.5 w-3.5" />
              <Bi en={content.promoTagline} bn={content.promoTaglineBn} />
            </span>

            <h2 className="mt-4 text-[1.9rem] font-black leading-[1.12] tracking-tight text-neutral-900 sm:text-4xl lg:text-[2.7rem]">
              <Bi en={content.promoTitle} bn={content.promoTitleBn} />
              {/* hand-drawn squiggle — matches the other section headings */}
              <svg
                viewBox="0 0 220 12"
                fill="none"
                aria-hidden="true"
                className="mt-2 h-2.5 w-40 text-[#D8232A]/70 sm:w-56"
              >
                <path
                  d="M3 9C30 3 55 3 82 7s55 4 82-2 40-3 53 1"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </h2>

            <p className="mt-3.5 text-sm leading-relaxed text-neutral-600 sm:text-base">
              <Bi en={content.promoSubtitle} bn={content.promoSubtitleBn} />
            </p>
          </div>

          <SectionAction to="/products" className="self-start sm:self-auto">
            {t(content.promoCta, content.promoCtaBn)}
          </SectionAction>
        </header>

        {grid}
      </div>
    </section>
  );
};
