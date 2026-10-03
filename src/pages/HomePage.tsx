import React, { Suspense, lazy } from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { SectionSkeleton } from '../components/Skeleton';

/*
 * The hero is the only section in the first download; the rest arrive in
 * parallel right after it, each with a same-sized placeholder so the page never
 * jumps. That is what makes the first paint fast on a slow connection.
 */
const CategoryVisualGrid = lazy(() => import('../components/CategoryVisualGrid').then((m) => ({ default: m.CategoryVisualGrid })));
const FeaturedProducts = lazy(() => import('../components/FeaturedProducts').then((m) => ({ default: m.FeaturedProducts })));
const PromoCampaign = lazy(() => import('../components/PromoCampaign').then((m) => ({ default: m.PromoCampaign })));
const NewArrivals = lazy(() => import('../components/NewArrivals').then((m) => ({ default: m.NewArrivals })));
const ProductShowcaseCircle = lazy(() => import('../components/ProductShowcaseCircle').then((m) => ({ default: m.ProductShowcaseCircle })));
const BestSellers = lazy(() => import('../components/BestSellers').then((m) => ({ default: m.BestSellers })));
const PromoGallery = lazy(() => import('../components/PromoGallery').then((m) => ({ default: m.PromoGallery })));

/**
 * Storefront home page — clean, conversion-focused hierarchy:
 * Hero → Divisions → Featured → Offers → New Arrivals
 * → Showcase ("Loved by our customers") → Best Sellers → Promo gallery.
 * Full catalog browsing lives on /products.
 */
export function HomePage() {
  return (
    <>
      <HeroSlider />
      <Suspense fallback={<SectionSkeleton count={5} />}>
        <CategoryVisualGrid />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<SectionSkeleton count={3} />}>
        <PromoCampaign />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <NewArrivals />
      </Suspense>
      <Suspense fallback={<SectionSkeleton count={2} />}>
        <ProductShowcaseCircle />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <BestSellers />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PromoGallery />
      </Suspense>
    </>
  );
}
