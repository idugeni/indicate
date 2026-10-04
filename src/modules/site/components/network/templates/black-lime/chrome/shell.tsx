import type { ReactNode } from 'react';
import { CommentTargetProvider } from '@/modules/site/components/network/disqus/comment-target';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';
import { BlackLimeHeader } from '@/modules/site/components/network/templates/black-lime/chrome/site-header';
import { BlackLimeFooter } from '@/modules/site/components/network/templates/black-lime/chrome/site-footer';
import { TemplateBackToTop } from '@/modules/site/components/network/chrome/back-to-top';
import { AdHeaderTop, AdShellBottom, AdShellTop } from '@/modules/ads/ad-slot';

/**
 * Single template shell: skip-link + header + main + footer + back-to-top,
 * ALWAYS identical on every page (listing, article, search, report, 404).
 * The only way to assemble a black-lime page — chrome changes belong here.
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
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#0a0c07] font-sans text-slate-100 antialiased" data-template="black-lime" style={templateThemeStyle(BLACK_LIME)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-[#c5f82a] px-4 py-3 font-sans text-sm font-bold text-[#0a0c07] transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <AdHeaderTop site={site} />
      <BlackLimeHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <AdShellTop site={site} />
        <CommentTargetProvider site={site}>
          {children}
        </CommentTargetProvider>
      </main>
      <AdShellBottom site={site} />
      <BlackLimeFooter site={site} />
      <TemplateBackToTop />
    </div>
  );
}
