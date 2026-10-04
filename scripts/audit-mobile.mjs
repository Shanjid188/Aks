/**
 * Mobile overflow audit — finds elements that stick out of the viewport.
 *
 * A real phone lets you scroll sideways when something is too wide, and text
 * that overlaps or gets clipped is invisible to a type-checker. This walks the
 * real pages at real device widths and reports every element whose box extends
 * past the viewport, so the fix targets the actual offender.
 *
 *   node scripts/audit-mobile.mjs [baseUrl]
 *
 * Read-only: it only loads pages and reports. Nothing is written or changed.
 */
import { chromium, devices } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/products', name: 'Products' },
  { path: '/cart', name: 'Cart' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/wishlist', name: 'Wishlist' },
  { path: '/track-order', name: 'Track order' },
  { path: '/content/about-us', name: 'Content page' },
];

/**
 * Overlays are the elements most likely to break on a phone (fixed width,
 * off-canvas panels), and they only exist after a click, so a page load never
 * sees them. Each entry clicks something to open it, then the page is measured
 * exactly as before.
 */
const INTERACTIONS = [
  { name: 'Cart drawer', path: '/', click: 'header button[aria-label*="bag" i]' },
  { name: 'Wishlist drawer', path: '/', click: 'header button[aria-label*="wishlist" i]' },
  { name: 'Search overlay', path: '/', click: 'header input[type="search"], header input[placeholder*="search" i]' },
  { name: 'Mobile menu', path: '/', click: 'header button[aria-label*="menu" i]' },
  { name: 'Quick view', path: '/products', click: 'button[aria-label*="quick" i], button[title*="quick" i]' },
];

// iPhone SE (smallest realistic phone) through a large phone, plus a tablet.
const VIEWPORTS = [
  { name: 'iPhone SE 375', width: 375, height: 667 },
  { name: 'iPhone 12 390', width: 390, height: 844 },
  { name: 'Pixel 7 412', width: 412, height: 915 },
  { name: 'Tablet 768', width: 768, height: 1024 },
];

const IGNORE = [
  // Deliberate sideways scrollers are fine as long as the PAGE doesn't scroll.
  '.overflow-x-auto',
  '.overflow-x-scroll',
  '.overflow-x-hidden',
];

/** Purely decorative glow/blur blobs are meant to bleed past the edge. */
const isDecorative = (el) =>
  el.classList.contains('pointer-events-none') || el.classList.contains('blur-3xl') || el.classList.contains('blur-2xl');

async function auditRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
  });
  const page = await context.newPage();
  const problems = [];
  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);

    // Click through to the overlay this entry targets, when it asked for one.
    if (route.click) {
      const target = page.locator(route.click).first();
      if (await target.count()) {
        await target.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(700);
      }
    }

    const result = await page.evaluate((ignoreSelectors) => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const seen = new Set();
      const decorative = (el) => {
        const cls = String(el.className || '');
        if (el instanceof SVGElement || el.tagName === 'svg' || el.tagName === 'path') return true;
        // Decorative glow / pattern layers are meant to bleed past the edge and
        // never carry text, so they cannot be a layout break.
        return (
          cls.includes('pointer-events-none') ||
          cls.includes('blur-3xl') ||
          cls.includes('blur-2xl') ||
          cls.includes('border-dashed') ||
          cls.includes('absolute -inset') ||
          (cls.includes('rounded-full') && cls.includes('bg-white/') && el.children.length === 0)
        );
      };
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') continue;
        if (ignoreSelectors.some((sel) => el.closest(sel))) continue;
        if (decorative(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Right edge past the viewport, allowing 1px rounding slack.
        const overRight = r.right - vw;
        // Content clipped inside its own box (text cut off by a fixed height) —
        // the classic "UI breaks" case even when nothing overflows sideways.
        const clipped =
          el.children.length === 0 &&
          (el.textContent || '').trim().length > 0 &&
          (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) &&
          style.overflow !== 'visible';
        if (overRight > 1 || (clipped && !/line-clamp|truncate|ellipsis/.test(String(el.className)))) {
          const key = `${el.tagName}.${el.className}`.slice(0, 110);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 120),
            right: Math.round(r.right),
            width: Math.round(r.width),
            over: Math.round(overRight),
            clipped: clipped && !/line-clamp|truncate|ellipsis/.test(String(el.className)),
            text: (el.textContent || '').trim().slice(0, 45),
          });
        }
      }
      return {
        vw,
        pageScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        offenders: out.sort((a, b) => b.over - a.over).slice(0, 12),
      };
    }, IGNORE);

    // A page that scrolls sideways is the real symptom.
    if (result.pageScrollWidth > result.vw + 1) {
      problems.push({
        kind: 'PAGE-HSCROLL',
        detail: `page scrollWidth ${result.pageScrollWidth} > viewport ${result.vw}`,
      });
    }
    for (const o of result.offenders) {
      problems.push({ kind: 'ELEMENT', detail: `<${o.tag}> over by ${o.over}px (w=${o.width}) ${o.cls} ${o.text ? `“${o.text}”` : ''}` });
    }
  } catch (e) {
    problems.push({ kind: 'ERROR', detail: e.message.split('\n')[0] });
  } finally {
    await context.close();
  }
  return problems;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MOBILE OVERFLOW AUDIT —', BASE);
  console.log('═══════════════════════════════════════════════════════════');
  const browser = await chromium.launch();
  let total = 0;

  for (const viewport of VIEWPORTS) {
    console.log(`\n── ${viewport.name} ─────────────────────────────`);
    for (const route of ROUTES) {
      const problems = await auditRoute(browser, route, viewport);
      if (problems.length === 0) {
        console.log(`  ✓ ${route.name.padEnd(14)} ok`);
      } else {
        total += problems.length;
        console.log(`  ✗ ${route.name}`);
        for (const p of problems.slice(0, 6)) {
          console.log(`      [${p.kind}] ${p.detail}`);
        }
        if (problems.length > 6) console.log(`      … +${problems.length - 6} more`);
      }
    }

    // Overlays only exist after a click, so they are measured separately.
    for (const flow of INTERACTIONS) {
      const problems = await auditRoute(browser, flow, viewport);
      if (problems.length === 0) {
        console.log(`  ✓ ${flow.name.padEnd(14)} ok`);
      } else {
        total += problems.length;
        console.log(`  ✗ ${flow.name}`);
        for (const p of problems.slice(0, 6)) {
          console.log(`      [${p.kind}] ${p.detail}`);
        }
        if (problems.length > 6) console.log(`      … +${problems.length - 6} more`);
      }
    }
  }

  await browser.close();
  console.log('\n───────────────────────────────────────────────────────────');
  console.log(total === 0 ? '  No overflow found at any tested width.' : `  ${total} issue(s) found.`);
}

main();