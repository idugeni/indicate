import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeader } from '@/modules/site/components/network/ui/site-header';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

/**
 * Header WarmEditorial: varian centered dari mode navbar bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @returns Header server sesuai varian.
 */
export async function WarmEditorialHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  return (
    <SiteHeader
      variant="centered"
      drawer="grid"
      site={site}
      path={path}
      skin={{
        accent: WARM_EDITORIAL.primary,
        primaryDark: WARM_EDITORIAL.primaryDark,
        primarySoft: WARM_EDITORIAL.primarySoft,
        tone: 'light',
        scheme: WARM_EDITORIAL.scheme,
        faint: WARM_EDITORIAL.faint,
        card: WARM_EDITORIAL.card,
        canvas: WARM_EDITORIAL.canvas,
        ring: WARM_EDITORIAL.ring,
        ink: WARM_EDITORIAL.ink,
        muted: WARM_EDITORIAL.muted,
        searchPanel: WARM_EDITORIAL.searchPanel,
      }}
      templateId="warm-editorial"
    />
  );
}
