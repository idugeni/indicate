import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { WarmEditorialEmpty } from '@/modules/site/components/network/templates/warm-editorial/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { WarmEditorialPicks } from '@/modules/site/components/network/templates/warm-editorial/cards/picks';
import { WarmEditorialArchivePager } from '@/modules/site/components/network/templates/warm-editorial/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface WarmEditorialChannelProps {
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
export function WarmEditorialChannel({ site, kicker, title, description, path = '/', indexable = true }: WarmEditorialChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <WarmEditorialShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="editorial" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: WARM_EDITORIAL.primary,
          tone: 'light',
          card: WARM_EDITORIAL.card,
          ring: WARM_EDITORIAL.ring,
          ink: WARM_EDITORIAL.ink,
          muted: WARM_EDITORIAL.muted,
        }} />
        {site.articles.length === 0 ? (
          <WarmEditorialEmpty title={title} />
        ) : (
          <>
            <WarmEditorialPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="in-feed" />
            <WarmEditorialArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </WarmEditorialShell>
  );
}
