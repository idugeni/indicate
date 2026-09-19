import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyContainer } from '@/modules/site/components/network/templates/dark-navy/ui/container';
import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';
import { DarkNavyStatusLine } from '@/modules/site/components/network/templates/dark-navy/ui/status-line';
import { DarkNavyPicks } from '@/modules/site/components/network/templates/dark-navy/cards/picks';
import { DarkNavyLoadMore } from '@/modules/site/components/network/templates/dark-navy/cards/load-more';
import { DarkNavyJsonLd } from '@/modules/site/components/network/templates/dark-navy/seo/json-ld';

export interface DarkNavyChannelProps {
  readonly site: NetworkSiteData;
  readonly kicker: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Halaman kanal (kategori/tag): pita identitas + grid kartu, tanpa hero,
 * ticker, dan newsletter milik beranda.
 */
export function DarkNavyChannel({ site, kicker, title, description, path = '/', indexable = true }: DarkNavyChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <DarkNavyShell site={site} path={path}>
      <DarkNavyContainer className="space-y-8 py-6 md:py-8">
        <DarkNavyStatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#2f7bff]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#2f7bff]">
            {kicker}
          </p>
          <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight text-[#eaf0fb] sm:text-3xl">
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#9aa9c4]">{description}</p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-[#5f6f8c]">
            {site.articles.length} artikel · {site.context.normalizedHostname}
          </p>
        </div>
        {site.articles.length === 0 ? (
          <DarkNavyEmpty title={title} />
        ) : (
          <>
            <DarkNavyPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <DarkNavyLoadMore articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </DarkNavyContainer>
      <DarkNavyJsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
