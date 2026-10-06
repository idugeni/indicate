import type { ReactNode } from 'react';
import { CommentTargetProvider } from '@/modules/site/components/network/disqus/comment-target';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { DarkNavyHeader } from '@/modules/site/components/network/templates/dark-navy/chrome/site-header';
import { DarkNavyFooter } from '@/modules/site/components/network/templates/dark-navy/chrome/site-footer';
import { TemplateBackToTop } from '@/modules/site/components/network/chrome/back-to-top';
import { AdHeaderTop, AdShellBottom, AdShellTop, MobileAnchorSlot } from '@/modules/ads/ad-slot';

/**
 * Single template shell: skip-link + header + main + footer + back-to-top,
 * ALWAYS identical on every page (listing, article, search, report, 404).
 * The only way to assemble a dark-navy page — chrome changes belong here.
 */
export function DarkNavyShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[var(--tpl-canvas,#070f22)] font-sans text-[var(--tpl-ink,#eaf0fb)] antialiased" data-template="dark-navy" style={templateThemeStyle(DARK_NAVY)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-[var(--tpl-primary,#2f7bff)] px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <AdHeaderTop site={site} />
      <DarkNavyHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <AdShellTop site={site} />
        <CommentTargetProvider site={site}>
          {children}
        </CommentTargetProvider>
      </main>
      <AdShellBottom site={site} />
      <DarkNavyFooter site={site} />
      <MobileAnchorSlot site={site} />
      <TemplateBackToTop />
    </div>
  );
}
