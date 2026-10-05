import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { PurpleEditorialEmpty } from '@/modules/site/components/network/templates/purple-editorial/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { PurpleEditorialPicks } from '@/modules/site/components/network/templates/purple-editorial/cards/picks';
import { PurpleEditorialArchivePager } from '@/modules/site/components/network/templates/purple-editorial/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface PurpleEditorialChannelProps {
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
export function PurpleEditorialChannel({ site, kicker, title, description, path = '/', indexable = true }: PurpleEditorialChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <PurpleEditorialShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="editorial" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: PURPLE_EDITORIAL.primary,
          tone: 'light',
          card: PURPLE_EDITORIAL.card,
          ring: PURPLE_EDITORIAL.ring,
          ink: PURPLE_EDITORIAL.ink,
          muted: PURPLE_EDITORIAL.muted,
        }} />
        {site.articles.length === 0 ? (
          <PurpleEditorialEmpty title={title} />
        ) : (
          <>
            <PurpleEditorialPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="content-middle" />
            <PurpleEditorialArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </PurpleEditorialShell>
  );
}
