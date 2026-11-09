'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

// Suppress React 19 false-positive warning for SSR inline theme scripts in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable smooth scroll / Lenis inside admin routes, chart workspaces, or sub-pane routes
    // so trackpad two-finger gestures, native overflows, and chart panning work freely
    if (
      pathname?.startsWith('/admin') ||
      pathname?.startsWith('/trading') ||
      pathname?.startsWith('/flexStrategy') ||
      pathname?.startsWith('/workspace')
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    let animationFrameId: number;

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}
