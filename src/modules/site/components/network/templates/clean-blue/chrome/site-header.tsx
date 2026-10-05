import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';

/**
 * Header CleanBlue: varian slim dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function CleanBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="slim"
      drawer="right"
      site={site}
      path={path}
      skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        card: CLEAN_BLUE.card,
        ring: CLEAN_BLUE.ring,
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
        searchPanel: CLEAN_BLUE.searchPanel,
      }}
      templateId="clean-blue"
    />
  );
}
