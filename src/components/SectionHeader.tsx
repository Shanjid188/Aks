import React from 'react';

interface SectionHeaderProps {
  /** Small uppercase label above the title (icon or text). */
  eyebrow: React.ReactNode;
  /** Tailwind bg class for the pulsing dot next to the eyebrow. */
  accentDotClass?: string;
  title: string;
  subtitle?: string;
  /** Optional right-side slot (e.g. a "View all" pill button). */
  action?: React.ReactNode;
  centered?: boolean;
}

/**
 * Shared home-page section header — big modern e-commerce typography with a
 * hand-drawn squiggle illustration under the title.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  accentDotClass = 'bg-[#D8232A]',
  title,
  subtitle,
  action,
  centered = false,
}) => (
  <div
    className={`flex flex-col ${
      centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
    } gap-5 mb-10 sm:mb-14`}
  >
    <div className="max-w-2xl">
      <div
        className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-[#D8232A] ${
          centered ? 'justify-center' : ''
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${accentDotClass} animate-pulse`} />
        {eyebrow}
      </div>

      <h2 className="mt-2.5 text-[1.9rem] leading-[1.12] sm:text-4xl lg:text-[2.7rem] font-black tracking-tight text-neutral-900">
        {title}
        {/* hand-drawn squiggle accent */}
        <svg
          viewBox="0 0 220 12"
          fill="none"
          aria-hidden="true"
          className={`mt-1.5 h-2.5 w-40 sm:w-56 text-[#D8232A]/70 ${centered ? 'mx-auto' : ''}`}
        >
          <path
            d="M3 9C30 3 55 3 82 7s55 4 82-2 40-3 53 1"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </h2>

      {subtitle && (
        <p className="mt-3.5 text-base sm:text-lg leading-relaxed text-neutral-600">{subtitle}</p>
      )}
    </div>

    {action && <div className="shrink-0">{action}</div>}
  </div>
);