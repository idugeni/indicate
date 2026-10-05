import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AboutSection } from '@/modules/site/components/network/ui/public-pages';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface OrangeModernAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman tentang OrangeModern: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman tentang dalam shell template.
 */
export function OrangeModernAbout({ site, title, description, path = '/' }: OrangeModernAboutProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <OrangeModernShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <AboutSection variant="classic" site={site} title={title} description={description}       skin={{
        accent: ORANGE_MODERN.primary,
        tone: 'light',
        card: ORANGE_MODERN.card,
        ring: ORANGE_MODERN.ring,
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
      }} />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
