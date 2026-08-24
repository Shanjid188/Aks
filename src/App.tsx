import React, { useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { HeroSlider } from './components/HeroSlider';
import { CategoryVisualGrid } from './components/CategoryVisualGrid';
import { BrandBar } from './components/BrandBar';
import { ProductGrid } from './components/ProductGrid';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { StoreLocatorModal } from './components/StoreLocatorModal';
import { AksMartClubModal } from './components/AksMartClubModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { ShoeFinderModal } from './components/ShoeFinderModal';
import { CompareModal } from './components/CompareModal';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';

const MainAppContent: React.FC = () => {
  const { products, activeProductPage, setActiveProductPage } = useStore();

  // Always know the latest open product id without re-running the hash listener
  // on every render. Without this, a just-opened product page would be closed
  // the instant it opens (the hash isn't written to the URL yet).
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeProductPage?.id ?? null;
  }, [activeProductPage]);

  // URL → view. This only responds to actual navigation (Back/Forward, a typed
  // hash) and the initial page load. It never reacts to our own state changes,
  // which is what made product pages open-and-close in an infinite flicker loop.
  useEffect(() => {
    const applyHash = () => {
      const match = window.location.hash.match(/^#\/p\/(.+)$/);
      if (match) {
        const slug = decodeURIComponent(match[1]);
        const found = products.find((p) => p.slug === slug);
        if (found && found.id !== activeIdRef.current) {
          setActiveProductPage(found);
          window.scrollTo({ top: 0 });
        } else if (!found && products.length > 0) {
          // Unknown slug → go home instead of a blank detail page.
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else if (activeIdRef.current) {
        // Hash went empty via the browser Back button → close the product view.
        setActiveProductPage(null);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [products, setActiveProductPage]);

  // View → URL: keep the address bar in step with the open product.
  useEffect(() => {
    if (activeProductPage) {
      const target = `#/p/${activeProductPage.slug}`;
      if (window.location.hash !== `#${target.slice(1)}`) {
        window.location.hash = target;
      }
    } else if (window.location.hash.startsWith('#/p/')) {
      // Closed via the UI: strip the hash without pushing an extra history entry.
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [activeProductPage]);

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
      <WishlistDrawer />
      <CheckoutModal />
      <SizeGuideModal />
      <StoreLocatorModal />
            <AksMartClubModal />
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
