import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { PurpleEditorialEmpty } from '@/modules/site/components/network/templates/purple-editorial/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface PurpleEditorialContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak PurpleEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function PurpleEditorialContact({ site, title, description, path = '/' }: PurpleEditorialContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <PurpleEditorialShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="editorial"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: PURPLE_EDITORIAL.primary,
        tone: 'light',
        card: PURPLE_EDITORIAL.card,
        ring: PURPLE_EDITORIAL.ring,
        ink: PURPLE_EDITORIAL.ink,
        muted: PURPLE_EDITORIAL.muted,
      }}
          empty={<PurpleEditorialEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </PurpleEditorialShell>
  );
}
