import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

/**
 * Header BlackLime: varian masthead dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function BlackLimeHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="masthead"
      drawer="full"
      site={site}
      path={path}
      skin={{
        accent: BLACK_LIME.primary,
        tone: 'dark',
        card: BLACK_LIME.card,
        ring: BLACK_LIME.ring,
        ink: BLACK_LIME.ink,
        muted: BLACK_LIME.muted,
        searchPanel: BLACK_LIME.searchPanel,
      }}
      templateId="black-lime"
    />
  );
}
