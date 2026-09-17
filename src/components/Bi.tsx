import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Bi — bilingual label helper for the storefront.
 *
 * Three rendering modes:
 *  - language = "en"  → English + Bangla both (mixed, Bangla subtle below)
 *  - language = "bn"  → Bangla only
 *
 * Usage:  <Bi en="Add to Cart" bn="কার্টে যোগ করুন" />
 */
export const Bi: React.FC<{
  en: React.ReactNode;
  bn?: React.ReactNode;
  className?: string;
  bnClassName?: string;
}> = ({ en, bn, className, bnClassName }) => {
  const { language } = useLanguage();
  if (language === 'bn' && bn) {
    return (
      <span className={`inline-flex items-baseline ${className ?? ''}`}>
        <span className={bnClassName}>{bn}</span>
      </span>
    );
  }
  if (!bn) return <span className={className}>{en}</span>;
  return (
    <span className={`inline-flex flex-col leading-tight ${className ?? ''}`}>
      <span>{en}</span>
      <span className={`text-[0.82em] opacity-60 ${bnClassName ?? ''}`}>{bn}</span>
    </span>
  );
};