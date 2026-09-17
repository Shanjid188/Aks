import React from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { PromotionBanner } from '../components/PromotionBanner';
import { BrandMarquee } from '../components/BrandMarquee';
import { CategoryVisualGrid } from '../components/CategoryVisualGrid';
import { ProductShowcaseCircle } from '../components/ProductShowcaseCircle';
import { FeaturedProducts } from '../components/FeaturedProducts';
import { PromoCampaign } from '../components/PromoCampaign';
import { NewArrivals } from '../components/NewArrivals';
import { BestSellers } from '../components/BestSellers';

/**
 * Storefront home page — clean, conversion-focused hierarchy:
 * Hero → Promotions → Brand strip → Divisions → Featured → Offers → New Arrivals
 * → Showcase → Best Sellers. Full catalog browsing lives on /products.
 */
export function HomePage() {
  return (
    <>
      <HeroSlider />
      <PromotionBanner />
      <BrandMarquee />
      <CategoryVisualGrid />
      <FeaturedProducts />
      <PromoCampaign />
      <NewArrivals />
      <ProductShowcaseCircle />
      <BestSellers />
    </>
  );
}
