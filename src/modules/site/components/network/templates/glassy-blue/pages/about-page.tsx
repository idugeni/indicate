import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { AboutSection } from '@/modules/site/components/network/ui/public-pages';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface GlassyBlueAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman tentang GlassyBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman tentang dalam shell template.
 */
export function GlassyBlueAbout({ site, title, description, path = '/' }: GlassyBlueAboutProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <GlassyBlueShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <AboutSection variant="classic" site={site} title={title} description={description}       skin={{
        accent: GLASSY_BLUE.primary,
        tone: 'light',
        card: GLASSY_BLUE.card,
        ring: GLASSY_BLUE.ring,
        ink: GLASSY_BLUE.ink,
        muted: GLASSY_BLUE.muted,
      }} />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GlassyBlueShell>
  );
}
