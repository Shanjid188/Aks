import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

/** Resolve the repo-root public/images folder regardless of where the server was started. */
function resolvePublicImagesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '..', 'public', 'images'),
    path.resolve(process.cwd(), 'public', 'images'),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (found) return found;
  // Fallback (should not normally happen): create next to cwd parent
  const fallback = candidates[0];
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

const UPLOAD_DIR = path.join(resolvePublicImagesDir(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAGIC_CHECKS: Array<(buf: Buffer) => boolean> = [
  (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8, // JPEG
  (b) => b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, // PNG
  (b) => b.length > 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46, // GIF
  (b) =>
    b.length > 12 &&
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP', // WebP
];

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

/**
 * ADMIN: upload an image from the admin panel.
 * Body: { name?: string, data: string } — `data` is a data-URL ("data:image/jpeg;base64,…")
 * or a bare base64 payload. Saves into <repo>/public/images/uploads and returns a
 * public web path usable by both storefront (/images/uploads/x.jpg) and admin preview.
 */
router.post(
  '/admin/upload',
  requirePermission(PERM.PRODUCTS_UPLOAD),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as { name?: string; data?: string };
    const raw = typeof body.data === 'string' ? body.data.trim() : '';
    if (!raw) {
      return res.status(400).json({ error: 'No image data received' });
    }

    let mime = '';
    let b64 = raw;
    const dataUrlMatch = /^data:([^;,]+);base64,(.*)$/s.exec(raw);
    if (dataUrlMatch) {
      mime = dataUrlMatch[1].toLowerCase();
      b64 = dataUrlMatch[2];
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid image data (bad base64)' });
    }
    if (!buf || buf.length === 0) {
      return res.status(400).json({ error: 'Empty image file' });
    }
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Image too large — maximum 12 MB' });
    }

    // Sniff real type from magic bytes (never trust the client-supplied mime alone)
    const isJpeg = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50;
    const isGif = buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49;
    const isWebp =
      buf.length > 12 &&
      buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buf.subarray(8, 12).toString('latin1') === 'WEBP';

    const sniffedExt = isJpeg ? 'jpg' : isPng ? 'png' : isGif ? 'gif' : isWebp ? 'webp' : null;
    if (!sniffedExt) {
      return res.status(400).json({ error: 'File is not a valid JPG/PNG/WebP/GIF image' });
    }
    const declaredExt = mime ? EXT_BY_MIME[mime] : undefined;
    if (declaredExt && declaredExt !== sniffedExt) {
      return res.status(400).json({ error: 'File content does not match its declared type' });
    }

    const base = (body.name || 'image')
      .replace(/\.[^.]*$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'image';

    const filename = `${base}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${sniffedExt}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);

    console.log(`[upload] saved ${filename} (${Math.round(buf.length / 1024)} KB)`);
    return res.status(201).json({ url: `/images/uploads/${filename}`, size: buf.length });
  })
);

export default router;