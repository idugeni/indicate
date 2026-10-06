'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { scrollToTop } from '@/ui/scroll';

/**
 * Back-to-top button, coloured by the ambient `--tpl-*` theme variables.
 *
 * @remarks Every template shell sets those variables through
 * `templateThemeStyle`, and `--tpl-on-primary` already resolves to the
 * white the light themes hardcoded, so this needs no per-template props.
 */
export function TemplateBackToTop() {
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
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--tpl-primary)] text-[var(--tpl-on-primary)] shadow-lg transition-colors [transform:translateZ(0)] hover:bg-[var(--tpl-primary-dark)]"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
