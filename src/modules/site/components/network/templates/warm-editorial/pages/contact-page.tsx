import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { WarmEditorialEmpty } from '@/modules/site/components/network/templates/warm-editorial/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface WarmEditorialContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak WarmEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function WarmEditorialContact({ site, title, description, path = '/' }: WarmEditorialContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <WarmEditorialShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="editorial"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: WARM_EDITORIAL.primary,
        tone: 'light',
        card: WARM_EDITORIAL.card,
        ring: WARM_EDITORIAL.ring,
        ink: WARM_EDITORIAL.ink,
        muted: WARM_EDITORIAL.muted,
      }}
          empty={<WarmEditorialEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </WarmEditorialShell>
  );
}
