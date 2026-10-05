/**
 * flyToCart — one-shot "product flies into the bag" ghost animation.
 *
 * Clones the product thumbnail into a fixed-position element and arcs it from
 * the clicked control into the bag on the right edge (FloatingCart), falling
 * back to the header bag button, then the viewport's right edge.
 *
 * - Pure DOM + Web Animations API: no React state, no re-render, works from
 *   any card (grid, home, modals) without a portal.
 * - Honours prefers-reduced-motion: the ghost is skipped entirely — the
 *   FloatingCart badge pop still acknowledges the add.
 * - Sits above toasts/drawers (z-index 100) but never intercepts pointer
 *   events, so the card stays clickable mid-flight.
 */

/** Prefer the edge-pinned bag, then the header bag, else the right edge. */
const resolveTarget = (): { x: number; y: number } => {
  const floating = document.querySelector<HTMLElement>('[data-floating-cart]');
  const header = document.querySelector<HTMLElement>('[data-header-cart]');
  for (const el of [floating, header]) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // Zero-size (e.g. display:none on mobile) → not a usable target, keep looking.
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  }
  return { x: window.innerWidth - 56, y: window.innerHeight * 0.55 };
};

/**
 * Launch a ghost of `imageSrc` from `source` (usually the clicked button)
 * into the shopping bag. Safe to call on every add — each ghost is
 * independent and cleans itself up on finish.
 */
export const flyToCart = (source: Element | null | undefined, imageSrc?: string): void => {
  if (!source || typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const from = source.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return;
  const to = resolveTarget();

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;

  const startTransform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(1) rotate(0deg)`;

  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:64px',
    'height:64px',
    'border-radius:16px',
    'overflow:hidden',
    'border:2px solid #fff',
    'background:#f5f5f5',
    'box-shadow:0 12px 28px -8px rgba(15,23,42,0.45)',
    'pointer-events:none',
    'z-index:100',
    'will-change:transform,opacity',
    `transform:${startTransform}`,
  ].join(';');

  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = '';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    ghost.appendChild(img);
  }

  document.body.appendChild(ghost);

  // Mid-flight control point sits above the straight line so the path reads
  // as a toss ("লাফাতে লাফাতে"), not a slide across the page.
  const midX = startX + (to.x - startX) * 0.5;
  const midY = Math.min(startY, to.y) - 60;

  const anim = ghost.animate(
    [
      { transform: startTransform, opacity: 1, offset: 0 },
      {
        transform: `translate(${midX}px, ${midY}px) translate(-50%, -50%) scale(0.55) rotate(-8deg)`,
        opacity: 1,
        offset: 0.55,
      },
      {
        transform: `translate(${to.x}px, ${to.y}px) translate(-50%, -50%) scale(0.12) rotate(6deg)`,
        opacity: 0.7,
        offset: 1,
      },
    ],
    { duration: 720, easing: 'cubic-bezier(0.33, 0.8, 0.35, 1)', fill: 'forwards' }
  );

  const cleanup = () => ghost.remove();
  anim.addEventListener('finish', cleanup);
  anim.addEventListener('cancel', cleanup);
};

export default flyToCart;
