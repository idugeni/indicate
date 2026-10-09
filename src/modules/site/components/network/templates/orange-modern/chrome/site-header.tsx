import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

/**
 * Header OrangeModern: varian double dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function OrangeModernHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="double"
      drawer="left"
      site={site}
      path={path}
      skin={{
        accent: ORANGE_MODERN.primary,
        primaryDark: ORANGE_MODERN.primaryDark,
        primarySoft: ORANGE_MODERN.primarySoft,
        tone: 'light',
        scheme: ORANGE_MODERN.scheme,
        faint: ORANGE_MODERN.faint,
        card: ORANGE_MODERN.card,
        canvas: ORANGE_MODERN.canvas,
        ring: ORANGE_MODERN.ring,
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
        searchPanel: ORANGE_MODERN.searchPanel,
      }}
      templateId="orange-modern"
    />
  );
}
