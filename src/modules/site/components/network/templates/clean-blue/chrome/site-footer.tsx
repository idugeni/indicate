import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { CleanBluePreferredSourceButton } from '@/modules/site/components/network/templates/clean-blue/chrome/preferred-source-button';

/**
 * Footer CleanBlue: varian klasik dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer klasik dengan warna tema clean-blue.
 */
export async function CleanBlueFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="classic"
      site={site}
      skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        card: CLEAN_BLUE.card,
        ring: CLEAN_BLUE.ring,
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
      }}
      templateId="clean-blue"
      preferredSource={<CleanBluePreferredSourceButton site={site} />}
      appBlurb={`Baca berita ${site.settings.name} dengan tampilan bersih dan ringan, tanpa gangguan di layar.`}
    />
  );
}
