'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/ui/cn';

const REVEAL_AT = 300;
const SCROLL_DURATION_MS = 650;
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY;

          setVisible(currentScroll > REVEAL_AT);

          if (totalHeight > 0) {
            const currentProgress = (currentScroll / totalHeight) * 100;
            setProgress(Math.min(Math.max(currentProgress, 0), 100));
          } else {
            setProgress(0);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    const startY = window.scrollY;
    if (startY === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const startTime = performance.now();

    // Smooth easeInOutCubic curve for elegant fluid ascent.
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY * (1 - ease));

      if (progress < 1) {
        window.requestAnimationFrame(animateScroll);
      }
    };

    window.requestAnimationFrame(animateScroll);
  }, []);

  const strokeDashoffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

  return (
    <button
      id="btn-back-to-top"
      type="button"
      onClick={scrollToTop}
      inert={!visible}
      aria-label={`Kembali ke atas (${Math.round(progress)}% halaman dibaca)`}
      className={cn(
        'group fixed right-6 bottom-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-brass/40 bg-bg-raised text-brass shadow-lg transition-all duration-200 hover:bg-brass hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      {/* Circular progress meter */}
      <svg
        className="absolute inset-0 h-full w-full -rotate-90 p-1"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          className="stroke-brass/20 group-hover:stroke-bg/30"
          strokeWidth="2.5"
          fill="transparent"
        />
        {/* Animated progress ring */}
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          className="stroke-brass transition-all duration-150 group-hover:stroke-bg"
          strokeWidth="2.5"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center arrow icon */}
      <ArrowUp
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5"
        aria-hidden="true"
      />
    </button>
  );
}
