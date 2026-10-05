import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Header GlassyBlue: varian double dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function GlassyBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="double"
      drawer="bottom"
      site={site}
      path={path}
      skin={{
        accent: GLASSY_BLUE.primary,
        tone: 'light',
        card: GLASSY_BLUE.card,
        ring: GLASSY_BLUE.ring,
        ink: GLASSY_BLUE.ink,
        muted: GLASSY_BLUE.muted,
        searchPanel: GLASSY_BLUE.searchPanel,
      }}
      templateId="glassy-blue"
    />
  );
}
