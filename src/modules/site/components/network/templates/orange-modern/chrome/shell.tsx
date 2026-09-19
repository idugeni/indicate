import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernHeader } from '@/modules/site/components/network/templates/orange-modern/chrome/site-header';
import { OrangeModernFooter } from '@/modules/site/components/network/templates/orange-modern/chrome/site-footer';
import { OrangeModernBackToTop } from '@/modules/site/components/network/templates/orange-modern/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman orange-modern — perubahan chrome cukup di sini.
 */
export function OrangeModernShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fff9f4] font-sans text-slate-900 antialiased" data-template="orange-modern">
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <OrangeModernHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <OrangeModernFooter site={site} />
      <OrangeModernBackToTop />
    </div>
  );
}
