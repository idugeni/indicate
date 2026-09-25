import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { CleanBlueHeader } from '@/modules/site/components/network/templates/clean-blue/chrome/site-header';
import { CleanBlueFooter } from '@/modules/site/components/network/templates/clean-blue/chrome/site-footer';
import { CleanBlueBackToTop } from '@/modules/site/components/network/templates/clean-blue/chrome/back-to-top';

/**
 * Single template shell: skip-link + header + main + footer + back-to-top,
 * ALWAYS identical on every page (listing, article, search, report, 404).
 * The only way to assemble a clean-blue page — chrome changes belong here.
 */
export function CleanBlueShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#f5f8fd] font-sans text-slate-900 antialiased" data-template="clean-blue" style={templateThemeStyle(CLEAN_BLUE)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <CleanBlueHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        {children}
      </main>
      <CleanBlueFooter site={site} />
      <CleanBlueBackToTop />
    </div>
  );
}
