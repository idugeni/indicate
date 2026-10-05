import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface BlackLimeContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak BlackLime: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function BlackLimeContact({ site, title, description, path = '/' }: BlackLimeContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <BlackLimeShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="minimal"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: BLACK_LIME.primary,
        tone: 'dark',
        card: BLACK_LIME.card,
        ring: BLACK_LIME.ring,
        ink: BLACK_LIME.ink,
        muted: BLACK_LIME.muted,
      }}
          empty={<BlackLimeEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
