import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueContainer } from '@/modules/site/components/network/templates/soft-blue/ui/container';
import { SoftBlueEmpty } from '@/modules/site/components/network/templates/soft-blue/ui/empty';
import { SoftBlueStatusLine } from '@/modules/site/components/network/templates/soft-blue/ui/status-line';
import { SoftBluePicks } from '@/modules/site/components/network/templates/soft-blue/cards/picks';
import { SoftBlueLoadMore } from '@/modules/site/components/network/templates/soft-blue/cards/load-more';
import { SoftBlueJsonLd } from '@/modules/site/components/network/templates/soft-blue/seo/json-ld';

export interface SoftBlueChannelProps {
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
export function SoftBlueChannel({ site, kicker, title, description, path = '/', indexable = true }: SoftBlueChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <SoftBlueShell site={site} path={path}>
      <SoftBlueContainer className="space-y-8 py-6 md:py-8">
        <SoftBlueStatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#2563eb]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">
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
          <SoftBlueEmpty title={title} />
        ) : (
          <>
            <SoftBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <SoftBlueLoadMore articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </SoftBlueContainer>
      <SoftBlueJsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
