import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';
import { OrangeModernPreferredSourceButton } from '@/modules/site/components/network/templates/orange-modern/chrome/preferred-source-button';

/**
 * Footer OrangeModern: varian mega kategori dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer mega kategori dengan warna tema orange-modern.
 */
export async function OrangeModernFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="mega"
      site={site}
      skin={{
        accent: ORANGE_MODERN.primary,
        tone: 'light',
        card: ORANGE_MODERN.card,
        ring: ORANGE_MODERN.ring,
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
      }}
      templateId="orange-modern"
      preferredSource={<OrangeModernPreferredSourceButton site={site} />}
      appBlurb={`Ikuti ${site.settings.name} sepanjang hari — berita terbaru selalu dalam satu ketukan.`}
    />
  );
}
