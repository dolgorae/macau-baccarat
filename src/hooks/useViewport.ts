import { useEffect, useRef, useState } from 'react';

/** Below this width the portrait mobile layout is used. */
export const MOBILE_BREAKPOINT = 768;

export function useViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return { ...size, mobile: size.w < MOBILE_BREAKPOINT };
}

/*
 * Game tables are drawn at a fixed design size and scaled to the window.
 * PC: fit a 900px-tall layout to the window height, stretching the width.
 * Mobile (portrait): fit a 390px-wide layout to the window width, stretching the height —
 * or, on short screens, fit 740px of height so nothing spills off the bottom.
 */
const DESIGN_HEIGHT = 900;
const MIN_DESIGN_WIDTH = 1280;
const MOBILE_DESIGN_WIDTH = 390;
const MOBILE_MIN_HEIGHT = 740;

/** Scale plus the design-space width/height for the current window. */
export function useTableFit() {
  const { w, h, mobile } = useViewport();
  const scale = mobile ? Math.min(w / MOBILE_DESIGN_WIDTH, h / MOBILE_MIN_HEIGHT) : Math.min(h / DESIGN_HEIGHT, w / MIN_DESIGN_WIDTH);
  return { mobile, scale, width: w / scale, height: h / scale };
}

/** Layout size of an element (unaffected by CSS transforms), kept up to date with a ResizeObserver. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
