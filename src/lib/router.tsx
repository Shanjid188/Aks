import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Minimal history-API router — no external dependency.
 *
 * Routes used by the storefront:
 *   /                    Home
 *   /products            All products
 *   /products/:slug      Product detail
 *   /category/:slug      Category listing
 *   /search?q=           Search results
 *   /cart                Cart page
 *   /checkout            Checkout page
 *   /order-success/:id   Order confirmation
 *   /track-order         Track an order
 *   /:slug               Content page (About, Contact, policies…) from the DB
 *
 * Deep links work in production because the API server falls back to
 * index.html for any non-/api path. robots.txt and sitemap.xml are served by
 * the API itself (server/src/routes/seo.ts), not by this router.
 */

export interface RouteState {
  path: string;
  query: URLSearchParams;
}

interface RouterContextValue extends RouteState {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/** Module-level escape hatch so non-component code (context actions) can navigate. */
let externalNavigate: ((to: string) => void) | null = null;

/** Navigate from anywhere (event handlers, context, etc.). */
export function navigate(to: string): void {
  if (externalNavigate) {
    externalNavigate(to);
  } else {
    // Router not mounted yet — fall back to a full page load.
    window.location.href = to;
  }
}

function currentPath(): string {
  return window.location.pathname || '/';
}

function currentQuery(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(currentPath);
  const [query, setQuery] = useState(() => currentQuery());

  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      setQuery(currentQuery());
    };
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) {
      history.replaceState(null, '', to);
    } else {
      history.pushState(null, '', to);
    }
    setPath(currentPath());
    setQuery(currentQuery());
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ path, query, navigate }), [path, query, navigate]);

  // Expose the context navigate to non-component callers.
  useEffect(() => {
    externalNavigate = navigate;
    return () => {
      externalNavigate = null;
    };
  }, [navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <RouterProvider>');
  return ctx;
}

/** Anchor that navigates through the router instead of a full page reload. */
export function Link({
  to,
  className,
  children,
  onClick,
  ariaLabel,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  /** Standard React list key — accepted so <Link key={...}> type-checks. */
  key?: React.Key;
}) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        // Let modified clicks (new tab etc.) behave natively.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/** Match "/products/abc" against "/products/:slug" → { slug: "abc" } or null. */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const pParts = path.replace(/\/+$/, '') || '/';
  const aParts = pParts.split('/').filter(Boolean);
  const bParts = pattern.split('/').filter(Boolean);
  if (aParts.length !== bParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < aParts.length; i++) {
    if (bParts[i].startsWith(':')) {
      params[bParts[i].slice(1)] = decodeURIComponent(aParts[i]);
    } else if (aParts[i] !== bParts[i]) {
      return null;
    }
  }
  return params;
}
