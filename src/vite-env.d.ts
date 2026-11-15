/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Meta Pixel (dataset) ID — public, compiled into the bundle. */
  readonly NEXT_PUBLIC_META_PIXEL_ID?: string;
  /** GA4 measurement ID (G-XXXXXXX) — public, compiled into the bundle. */
  readonly NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_USE_API?: string;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
