import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { DarkNavyPreferredSourceButton } from '@/modules/site/components/network/templates/dark-navy/chrome/preferred-source-button';

/**
 * Footer DarkNavy: varian wordmark besar dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer wordmark besar dengan warna tema dark-navy.
 */
export async function DarkNavyFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="wordmark"
      site={site}
      skin={{
        accent: DARK_NAVY.primary,
        tone: 'dark',
        card: DARK_NAVY.card,
        ring: DARK_NAVY.ring,
        ink: DARK_NAVY.ink,
        muted: DARK_NAVY.muted,
      }}
      templateId="dark-navy"
      preferredSource={<DarkNavyPreferredSourceButton site={site} />}
      appBlurb={`Telusuri ${site.settings.name} secara mendalam lewat aplikasi yang dirancang untuk layar kecil.`}
    />
  );
}
