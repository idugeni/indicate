import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { OrangeModernPicks } from '@/modules/site/components/network/templates/orange-modern/cards/picks';
import { OrangeModernArchivePager } from '@/modules/site/components/network/templates/orange-modern/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface OrangeModernChannelProps {
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
export function OrangeModernChannel({ site, kicker, title, description, path = '/', indexable = true }: OrangeModernChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <OrangeModernShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="classic" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: ORANGE_MODERN.primary,
          tone: 'light',
          card: ORANGE_MODERN.card,
          ring: ORANGE_MODERN.ring,
          ink: ORANGE_MODERN.ink,
          muted: ORANGE_MODERN.muted,
        }} />
        {site.articles.length === 0 ? (
          <OrangeModernEmpty title={title} />
        ) : (
          <>
            <OrangeModernPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="in-feed" />
            <OrangeModernArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
