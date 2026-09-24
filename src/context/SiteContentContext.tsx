import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataLoader } from '../lib/dataLoader';
import { DEFAULT_SITE_CONTENT, DEFAULT_SITE_SEO, DEFAULT_STORE_NAME, DEFAULT_TRENDING_SEARCHES } from '../data/siteContent';
import type { SiteContent, SiteSeo } from '../data/siteContent';

interface SiteContentValue {
  /** Homepage / header copy — bundled defaults until the API answers. */
  content: SiteContent;
  /** Trending search keywords shown in the header search panel. */
  trendingSearches: string[];
  /** Site-wide SEO defaults (Admin → Settings → SEO). */
  seo: SiteSeo;
  /** Store name from settings, for page titles. */
  storeName: string;
}

const FALLBACK: SiteContentValue = {
  content: DEFAULT_SITE_CONTENT,
  trendingSearches: DEFAULT_TRENDING_SEARCHES,
  seo: DEFAULT_SITE_SEO,
  storeName: DEFAULT_STORE_NAME,
};

const SiteContentContext = createContext<SiteContentValue>(FALLBACK);

/**
 * Loads the admin-editable storefront copy once (Admin → Storefront → Homepage)
 * and shares it with every section, so the page makes a single settings request.
 */
export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = useState<SiteContentValue>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadSiteContent().then((loaded) => {
      if (!cancelled) setValue(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
};

/** Storefront copy for the current render — always populated. */
export const useSiteContent = (): SiteContentValue => useContext(SiteContentContext);
