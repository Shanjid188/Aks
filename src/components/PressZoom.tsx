import React, { useCallback, useRef, useState } from "react";

export interface PressZoomProps {
  /** Content to zoom — usually an <img> rendered at full size inside a fixed box. */
  children: React.ReactNode;
  /** Zoom level while active (e.g. 1.12 = 12% bigger). */
  scale?: number;
  /** Extra className forwarded to the pressable wrapper. */
  className?: string;
  /** Accessible name for the pressable area. */
  ariaLabel?: string;
  /** Click handler, forwarded (used for thumbnail selection). */
  onClick?: () => void;
  /**
   * `toggle` (default): a press zooms in and it stays zoomed until the next
   * press — the classic "tap to zoom, tap again to zoom out". `hold`: the
   * content zooms only while the pointer is down and resets on release, which
   * is the natural feel for small thumbnails that must also stay selectable.
   */
  mode?: "toggle" | "hold";
}

/**
 * Press-to-zoom: pressing (or tapping) the image zooms it in a little. The
 * pointer is captured so the gesture survives small finger slips, and a quick
 * drag is detected and cancelled so a scroll that starts on the image never
 * leaves it stuck zoomed. Keyboard Enter/Space toggles, Escape zooms out.
 */
export const PressZoom: React.FC<PressZoomProps> = ({
  children,
  scale = 1.12,
  className = "",
  ariaLabel,
  onClick,
  mode = "toggle",
}) => {
  const [scaled, setScaled] = useState(false);
  const startY = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode === "toggle") setScaled((s) => !s);
      else setScaled(true);
      startY.current = e.clientY;
      try {
        const target = e.currentTarget;
        if (typeof target.setPointerCapture === "function") {
          target.setPointerCapture(e.pointerId);
        }
      } catch {
        /* synthetic events have no active pointer to capture */
      }
    },
    [mode]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // A vertical drag that starts on the image is a scroll, not a tap — undo
    // the zoom so scrolling never leaves the picture stuck enlarged.
    if (startY.current !== null && Math.abs(e.clientY - startY.current) > 10) {
      setScaled(false);
      startY.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    startY.current = null;
    if (mode === "hold") setScaled(false);
  }, [mode]);

  const handlePointerCancel = useCallback(() => {
    startY.current = null;
    setScaled(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setScaled((s) => !s);
    } else if (e.key === "Escape") {
      setScaled(false);
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={scaled}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      style={{ transform: scaled ? `scale(${scale})` : undefined }}
      className={`${className} will-change-transform transition-transform duration-150 ease-out`}
    >
      {children}
    </div>
  );
};
