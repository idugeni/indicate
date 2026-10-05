import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

/**
 * Halaman 404 SoftBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function SoftBlueNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SoftBlueShell site={site} path="/404">
      <NotFoundSection variant="classic" site={site}       skin={{
        accent: SOFT_BLUE.primary,
        tone: 'light',
        card: SOFT_BLUE.card,
        ring: SOFT_BLUE.ring,
        ink: SOFT_BLUE.ink,
        muted: SOFT_BLUE.muted,
      }} />
    </SoftBlueShell>
  );
}
