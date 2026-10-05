import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface CleanBlueContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak CleanBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function CleanBlueContact({ site, title, description, path = '/' }: CleanBlueContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <CleanBlueShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="classic"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        card: CLEAN_BLUE.card,
        ring: CLEAN_BLUE.ring,
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
      }}
          empty={<CleanBlueEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
