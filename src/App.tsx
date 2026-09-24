import React from 'react';
import { StoreProvider } from './context/StoreContext';
import { SiteContentProvider } from './context/SiteContentContext';
import { RouterProvider, useRouter, matchRoute } from './lib/router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PromoBar } from './components/PromoBar';
import { ToastContainer } from './components/ToastContainer';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { AksMartClubModal } from './components/AksMartClubModal';
import { ShoeFinderModal } from './components/ShoeFinderModal';
import { CompareModal } from './components/CompareModal';

import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { TrackOrderPage } from './pages/TrackOrderPage';

function RouteRenderer() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <HomePage />;
  if (path === '/products') return <ProductsPage />;
  if (matchRoute('/products/:slug', path)) return <ProductDetailPage />;
  if (matchRoute('/category/:slug', path)) return <ProductsPage />;
  if (path === '/cart') return <CartPage />;
  if (path === '/checkout') return <CheckoutPage />;
  if (matchRoute('/order-success/:id', path)) return <OrderSuccessPage />;
  if (path === '/track-order') return <TrackOrderPage />;

  return <HomePage />;
}

function MainAppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans antialiased selection:bg-[#D8232A] selection:text-white">
      <Header />
      <main className="flex-1">
        <RouteRenderer />
      </main>
      <PromoBar />
      <Footer />

      {/* Global modals & drawers */}
      <ProductDetailModal />
      <CartDrawer />
      <WishlistDrawer />
      <SizeGuideModal />
      <AksMartClubModal />
      <ShoeFinderModal />
      <CompareModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <StoreProvider>
        <SiteContentProvider>
          <MainAppContent />
        </SiteContentProvider>
      </StoreProvider>
    </RouterProvider>
  );
}
