import { useEffect, useState } from 'react';

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
