import type { ReactNode } from 'react';
import { SiteHeader } from '@/modules/site/components/layout/site-header';
import { CallToAction, SiteFooter } from '@/modules/site/components/layout/site-footer';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';

/** Server shell: only the header ships client JS; making this a client component would bundle every page. */
export function SiteShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-bg text-paper antialiased">
      <a href="#main-content" className="fixed left-4 top-[-5rem] z-50 rounded border border-hairline-strong bg-bg-raised-2 px-4 py-3 text-paper transition-[top] duration-180 focus:top-4">
        Lewati ke konten
      </a>

      <SiteHeader />

      <main id="main-content" className="relative">
        {children}
      </main>

      <SiteFooter />
      <BackToTop />
    </div>
  );
}

export { CallToAction };