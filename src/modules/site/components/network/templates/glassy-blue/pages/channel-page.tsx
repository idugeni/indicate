import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { GlassyBlueContainer } from '@/modules/site/components/network/templates/glassy-blue/ui/container';
import { GlassyBlueEmpty } from '@/modules/site/components/network/templates/glassy-blue/ui/empty';
import { GlassyBlueStatusLine } from '@/modules/site/components/network/templates/glassy-blue/ui/status-line';
import { GlassyBluePicks } from '@/modules/site/components/network/templates/glassy-blue/cards/picks';
import { GlassyBlueLoadMore } from '@/modules/site/components/network/templates/glassy-blue/cards/load-more';
import { GlassyBlueJsonLd } from '@/modules/site/components/network/templates/glassy-blue/seo/json-ld';

export interface GlassyBlueChannelProps {
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
export function GlassyBlueChannel({ site, kicker, title, description, path = '/', indexable = true }: GlassyBlueChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <GlassyBlueShell site={site} path={path}>
      <GlassyBlueContainer className="space-y-8 py-6 md:py-8">
        <GlassyBlueStatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#1f7cff]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#1f7cff]">
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
          <GlassyBlueEmpty title={title} />
        ) : (
          <>
            <GlassyBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <GlassyBlueLoadMore articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </GlassyBlueContainer>
      <GlassyBlueJsonLd schemas={seo.jsonLd} />
    </GlassyBlueShell>
  );
}
