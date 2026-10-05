import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { PurpleEditorialPreferredSourceButton } from '@/modules/site/components/network/templates/purple-editorial/chrome/preferred-source-button';

/**
 * Footer PurpleEditorial: varian premium gelap dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer premium gelap dengan warna tema purple-editorial.
 */
export async function PurpleEditorialFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="premium"
      site={site}
      skin={{
        accent: PURPLE_EDITORIAL.primary,
        tone: 'light',
        card: PURPLE_EDITORIAL.card,
        ring: PURPLE_EDITORIAL.ring,
        ink: PURPLE_EDITORIAL.ink,
        muted: PURPLE_EDITORIAL.muted,
      }}
      templateId="purple-editorial"
      preferredSource={<PurpleEditorialPreferredSourceButton site={site} />}
      appBlurb={`Baca ${site.settings.name} dengan ritme yang tenang, lengkap dengan konteks di balik setiap berita.`}
    />
  );
}
