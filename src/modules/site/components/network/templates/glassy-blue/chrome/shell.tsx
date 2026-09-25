import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { GlassyBlueHeader } from '@/modules/site/components/network/templates/glassy-blue/chrome/site-header';
import { GlassyBlueFooter } from '@/modules/site/components/network/templates/glassy-blue/chrome/site-footer';
import { GlassyBlueBackToTop } from '@/modules/site/components/network/templates/glassy-blue/chrome/back-to-top';

/**
 * Single template shell: skip-link + header + main + footer + back-to-top,
 * ALWAYS identical on every page (listing, article, search, report, 404).
 * The only way to assemble a glassy-blue page — chrome changes belong here.
 */
export function GlassyBlueShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#edf4ff] font-sans text-slate-900 antialiased" data-template="glassy-blue" style={templateThemeStyle(GLASSY_BLUE)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <GlassyBlueHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        {children}
      </main>
      <GlassyBlueFooter site={site} />
      <GlassyBlueBackToTop />
    </div>
  );
}
