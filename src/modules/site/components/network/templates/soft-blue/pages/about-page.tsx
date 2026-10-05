import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AboutSection } from '@/modules/site/components/network/ui/public-pages';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface SoftBlueAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman tentang SoftBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman tentang dalam shell template.
 */
export function SoftBlueAbout({ site, title, description, path = '/' }: SoftBlueAboutProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <SoftBlueShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <AboutSection variant="classic" site={site} title={title} description={description}       skin={{
        accent: SOFT_BLUE.primary,
        tone: 'light',
        card: SOFT_BLUE.card,
        ring: SOFT_BLUE.ring,
        ink: SOFT_BLUE.ink,
        muted: SOFT_BLUE.muted,
      }} />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
