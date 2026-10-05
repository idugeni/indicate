import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

/**
 * Halaman 404 RedEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function RedEditorialNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <RedEditorialShell site={site} path="/404">
      <NotFoundSection variant="editorial" site={site}       skin={{
        accent: RED_EDITORIAL.primary,
        tone: 'light',
        card: RED_EDITORIAL.card,
        ring: RED_EDITORIAL.ring,
        ink: RED_EDITORIAL.ink,
        muted: RED_EDITORIAL.muted,
      }} />
    </RedEditorialShell>
  );
}
