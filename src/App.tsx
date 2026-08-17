import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { HeroSlider } from './components/HeroSlider';
import { CategoryVisualGrid } from './components/CategoryVisualGrid';
import { BrandBar } from './components/BrandBar';
import { ProductGrid } from './components/ProductGrid';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { StoreLocatorModal } from './components/StoreLocatorModal';
import { BataClubModal } from './components/BataClubModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { ShoeFinderModal } from './components/ShoeFinderModal';
import { CompareModal } from './components/CompareModal';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';

const MainAppContent: React.FC = () => {
  const { activeProductPage } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans antialiased selection:bg-[#D8232A] selection:text-white">
      {/* Universal Header */}
      <Header />

      {/* Main View Area */}
      <main className="flex-1">
        {activeProductPage ? (
          <ProductDetailPage />
        ) : (
          <div className="space-y-0">
            {/* Promotional Hero Slider */}
            <HeroSlider />

            {/* Curated Category Grid */}
            <CategoryVisualGrid />

            {/* Authentic Brand Selector */}
            <BrandBar />

            {/* Full Product Catalog with Filter Sidebar */}
            <ProductGrid />
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <Footer />

      {/* Global Modals & Drawers */}
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutModal />
      <SizeGuideModal />
      <StoreLocatorModal />
      <BataClubModal />
      <OrderTrackerModal />
      <ShoeFinderModal />
      <CompareModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
