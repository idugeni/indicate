import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { DarkNavyPicks } from '@/modules/site/components/network/templates/dark-navy/cards/picks';
import { DarkNavyArchivePager } from '@/modules/site/components/network/templates/dark-navy/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface DarkNavyChannelProps {
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
export function DarkNavyChannel({ site, kicker, title, description, path = '/', indexable = true }: DarkNavyChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <DarkNavyShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="minimal" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: DARK_NAVY.primary,
          tone: 'dark',
          card: DARK_NAVY.card,
          ring: DARK_NAVY.ring,
          ink: DARK_NAVY.ink,
          muted: DARK_NAVY.muted,
        }} />
        {site.articles.length === 0 ? (
          <DarkNavyEmpty title={title} />
        ) : (
          <>
            <DarkNavyPicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="content-middle" />
            <DarkNavyArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
