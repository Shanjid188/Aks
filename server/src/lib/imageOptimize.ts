/**
 * Upload-time image optimisation.
 *
 * Admin uploads used to be stored byte-for-byte, so a 6 MB phone photo stayed
 * 6 MB and every storefront visitor downloaded it in full. Sharp (libvips)
 * re-encodes the file to roughly the same pixels at a fraction of the weight.
 *
 * Deliberate limits
 * -----------------
 * • NO cropping. Only `withoutEnlargement`, so the aspect ratio the merchant
 *   uploaded is exactly what is stored — a banner is never silently reshaped.
 * • Transparency survives. PNGs that carry an alpha channel are not flattened
 *   to a solid background, which would ruin product cut-outs and logos.
 * • Small files are passed through untouched. Re-encoding a 40 KB thumbnail
 *   costs quality and saves nothing.
 * • Optimisation is best-effort. If anything goes wrong the original bytes are
 *   stored instead, so an upload can never fail *because* optimisation failed.
 */
import sharp from 'sharp';

/** Longest edge kept, in px. Tall banners/wide products both fit comfortably. */
const MAX_EDGE = 2000;

/** Below this, the original is already efficient — don't touch it. */
const SKIP_BYTES = 60 * 1024;

/** JPEG/WebP quality. High enough that the visual difference is invisible. */
const QUALITY = 82;

export interface OptimizedImage {
  buffer: Buffer;
  ext: 'jpg' | 'png' | 'webp' | 'gif';
  contentType: string;
  width: number | null;
  height: number | null;
  /** True when sharp actually re-encoded, false when the input was passed through. */
  optimized: boolean;
}

/** True when the image carries transparency that must be preserved. */
async function hasAlpha(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer, { limitInputPixels: false }).metadata();
    // PNG can carry an alpha channel; GIFs are inherently indexed/transparent.
    return Boolean(meta.hasAlpha) || meta.format === 'gif';
  } catch {
    return false;
  }
}

/**
 * Re-encode an uploaded image for the web. Never throws: on any failure the
 * original buffer is returned unchanged so the upload still succeeds.
 */
export async function optimizeImage(input: Buffer, sniffedExt: string): Promise<OptimizedImage> {
  const passthrough = (): OptimizedImage => ({
    buffer: input,
    ext: sniffedExt as OptimizedImage['ext'],
    contentType: `image/${sniffedExt === 'jpg' ? 'jpeg' : sniffedExt}`,
    width: null,
    height: null,
    optimized: false,
  });

  // GIF is animated by nature; re-encoding would either drop the animation or
  // balloon the file, so store it as-is.
  if (sniffedExt === 'gif' || input.length <= SKIP_BYTES) return passthrough();

  try {
    const alpha = await hasAlpha(input);

    // Transparency must be kept: choose WebP (alpha) or PNG (alpha) — never a
    // format that would drop it, and never flatten onto a background.
    const target: OptimizedImage['ext'] = alpha ? 'webp' : 'webp';
    const pipeline = sharp(input, { limitInputPixels: false, animated: false })
      // Only downscale — a small image is never blown up, and no crop/resize
      // with different dimensions, so the aspect ratio is preserved exactly.
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });

    const { data, info } = await pipeline
      .webp({ quality: QUALITY, effort: 4, alphaQuality: 100 })
      .toBuffer({ resolveWithObject: true });

    // Never store something bigger than the original (tiny/odd inputs can do this).
    if (data.length >= input.length) return passthrough();

    return {
      buffer: data,
      ext: target,
      contentType: 'image/webp',
      width: info.width ?? null,
      height: info.height ?? null,
      optimized: true,
    };
  } catch {
    return passthrough();
  }
}