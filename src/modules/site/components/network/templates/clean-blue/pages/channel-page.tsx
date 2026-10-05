import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/cards/picks';
import { CleanBlueArchivePager } from '@/modules/site/components/network/templates/clean-blue/cards/archive-pager';
import { ChannelHeader } from '@/modules/site/components/network/ui/public-pages';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface CleanBlueChannelProps {
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
export function CleanBlueChannel({ site, kicker, title, description, path = '/', indexable = true }: CleanBlueChannelProps) {
  const seo = buildSeoDocument(site, { path, indexable });
  const [lead, ...rest] = site.articles;
  const picks = lead ? [lead, ...rest.slice(0, 2)] : [];
  const archive = lead ? rest.slice(2) : [];
  return (
    <CleanBlueShell site={site} path={path}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        <ChannelHeader variant="classic" site={site} kicker={kicker} title={title} description={description} skin={{
          accent: CLEAN_BLUE.primary,
          tone: 'light',
          card: CLEAN_BLUE.card,
          ring: CLEAN_BLUE.ring,
          ink: CLEAN_BLUE.ink,
          muted: CLEAN_BLUE.muted,
        }} />
        {site.articles.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <>
            <CleanBluePicks articles={picks} heading="Sorotan" description={`Liputan terbaru ${title}`} />
            <AdSlot site={site} slot="content-middle" />
            <CleanBlueArchivePager articles={archive} heading="Arsip kanal" description={`Jelajahi semua liputan ${title}`} />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
