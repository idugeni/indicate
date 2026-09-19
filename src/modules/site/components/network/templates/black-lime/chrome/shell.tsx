import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeHeader } from '@/modules/site/components/network/templates/black-lime/chrome/site-header';
import { BlackLimeFooter } from '@/modules/site/components/network/templates/black-lime/chrome/site-footer';
import { BlackLimeBackToTop } from '@/modules/site/components/network/templates/black-lime/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman black-lime — perubahan chrome cukup di sini.
 */
export function BlackLimeShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0c07] font-sans text-slate-100 antialiased" data-template="black-lime">
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-[#c5f82a] px-4 py-3 font-sans text-sm font-bold text-[#0a0c07] transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <BlackLimeHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <BlackLimeFooter site={site} />
      <BlackLimeBackToTop />
    </div>
  );
}
