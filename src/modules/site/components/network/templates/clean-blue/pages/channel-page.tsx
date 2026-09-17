import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/ui/container';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/ui/status-line';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/cards/picks';
import { CleanBlueLoadMore } from '@/modules/site/components/network/templates/clean-blue/cards/load-more';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/seo/json-ld';

export interface CleanBlueChannelProps {
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
export function CleanBlueChannel({ site, kicker, title, description, path = '/', indexable = true }: CleanBlueChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <CleanBlueShell site={site} path={path}>
      <CleanBlueContainer className="space-y-8 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#1a5fd0]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#1a5fd0]">
            {kicker}
          </p>
          <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">{description}</p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {site.articles.length} artikel · {site.context.normalizedHostname}
          </p>
        </div>
        {site.articles.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <>
            <CleanBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <CleanBlueLoadMore articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
