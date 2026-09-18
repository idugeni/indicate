import type { ReactNode } from 'react';
import { LandingHeader } from '@/modules/site/components/landing/landing-header';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import { SiteFooter } from '@/modules/site/components/layout/site-footer';

export function LandingShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f2ec] font-sans text-[#1a2430] antialiased [color-scheme:light]">
      <a
        href="#konten-utama"
        className="fixed top-[-5rem] left-4 z-[60] rounded-md border border-[#d8d3c4] bg-white px-4 py-3 text-sm font-medium text-[#1a2430] shadow-lg transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten utama
      </a>
      <LandingHeader />
      <main id="konten-utama">{children}</main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
