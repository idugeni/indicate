import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Halaman 404 PurpleEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function PurpleEditorialNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <PurpleEditorialShell site={site} path="/404">
      <NotFoundSection variant="editorial" site={site}       skin={{
        accent: PURPLE_EDITORIAL.primary,
        tone: 'light',
        card: PURPLE_EDITORIAL.card,
        ring: PURPLE_EDITORIAL.ring,
        ink: PURPLE_EDITORIAL.ink,
        muted: PURPLE_EDITORIAL.muted,
      }} />
    </PurpleEditorialShell>
  );
}
