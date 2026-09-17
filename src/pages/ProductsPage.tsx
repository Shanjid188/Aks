import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductGrid } from '../components/ProductGrid';
import { useRouter } from '../lib/router';

/**
 * Dedicated All Products page at /products (and /category/:slug).
 * Reuses the existing ProductGrid so search, filters, sort and the
 * 2/3/4-column responsive grid stay identical to the home catalog.
 */
export function ProductsPage() {
  const { path } = useRouter();
  const { setFilters } = useStore();

  // /category/:slug → filter by the matching top-level division/brand.
  React.useEffect(() => {
    const catMatch = path.match(/^\/category\/([^/]+)$/);
    if (catMatch) {
      const category = decodeURIComponent(catMatch[1]);
      setFilters((f) => ({ ...f, category: category as never, subcategory: 'All', searchQuery: '' }));
    } else if (path === '/products') {
      // Entering the plain catalog resets the category but keeps any search term.
      setFilters((f) => ({ ...f, subcategory: 'All' }));
    }
  }, [path, setFilters]);

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 py-4 sm:py-8">
      <ProductGrid />
    </div>
  );
}
