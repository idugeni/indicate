import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface GreenMinimalContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak GreenMinimal: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function GreenMinimalContact({ site, title, description, path = '/' }: GreenMinimalContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <GreenMinimalShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="minimal"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: GREEN_MINIMAL.primary,
        tone: 'light',
        card: GREEN_MINIMAL.card,
        ring: GREEN_MINIMAL.ring,
        ink: GREEN_MINIMAL.ink,
        muted: GREEN_MINIMAL.muted,
      }}
          empty={<GreenMinimalEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
