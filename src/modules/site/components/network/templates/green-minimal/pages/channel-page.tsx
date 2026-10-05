import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { GreenMinimalPicks } from '@/modules/site/components/network/templates/green-minimal/cards/picks';
import { GreenMinimalArchivePager } from '@/modules/site/components/network/templates/green-minimal/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

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
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="minimal" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: GREEN_MINIMAL.primary,
          tone: 'light',
          card: GREEN_MINIMAL.card,
          ring: GREEN_MINIMAL.ring,
          ink: GREEN_MINIMAL.ink,
          muted: GREEN_MINIMAL.muted,
        }} />
        {site.articles.length === 0 ? (
          <GreenMinimalEmpty title={title} />
        ) : (
          <>
            <GreenMinimalPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="content-middle" />
            <GreenMinimalArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
