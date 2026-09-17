'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/ui/cn';

const REVEAL_AT = 300;
const SCROLL_DURATION_MS = 650;

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

    // Smooth easeInOutCubic curve for elegant fluid ascent. Matikan
    // scroll-behavior:smooth global selama animasi agar tiap frame rAF
    // mendarat tepat tanpa diinterpolasi ulang oleh browser.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY * (1 - ease));

      if (progress < 1) {
        window.requestAnimationFrame(animateScroll);
      } else {
        root.style.scrollBehavior = previousBehavior;
      }
    };

    window.requestAnimationFrame(animateScroll);
  }, []);

  return (
    <>
      <span
        aria-hidden="true"
        style={{ width: `${progress}%` }}
        className="fixed top-0 left-0 z-50 h-0.5 bg-[#b88d3a]"
      />
      <button
        id="btn-back-to-top"
        type="button"
        onClick={scrollToTop}
        inert={!visible}
        aria-label={`Kembali ke atas (${Math.round(progress)}% halaman dibaca)`}
        className={cn(
          'group fixed right-6 bottom-6 z-40 flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a2430] text-[#f4f2ec] shadow-[0_16px_32px_-12px_rgba(26,36,48,0.5)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#8a5f1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88d3a]',
          visible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <ArrowUp
          className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </button>
    </>
  );
}
