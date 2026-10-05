import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface OrangeModernContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak OrangeModern: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function OrangeModernContact({ site, title, description, path = '/' }: OrangeModernContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <OrangeModernShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="classic"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: ORANGE_MODERN.primary,
        tone: 'light',
        card: ORANGE_MODERN.card,
        ring: ORANGE_MODERN.ring,
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
      }}
          empty={<OrangeModernEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
