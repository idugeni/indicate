import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { RedEditorialEmpty } from '@/modules/site/components/network/templates/red-editorial/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { RedEditorialPicks } from '@/modules/site/components/network/templates/red-editorial/cards/picks';
import { RedEditorialArchivePager } from '@/modules/site/components/network/templates/red-editorial/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface RedEditorialChannelProps {
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
export function RedEditorialChannel({ site, kicker, title, description, path = '/', indexable = true }: RedEditorialChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <RedEditorialShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="editorial" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: RED_EDITORIAL.primary,
          tone: 'light',
          card: RED_EDITORIAL.card,
          ring: RED_EDITORIAL.ring,
          ink: RED_EDITORIAL.ink,
          muted: RED_EDITORIAL.muted,
        }} />
        {site.articles.length === 0 ? (
          <RedEditorialEmpty title={title} />
        ) : (
          <>
            <RedEditorialPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="in-feed" />
            <RedEditorialArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </RedEditorialShell>
  );
}
