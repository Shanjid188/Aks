import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useRouter } from '../lib/router';
import { ProductDetailPage as ProductDetailComponent } from '../components/ProductDetailPage';
import { Package } from 'lucide-react';

/**
 * Standalone product detail page at /products/:slug.
 *
 * Reuses the existing ProductDetailComponent — it just syncs the URL slug
 * to the shared `activeProductPage` state and renders it here.
 */
export function ProductDetailPage() {
  const { path, navigate } = useRouter();
  const { products, setActiveProductPage } = useStore();

  // Extract slug from "/products/:slug"
  const slug = path.replace(/^\/products\//, '').replace(/\/+$/, '');

  useEffect(() => {
    if (!slug) {
      navigate('/products');
      return;
    }
    const found = products.find((p) => p.slug === slug);
    if (found) {
      setActiveProductPage(found);
      window.scrollTo({ top: 0 });
    } else if (products.length > 0) {
      // Unknown slug — redirect to products page
      navigate('/products');
    }
    // Cleanup on unmount leaves the product active (allows back navigation state)
  }, [slug, products, setActiveProductPage, navigate]);

  const product = products.find((p) => p.slug === slug);
  if (!product) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h1 className="text-xl font-black text-neutral-900">Product not found</h1>
        <p className="mt-2 text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  return <ProductDetailComponent />;
}
