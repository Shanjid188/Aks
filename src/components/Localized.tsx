import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * `useLocalized` — pick one language for copy that must stay a single line.
 *
 * Most storefront copy used `<Bi/>` (English with the Bangla underneath, or
 * Bangla only when the shopper picks বাংলা). Section headings are different:
 * they were English-only, so showing two languages would change the layout.
 * `t(english, bangla)` returns the shopper's language and nothing else, which
 * keeps the English page byte-identical to before.
 *
 * Usage:  const t = useLocalized();  … {t(content.featuredTitle, content.featuredTitleBn)}
 */
export const useLocalized = (): ((en: string, bn?: string) => string) => {
  const { language } = useLanguage();
  return (en, bn) => (language === 'bn' && bn ? bn : en);
};

/**
 * Same rule as a component, for copy that lives in JSX text.
 * Usage:  <Localized en={content.offersTitle} bn={content.offersTitleBn} />
 */
export const Localized: React.FC<{ en: string; bn?: string }> = ({ en, bn }) => {
  const t = useLocalized();
  return <>{t(en, bn)}</>;
};

/**
 * Fill `{placeholder}` tokens in admin-editable copy, e.g.
 * `On orders above {amount}` → `On orders above ৳2,500`. Unknown tokens are
 * left untouched so an admin typo is visible rather than silently dropped.
 */
export const fillTokens = (text: string, tokens: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (match, name: string) => tokens[name] ?? match);
