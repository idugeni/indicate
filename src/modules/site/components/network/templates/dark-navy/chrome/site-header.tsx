import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Header DarkNavy: varian floating dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function DarkNavyHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="floating"
      drawer="full"
      site={site}
      path={path}
      skin={{
        accent: DARK_NAVY.primary,
        tone: 'dark',
        card: DARK_NAVY.card,
        ring: DARK_NAVY.ring,
        ink: DARK_NAVY.ink,
        muted: DARK_NAVY.muted,
        searchPanel: DARK_NAVY.searchPanel,
      }}
      templateId="dark-navy"
    />
  );
}
