import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

/**
 * Halaman 404 GreenMinimal: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function GreenMinimalNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <GreenMinimalShell site={site} path="/404">
      <NotFoundSection variant="minimal" site={site}       skin={{
        accent: GREEN_MINIMAL.primary,
        tone: 'light',
        card: GREEN_MINIMAL.card,
        ring: GREEN_MINIMAL.ring,
        ink: GREEN_MINIMAL.ink,
        muted: GREEN_MINIMAL.muted,
      }} />
    </GreenMinimalShell>
  );
}
