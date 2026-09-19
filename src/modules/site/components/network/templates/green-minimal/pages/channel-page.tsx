import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalContainer } from '@/modules/site/components/network/templates/green-minimal/ui/container';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';
import { GreenMinimalStatusLine } from '@/modules/site/components/network/templates/green-minimal/ui/status-line';
import { GreenMinimalPicks } from '@/modules/site/components/network/templates/green-minimal/cards/picks';
import { GreenMinimalLoadMore } from '@/modules/site/components/network/templates/green-minimal/cards/load-more';
import { GreenMinimalJsonLd } from '@/modules/site/components/network/templates/green-minimal/seo/json-ld';

export interface GreenMinimalChannelProps {
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
export function GreenMinimalChannel({ site, kicker, title, description, path = '/', indexable = true }: GreenMinimalChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <GreenMinimalShell site={site} path={path}>
      <GreenMinimalContainer className="space-y-8 py-6 md:py-8">
        <GreenMinimalStatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#1d7a38]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#1d7a38]">
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
          <GreenMinimalEmpty title={title} />
        ) : (
          <>
            <GreenMinimalPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <GreenMinimalLoadMore articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </GreenMinimalContainer>
      <GreenMinimalJsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
