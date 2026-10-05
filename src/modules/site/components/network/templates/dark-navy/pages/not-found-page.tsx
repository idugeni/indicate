import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Halaman 404 DarkNavy: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function DarkNavyNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <DarkNavyShell site={site} path="/404">
      <NotFoundSection variant="minimal" site={site}       skin={{
        accent: DARK_NAVY.primary,
        tone: 'dark',
        card: DARK_NAVY.card,
        ring: DARK_NAVY.ring,
        ink: DARK_NAVY.ink,
        muted: DARK_NAVY.muted,
      }} />
    </DarkNavyShell>
  );
}
