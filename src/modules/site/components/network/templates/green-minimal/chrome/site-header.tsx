import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

/**
 * Header GreenMinimal: varian underline dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function GreenMinimalHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="underline"
      drawer="bottom"
      site={site}
      path={path}
      skin={{
        accent: GREEN_MINIMAL.primary,
        primaryDark: GREEN_MINIMAL.primaryDark,
        primarySoft: GREEN_MINIMAL.primarySoft,
        tone: 'light',
        scheme: GREEN_MINIMAL.scheme,
        faint: GREEN_MINIMAL.faint,
        card: GREEN_MINIMAL.card,
        canvas: GREEN_MINIMAL.canvas,
        ring: GREEN_MINIMAL.ring,
        ink: GREEN_MINIMAL.ink,
        muted: GREEN_MINIMAL.muted,
        searchPanel: GREEN_MINIMAL.searchPanel,
      }}
      templateId="green-minimal"
    />
  );
}
