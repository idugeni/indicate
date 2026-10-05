import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';
import { BlackLimePreferredSourceButton } from '@/modules/site/components/network/templates/black-lime/chrome/preferred-source-button';

/**
 * Footer BlackLime: varian wordmark besar dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer wordmark besar dengan warna tema black-lime.
 */
export async function BlackLimeFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="wordmark"
      site={site}
      skin={{
        accent: BLACK_LIME.primary,
        tone: 'dark',
        card: BLACK_LIME.card,
        ring: BLACK_LIME.ring,
        ink: BLACK_LIME.ink,
        muted: BLACK_LIME.muted,
      }}
      templateId="black-lime"
      preferredSource={<BlackLimePreferredSourceButton site={site} />}
      appBlurb={`${site.settings.name} tanpa basa-basi — tajam, cepat, dan apa adanya di genggaman Anda.`}
    />
  );
}
