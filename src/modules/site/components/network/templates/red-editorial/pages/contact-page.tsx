import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { RedEditorialEmpty } from '@/modules/site/components/network/templates/red-editorial/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface RedEditorialContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak RedEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function RedEditorialContact({ site, title, description, path = '/' }: RedEditorialContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <RedEditorialShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="editorial"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: RED_EDITORIAL.primary,
        tone: 'light',
        card: RED_EDITORIAL.card,
        ring: RED_EDITORIAL.ring,
        ink: RED_EDITORIAL.ink,
        muted: RED_EDITORIAL.muted,
      }}
          empty={<RedEditorialEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </RedEditorialShell>
  );
}
