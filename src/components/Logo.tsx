import React from 'react';
import aksLogo from '../assets/images/AKS.logo.jpg';

interface LogoProps {
  /** Tailwind size/shape classes, e.g. "h-10 w-10 rounded-md" */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * Official AKS Mart brand logo.
 * Single source of truth — use this everywhere the brand mark is displayed
 * instead of hardcoding "AKS" text.
 */
export const Logo: React.FC<LogoProps> = ({ className = 'h-10 w-10', alt = 'AKS Mart Logo' }) => {
  return (
    <img
      src={aksLogo}
      alt={alt}
      draggable={false}
      className={`object-cover select-none ${className}`}
    />
  );
};

export default Logo;
