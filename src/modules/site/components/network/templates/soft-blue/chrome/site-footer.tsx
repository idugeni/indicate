import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { SoftBluePreferredSourceButton } from '@/modules/site/components/network/templates/soft-blue/chrome/preferred-source-button';

/**
 * Footer SoftBlue: varian minimal dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer minimal dengan warna tema soft-blue.
 */
export async function SoftBlueFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="minimal"
      site={site}
      skin={{
        accent: SOFT_BLUE.primary,
        tone: 'light',
        card: SOFT_BLUE.card,
        ring: SOFT_BLUE.ring,
        ink: SOFT_BLUE.ink,
        muted: SOFT_BLUE.muted,
      }}
      templateId="soft-blue"
      preferredSource={<SoftBluePreferredSourceButton site={site} />}
      appBlurb={`Baca berita kapan saja, di mana saja dengan aplikasi ${site.settings.name}.`}
    />
  );
}
