import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { SoftBlueEmpty } from '@/modules/site/components/network/templates/soft-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { SoftBluePicks } from '@/modules/site/components/network/templates/soft-blue/cards/picks';
import { SoftBlueArchivePager } from '@/modules/site/components/network/templates/soft-blue/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

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
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="classic" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: SOFT_BLUE.primary,
          tone: 'light',
          card: SOFT_BLUE.card,
          ring: SOFT_BLUE.ring,
          ink: SOFT_BLUE.ink,
          muted: SOFT_BLUE.muted,
        }} />
        {site.articles.length === 0 ? (
          <SoftBlueEmpty title={title} />
        ) : (
          <>
            <SoftBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="content-middle" />
            <SoftBlueArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
