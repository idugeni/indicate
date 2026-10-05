import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';
import { ContactSection } from '@/modules/site/components/network/ui/public-pages';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';

export interface DarkNavyContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Halaman kontak DarkNavy: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param path - Path untuk dokumen SEO.
 * @returns Halaman kontak dalam shell template.
 */
export function DarkNavyContact({ site, title, description, path = '/' }: DarkNavyContactProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <DarkNavyShell site={site} path={path}>
      <Container className="space-y-6 py-6 md:py-8">
        <ContactSection
          variant="minimal"
          site={site}
          title={title}
          description={description}
                skin={{
        accent: DARK_NAVY.primary,
        tone: 'dark',
        card: DARK_NAVY.card,
        ring: DARK_NAVY.ring,
        ink: DARK_NAVY.ink,
        muted: DARK_NAVY.muted,
      }}
          empty={<DarkNavyEmpty title={title} />}
        />
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
