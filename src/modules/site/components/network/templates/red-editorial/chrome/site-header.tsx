import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

/**
 * Header RedEditorial: varian masthead dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function RedEditorialHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="masthead"
      drawer="left"
      site={site}
      path={path}
      skin={{
        accent: RED_EDITORIAL.primary,
        tone: 'light',
        card: RED_EDITORIAL.card,
        ring: RED_EDITORIAL.ring,
        ink: RED_EDITORIAL.ink,
        muted: RED_EDITORIAL.muted,
        searchPanel: RED_EDITORIAL.searchPanel,
      }}
      templateId="red-editorial"
    />
  );
}
