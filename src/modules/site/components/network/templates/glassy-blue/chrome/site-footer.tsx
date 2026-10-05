import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { GlassyBluePreferredSourceButton } from '@/modules/site/components/network/templates/glassy-blue/chrome/preferred-source-button';

/**
 * Footer GlassyBlue: varian minimal dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer minimal dengan warna tema glassy-blue.
 */
export async function GlassyBlueFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="minimal"
      site={site}
      skin={{
        accent: GLASSY_BLUE.primary,
        tone: 'light',
        card: GLASSY_BLUE.card,
        ring: GLASSY_BLUE.ring,
        ink: GLASSY_BLUE.ink,
        muted: GLASSY_BLUE.muted,
      }}
      templateId="glassy-blue"
      preferredSource={<GlassyBluePreferredSourceButton site={site} />}
      appBlurb={`Rasa membaca ${site.settings.name} selembut kaca — ringan, mulus, dan cepat dibuka.`}
    />
  );
}
