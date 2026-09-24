import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler } from '../lib/auth.ts';

const router = Router();

/** Absolute origin of the deployed site (works locally and behind a proxy/VPS). */
function origin(req: { protocol: string; get: (name: string) => string | undefined }): string {
  const host = req.get('host');
  return host ? `${req.protocol}://${host}` : '';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Public: sitemap.xml — static routes plus every live product, division and
 * published content page. Generated on request so it never goes stale.
 */
router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const base = origin(req);
    const [products, categories, pages] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.contentPage.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);

    const urls: { loc: string; lastmod?: string; priority: string }[] = [
      { loc: `${base}/`, priority: '1.0' },
      { loc: `${base}/products`, priority: '0.9' },
    ];
    for (const c of categories) {
      urls.push({ loc: `${base}/category/${c.slug}`, lastmod: c.updatedAt.toISOString(), priority: '0.8' });
    }
    for (const p of products) {
      urls.push({ loc: `${base}/products/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: '0.7' });
    }
    for (const p of pages) {
      urls.push({ loc: `${base}/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: '0.5' });
    }

    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>` +
          (u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '') +
          `\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
    );
  })
);

/** Public: robots.txt — crawlers may index the store, cart/checkout excluded. */
router.get('/robots.txt', (req, res) => {
  const base = origin(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /cart',
      'Disallow: /checkout',
      'Disallow: /order-success/',
      'Disallow: /admin',
      '',
      `Sitemap: ${base}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

export default router;
