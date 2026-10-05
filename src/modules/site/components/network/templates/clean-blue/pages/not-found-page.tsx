import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';

/**
 * Halaman 404 CleanBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function CleanBlueNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <CleanBlueShell site={site} path="/404">
      <NotFoundSection variant="classic" site={site}       skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        card: CLEAN_BLUE.card,
        ring: CLEAN_BLUE.ring,
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
      }} />
    </CleanBlueShell>
  );
}
