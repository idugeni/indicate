import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';
import { GreenMinimalPreferredSourceButton } from '@/modules/site/components/network/templates/green-minimal/chrome/preferred-source-button';

/**
 * Footer GreenMinimal: varian minimal dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer minimal dengan warna tema green-minimal.
 */
export async function GreenMinimalFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="minimal"
      site={site}
      skin={{
        accent: GREEN_MINIMAL.primary,
        tone: 'light',
        card: GREEN_MINIMAL.card,
        ring: GREEN_MINIMAL.ring,
        ink: GREEN_MINIMAL.ink,
        muted: GREEN_MINIMAL.muted,
      }}
      templateId="green-minimal"
      preferredSource={<GreenMinimalPreferredSourceButton site={site} />}
      appBlurb={`Sedikit gangguan, banyak berita: ${site.settings.name} yang ringkas dan tenang.`}
    />
  );
}
