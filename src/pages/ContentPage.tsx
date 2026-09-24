import React, { useEffect, useState } from 'react';
import { dataLoader } from '../lib/dataLoader';
import { matchRoute, navigate, useRouter } from '../lib/router';
import { applySeo, claimSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { useSiteContent } from '../context/SiteContentContext';
import { ArrowLeft } from 'lucide-react';
import type { ContentPageData } from '../data/pages';

/**
 * Renders a DB-driven content page (About, Contact, policies…).
 *
 * Bodies are plain text with a deliberately tiny syntax — no markdown library
 * is used anywhere in this app:
 *   "## "    → section heading
 *   "- "     → bullet list
 *   blank    → new block (paragraph)
 */
function renderBody(body: string): React.ReactNode[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

      if (lines[0].startsWith('## ')) {
        return (
          <h2 key={i} className="mt-8 first:mt-0 text-lg sm:text-xl font-black tracking-tight text-neutral-900">
            {lines[0].slice(3)}
          </h2>
        );
      }

      if (lines.every((l) => l.startsWith('- '))) {
        return (
          <ul key={i} className="space-y-2">
            {lines.map((l, j) => (
              <li key={j} className="flex gap-2.5 text-sm sm:text-base leading-relaxed text-neutral-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8232A]/70" />
                <span>{l.slice(2)}</span>
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p key={i} className="text-sm sm:text-base leading-relaxed text-neutral-600">
          {lines.join(' ')}
        </p>
      );
    });
}

export const ContentPage: React.FC = () => {
  const { path } = useRouter();
  const { language } = useLanguage();
  const { storeName } = useSiteContent();
  const slug = matchRoute('/:slug', path)?.slug ?? '';

  const [page, setPage] = useState<ContentPageData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setPage(undefined);
    dataLoader.loadPage(slug).then((loaded) => {
      if (!cancelled) setPage(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // This route owns its meta tags — see src/lib/seo.ts.
  useEffect(() => {
    if (!page) return;
    claimSeo(path);
    const firstParagraph = page.body.split(/\n{2,}/).map((b) => b.trim()).find((b) => b && !b.startsWith('##') && !b.startsWith('- '));
    applySeo({
      title: page.seoTitle || `${page.title} — ${storeName}`,
      description: page.seoDescription || firstParagraph?.replace(/\n/g, ' ') || '',
      type: 'article',
    });
  }, [page, path, storeName]);

  const showBn = language === 'bn';
  const title = showBn && page?.titleBn ? page.titleBn : page?.title ?? '';
  const body = showBn && page?.bodyBn ? page.bodyBn : page?.body ?? '';

  if (page === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#D8232A]" />
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="bg-neutral-50/60 min-h-[60vh] py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">Page not found</h1>
          <p className="mt-3 text-sm text-neutral-600">
            The page “{slug}” does not exist or is not published.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D8232A] text-white text-sm font-bold hover:bg-[#B91C1C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50/60 min-h-screen py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-[#D8232A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>

        <article className="mt-4 bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">{title}</h1>
          <div className="mt-2.5 h-1 w-16 rounded-full bg-[#D8232A]/70" />
          <div className="mt-6 space-y-4">{renderBody(body)}</div>
        </article>
      </div>
    </div>
  );
};
