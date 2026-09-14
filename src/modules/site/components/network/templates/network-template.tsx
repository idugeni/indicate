import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Rss, Search } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { normalizeTemplateId } from '@/modules/site/components/network/templates/listing-shared';

export async function NetworkTemplate({
  site,
  children,
}: {
  readonly site: NetworkSiteData;
  readonly children: ReactNode;
}) {
  const primary = site.settings.colors.primary ?? '#1f6feb';
  const accent = site.settings.colors.accent ?? '#1f6feb';
  const headerBg = site.settings.colors.headerBg ?? '#0e1320';
  const templateId = normalizeTemplateId(site.settings.colors.templateId);

  const siteInitial = (site.settings.name || 'P').trim().slice(0, 1).toUpperCase();

  const templateStyle: CSSProperties = {
    '--site-primary': primary,
    '--site-accent': accent,
    '--site-header-bg': headerBg,
  } as CSSProperties;

  return (
      <div
        className="network-shell min-h-screen bg-bg text-paper antialiased"
        data-template={templateId}
        style={templateStyle}
      >
        <a className="fixed left-4 top-[-5rem] z-50 rounded border border-hairline-strong bg-bg-raised-2 px-4 py-3 text-paper transition-[top] duration-180 focus:top-4" href="#main-content">
          Lewati ke konten
        </a>

        {site.context.regionId === null ? (
          <div className="flex items-center justify-between border-b border-hairline px-6 py-1.5 font-mono text-[11px] text-paper-dim">
            <span className="truncate text-paper-faint">
              Kanal distribusi resmi · Jaringan sindikasi INDICATE
            </span>
            <span className="hidden flex-none items-center gap-1.5 text-signal md:flex">
              <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
              <span>Tersinkron</span>
            </span>
          </div>
        ) : null}

        <header className="template-header sticky top-0 z-30 border-b border-hairline bg-bg-raised">
          <Container className="flex items-center gap-6 py-3.5 justify-between">
            <div className="network-brand flex items-center gap-3">
              {site.settings.logoUrl ? (
                <Image
                  unoptimized
                  src={site.settings.logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 rounded border border-hairline object-contain"
                  width={32}
                  height={32}
                />
              ) : (
                <Avatar className="h-8 w-8 rounded border border-hairline">
                  <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-bold text-[var(--site-accent)]">
                    {siteInitial}
                  </AvatarFallback>
                </Avatar>
              )}

              <Link href="/" aria-label={`${site.settings.name} beranda`} className="no-underline">
                <strong className="block font-sans text-base font-bold tracking-tight text-paper">
                  {site.settings.name}
                </strong>
              </Link>
            </div>

            <nav aria-label="Navigasi utama" className="flex items-center gap-1">
              {site.settings.navigation.map((item) => (
                <Link
                  href={item.path}
                  key={`${item.path}:${item.label}`}
                  className="rounded px-2.5 py-1.5 font-sans text-xs font-medium text-paper-dim transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/search"
                className="ml-2 inline-flex items-center gap-1.5 rounded border border-hairline bg-bg px-2.5 py-1.5 font-sans text-xs font-medium text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cari</span>
              </Link>
            </nav>
          </Container>
        </header>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        <footer className="mt-16 border-t border-hairline bg-bg-raised py-12">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
              <div className="space-y-1">
                <strong className="block font-sans text-sm font-semibold tracking-tight text-paper">
                  {site.settings.name}
                </strong>
                <p className="m-0 max-w-lg font-sans text-xs leading-relaxed text-paper-dim">
                  {site.settings.description}
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs text-paper-dim">
                {Object.entries(site.settings.socialLinks).map(([name, href]) => (
                  <a
                    href={href}
                    key={name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1 py-1 transition-colors duration-180 hover:text-[var(--site-accent)]"
                  >
                    {name}
                    <span className="sr-only"> (tautan eksternal, membuka di tab baru)</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-paper-faint">
              <small>© 2026 {site.settings.name} · Didukung Arsitektur Sindikasi INDICATE</small>
              <Link
                href="/rss.xml"
                className="flex items-center gap-1 transition-colors duration-180 hover:text-[var(--site-accent)]"
              >
                <Rss className="h-3 w-3 text-[var(--site-accent)]" aria-hidden="true" />
                <span>Umpan RSS Sindikasi</span>
              </Link>
            </div>
          </Container>
        </footer>
        <BackToTop />
      </div>
  );
}
