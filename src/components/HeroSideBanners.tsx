import React, { useEffect, useState } from 'react';
import { ArrowRight, Megaphone, Printer, Truck, Wallet, type LucideIcon } from 'lucide-react';
import { dataLoader } from '../lib/dataLoader';
import type { SideBanner, SideBannerIcon } from '../data/promos';
import { Link } from '../lib/router';
import { useLocalized } from './Localized';
import { SkeletonBlock } from './Skeleton';

/** A hero side column holds at most three banners. */
const MAX_TILES = 3;

const ICONS: Record<SideBannerIcon, LucideIcon> = {
  truck: Truck,
  printer: Printer,
  wallet: Wallet,
  megaphone: Megaphone,
};

/** One banner tile — an uploaded banner, or a bundled promo tile with copy. */
const SideBannerTile: React.FC<{ tile: SideBanner; className?: string }> = ({ tile, className }) => {
  const t = useLocalized();
  const clickable = Boolean(tile.to || tile.href);
  // Uploaded banners are pure artwork: nothing is drawn over the merchant's
  // image. The bundled promo tiles carry copy and get the overlay treatment.
  const hasCopy = Boolean(tile.eyebrow || tile.title || tile.subtitle);
  const Icon = hasCopy && tile.icon ? ICONS[tile.icon] : null;
  const accent = tile.accentColor || '#D8232A';

  const classes = [
    'group relative flex min-h-[150px] overflow-hidden rounded-2xl shadow-md shadow-neutral-900/10 ring-1 ring-black/5',
    tile.image ? 'bg-neutral-200' : 'bg-neutral-900',
    'xl:h-full xl:min-h-0',
    clickable
      ? 'cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-neutral-900/20'
      : 'cursor-default',
    className || '',
  ].join(' ');

  const body = (
    <>
      {/* Branded gradient base — the whole artwork for copy-only tiles */}
      {!tile.image && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 45%, #171717 100%)` }}
        />
      )}

      {tile.image && (
        <img
          src={tile.image}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-contain object-center xl:object-cover ${
            clickable ? 'transition-transform duration-700 group-hover:scale-105' : ''
          }`}
        />
      )}

      {hasCopy && (
        <>
          {/* Legibility overlay — heaviest at the bottom, where the copy sits */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-neutral-950/92 via-neutral-950/45 to-neutral-950/10" />

          {/* Decorative glow + oversized watermark icon (watermark hidden on
              phones so the small two-up tiles stay uncluttered) */}
          <div aria-hidden="true" className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-colors duration-500 group-hover:bg-white/20" />
          {Icon && (
            <Icon
              aria-hidden="true"
              className="absolute -right-2 -bottom-3 hidden h-20 w-20 rotate-12 text-white/15 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105 sm:block"
            />
          )}

          <div className="relative z-10 flex w-full flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md sm:text-[10px]">
              {t(tile.eyebrow, tile.eyebrowBn)}
            </span>

            <div>
              <h3 className="text-sm font-black leading-tight tracking-tight text-white sm:text-base lg:text-lg">
                {t(tile.title, tile.titleBn)}
              </h3>
              {tile.subtitle && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80 sm:text-xs">
                  {t(tile.subtitle, tile.subtitleBn)}
                </p>
              )}
              {clickable && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-neutral-900 transition-colors group-hover:bg-[#D8232A] group-hover:text-white sm:text-[11px]">
                  {t('Shop now', 'এখনই কিনুন')}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  if (tile.to) {
    return (
      <Link to={tile.to} ariaLabel={tile.title} className={classes}>
        {body}
      </Link>
    );
  }
  if (tile.href) {
    return (
      <a href={tile.href} target="_blank" rel="noreferrer" aria-label={tile.title} className={classes}>
        {body}
      </a>
    );
  }
  return (
    <div className={classes}>
      {body}
    </div>
  );
};

/**
 * Promotional side column for the homepage hero.
 *
 * It is a grid child of the hero row (see HeroSlider), so on `xl` and up it sits
 * exactly as tall as the carousel card beside it, while below `xl` it drops under
 * the hero as a two-up promo band.
 *
 * Content: the merchant's own image-only banners (Admin → Hero Slides → Side
 * banners). Until any are uploaded the bundled `SIDE_BANNERS` promo tiles show,
 * so the column is never empty.
 */
export const HeroSideBanners: React.FC = () => {
  const t = useLocalized();
  // Banners come from the API (Admin → Hero Slides → Side banners); the bundled
  // tiles only appear if the API is unavailable, never as a first flash.
  const [tiles, setTiles] = useState<SideBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadSideBanners().then((loaded) => {
      if (cancelled) return;
      setTiles(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <aside aria-label={t('Promotions', 'প্রোমোশন')} className="min-w-0 xl:col-start-2 xl:row-start-1">
        <div className="grid h-full grid-cols-2 gap-3 sm:gap-4 xl:auto-rows-fr xl:grid-cols-1">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="min-h-[150px] rounded-2xl xl:min-h-0" />
          ))}
        </div>
      </aside>
    );
  }

  const shown = tiles.slice(0, MAX_TILES);
  if (shown.length === 0) return null;

  return (
    <aside
      aria-label={t('Promotions', 'প্রোমোশন')}
      className="min-w-0 xl:col-start-2 xl:row-start-1"
    >
      <div className="grid h-full grid-cols-2 gap-3 sm:gap-4 xl:auto-rows-fr xl:grid-cols-1">
        {shown.map((tile, idx) => (
          <SideBannerTile
            key={tile.id}
            tile={tile}
            // An odd last tile takes the full width of the two-up band.
            className={shown.length % 2 === 1 && idx === shown.length - 1 ? 'max-xl:col-span-2' : ''}
          />
        ))}
      </div>
    </aside>
  );
};
