import React from 'react';
import { Link } from '../lib/router';
import { ArrowRight } from 'lucide-react';

/**
 * SectionAction — the one "view all" button used by every home-page section.
 *
 * Before this existed each section drew its own right-hand link: three were
 * bare text with an arrow, the divisions rail had a dark pill and the promo
 * gallery had another flavour again, so the page never looked finished. This
 * component is that single source of truth — a dark rounded pill with the arrow
 * sitting in its own bubble, which turns brand-red and lifts on hover.
 *
 * Rendering follows the destination:
 *   `to`      → internal SPA route (spa <Link>)
 *   `href`    → external URL (opens in a new tab)
 *   `onClick` → a real <button> (used when a filter has to be applied first)
 */
interface SectionActionProps {
  children: React.ReactNode;
  /** Internal route, e.g. "/products". */
  to?: string;
  /** External URL — opens in a new tab. */
  href?: string;
  /** Click handler for sections that set filters before navigating. */
  onClick?: () => void;
  /** Accessible label for icon-only / link-style usage. */
  ariaLabel?: string;
  className?: string;
}

/** Shared pill skin — identical on every section so the page reads as one design. */
const pillClass =
  'group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-neutral-900 py-2.5 pl-5 pr-2.5 ' +
  'text-sm font-bold text-white shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-900/5 ' +
  'transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#D8232A] hover:shadow-xl ' +
  'hover:shadow-[#D8232A]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8232A]/45';

/** Arrow in its own bubble — fills white and turns brand-red on hover. */
const arrowBubble = (
  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 transition-colors duration-300 group-hover:bg-white">
    <ArrowRight className="h-3.5 w-3.5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#D8232A]" />
  </span>
);

export const SectionAction: React.FC<SectionActionProps> = ({
  children,
  to,
  href,
  onClick,
  ariaLabel,
  className,
}) => {
  const classes = className ? `${pillClass} ${className}` : pillClass;
  const inner = (
    <>
      <span className="whitespace-nowrap">{children}</span>
      {arrowBubble}
    </>
  );

  if (to) {
    return (
      <Link to={to} ariaLabel={ariaLabel} className={classes}>
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel} className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${classes} cursor-pointer`}>
      {inner}
    </button>
  );
};
