import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { BlackLimePicks } from '@/modules/site/components/network/templates/black-lime/cards/picks';
import { BlackLimeArchivePager } from '@/modules/site/components/network/templates/black-lime/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';
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
        <ChannelHeader variant="minimal" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: BLACK_LIME.primary,
          tone: 'dark',
          card: BLACK_LIME.card,
          ring: BLACK_LIME.ring,
          ink: BLACK_LIME.ink,
          muted: BLACK_LIME.muted,
        }} />
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
