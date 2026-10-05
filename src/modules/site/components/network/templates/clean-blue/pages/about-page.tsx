import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AboutSection } from '@/modules/site/components/network/ui/public-pages';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface CleanBlueAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman tentang CleanBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman tentang dalam shell template.
 */
export function CleanBlueAbout({ site, title, description, path = '/' }: CleanBlueAboutProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <CleanBlueShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <AboutSection variant="classic" site={site} title={title} description={description}       skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        card: CLEAN_BLUE.card,
        ring: CLEAN_BLUE.ring,
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
      }} />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
