import React, { Suspense, lazy, useEffect } from 'react';
import { StoreProvider } from './context/StoreContext';
import { SiteContentProvider, useSiteContent } from './context/SiteContentContext';
import { applyDefaultSeo } from './lib/seo';
import { RouterProvider, useRouter, matchRoute } from './lib/router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { SkeletonBlock } from './components/Skeleton';
import { HomePage } from './pages/HomePage';

/*
 * Only the home page is part of the first download. Every other page and every
 * overlay is fetched the moment it is actually needed, so the storefront paints
 * straight away instead of waiting for the whole shop (catalog, cart, checkout,
 * tracking, modals …) to arrive first.
 */
const CartDrawer = lazy(() => import('./components/CartDrawer').then((m) => ({ default: m.CartDrawer })));
// Edge-pinned floating cart. Only appears once the cart has items, so it stays out
// of the way (and out of the bundle path) for shoppers who never add anything.
const FloatingCart = lazy(() => import('./components/FloatingCart').then((m) => ({ default: m.FloatingCart })));
// WhatsApp chat bubble — same right-edge rail, mounted directly (no lazy) so the
// help channel is never delayed by the drawer/modals chunk or an empty cart.
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
const WishlistDrawer = lazy(() => import('./components/WishlistDrawer').then((m) => ({ default: m.WishlistDrawer })));
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then((m) => ({ default: m.ProductDetailModal })));
const SizeGuideModal = lazy(() => import('./components/SizeGuideModal').then((m) => ({ default: m.SizeGuideModal })));
const AksMartClubModal = lazy(() => import('./components/AksMartClubModal').then((m) => ({ default: m.AksMartClubModal })));
const ShoeFinderModal = lazy(() => import('./components/ShoeFinderModal').then((m) => ({ default: m.ShoeFinderModal })));
const CompareModal = lazy(() => import('./components/CompareModal').then((m) => ({ default: m.CompareModal })));

const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })));
const ContentPage = lazy(() => import('./pages/ContentPage').then((m) => ({ default: m.ContentPage })));

/** Shown for the split second while an on-demand page arrives. */
const PageFallback: React.FC = () => (
  <div className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
    <SkeletonBlock className="h-8 w-52" />
    <SkeletonBlock className="h-4 w-80" />
    <SkeletonBlock className="h-[320px]" />
  </div>
);

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
  if (matchRoute('/:slug', path)) return <ContentPage />;

  return <HomePage />;
}

export function SeoTags() {
  const { path } = useRouter();
  const { seo } = useSiteContent();

  // App-level SEO fallback. Child pages run their effects first and call
  // claimSeo(path) when they own the tags, so this never overwrites them.
  useEffect(() => {
    applyDefaultSeo(path, seo);
  }, [path, seo]);

  return null;
}

function MainAppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans antialiased selection:bg-[#D8232A] selection:text-white">
      <SeoTags />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <RouteRenderer />
        </Suspense>
      </main>
      <Footer />

      {/* Global modals & drawers — on demand, so they never delay the page. */}
      <Suspense fallback={null}>
        <ProductDetailModal />
        <CartDrawer />
        <WishlistDrawer />
        <SizeGuideModal />
        <AksMartClubModal />
        <ShoeFinderModal />
        <CompareModal />
      </Suspense>
      {/* Floating cart — own Suspense so it never waits on the drawer/modals chunk. */}
      <Suspense fallback={null}>
        <FloatingCart />
      </Suspense>
      {/* WhatsApp bubble — same right-edge rail, stacked just below the cart. */}
      <FloatingWhatsApp />
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
