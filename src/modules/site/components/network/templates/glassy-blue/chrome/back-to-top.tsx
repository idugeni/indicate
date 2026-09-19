'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { scrollToTop } from '@/ui/scroll';

export function GlassyBlueBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#1f7cff] text-white shadow-lg transition-colors hover:bg-[#155fd0]"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
