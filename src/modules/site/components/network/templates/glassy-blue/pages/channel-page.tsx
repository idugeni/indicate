import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { GlassyBlueEmpty } from '@/modules/site/components/network/templates/glassy-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { GlassyBluePicks } from '@/modules/site/components/network/templates/glassy-blue/cards/picks';
import { GlassyBlueArchivePager } from '@/modules/site/components/network/templates/glassy-blue/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

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
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="classic" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: GLASSY_BLUE.primary,
          tone: 'light',
          card: GLASSY_BLUE.card,
          ring: GLASSY_BLUE.ring,
          ink: GLASSY_BLUE.ink,
          muted: GLASSY_BLUE.muted,
        }} />
        {site.articles.length === 0 ? (
          <GlassyBlueEmpty title={title} />
        ) : (
          <>
            <GlassyBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="in-feed" />
            <GlassyBlueArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GlassyBlueShell>
  );
}
