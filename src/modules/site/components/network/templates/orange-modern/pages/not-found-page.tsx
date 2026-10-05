import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

/**
 * Halaman 404 OrangeModern: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function OrangeModernNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <OrangeModernShell site={site} path="/404">
      <NotFoundSection variant="classic" site={site}       skin={{
        accent: ORANGE_MODERN.primary,
        tone: 'light',
        card: ORANGE_MODERN.card,
        ring: ORANGE_MODERN.ring,
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
      }} />
    </OrangeModernShell>
  );
}
