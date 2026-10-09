import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Header PurpleEditorial: varian centered dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function PurpleEditorialHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="centered"
      drawer="grid"
      site={site}
      path={path}
      skin={{
        accent: PURPLE_EDITORIAL.primary,
        primaryDark: PURPLE_EDITORIAL.primaryDark,
        primarySoft: PURPLE_EDITORIAL.primarySoft,
        tone: 'light',
        scheme: PURPLE_EDITORIAL.scheme,
        faint: PURPLE_EDITORIAL.faint,
        card: PURPLE_EDITORIAL.card,
        canvas: PURPLE_EDITORIAL.canvas,
        ring: PURPLE_EDITORIAL.ring,
        ink: PURPLE_EDITORIAL.ink,
        muted: PURPLE_EDITORIAL.muted,
        searchPanel: PURPLE_EDITORIAL.searchPanel,
      }}
      templateId="purple-editorial"
    />
  );
}
