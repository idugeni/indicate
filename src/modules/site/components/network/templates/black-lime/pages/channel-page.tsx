import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { BlackLimePicks } from '@/modules/site/components/network/templates/black-lime/cards/picks';
import { BlackLimeArchivePager } from '@/modules/site/components/network/templates/black-lime/cards/archive-pager';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface BlackLimeChannelProps {
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
export function BlackLimeChannel({ site, kicker, title, description, path = '/', indexable = true }: BlackLimeChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <BlackLimeShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <div className="rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60 sm:p-6">
          <p className="m-0 inline-block rounded-full bg-[#c5f82a]/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[#c5f82a]">
            {kicker}
          </p>
          <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight text-[#f2f5e9] sm:text-3xl">
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#a3ad9a]">{description}</p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-[#646b5e]">
            {site.articles.length} artikel · {site.context.normalizedHostname}
          </p>
        </div>
        {site.articles.length === 0 ? (
          <BlackLimeEmpty title={title} />
        ) : (
          <>
            <BlackLimePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="in-feed" />
            <BlackLimeArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
