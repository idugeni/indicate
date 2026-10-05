import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

/**
 * Header SoftBlue: varian slim dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function SoftBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="slim"
      drawer="right"
      site={site}
      path={path}
      skin={{
        accent: SOFT_BLUE.primary,
        tone: 'light',
        card: SOFT_BLUE.card,
        ring: SOFT_BLUE.ring,
        ink: SOFT_BLUE.ink,
        muted: SOFT_BLUE.muted,
        searchPanel: SOFT_BLUE.searchPanel,
      }}
      templateId="soft-blue"
    />
  );
}
