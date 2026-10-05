import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

/**
 * Halaman 404 WarmEditorial: varian editorial dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function WarmEditorialNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <WarmEditorialShell site={site} path="/404">
      <NotFoundSection variant="editorial" site={site}       skin={{
        accent: WARM_EDITORIAL.primary,
        tone: 'light',
        card: WARM_EDITORIAL.card,
        ring: WARM_EDITORIAL.ring,
        ink: WARM_EDITORIAL.ink,
        muted: WARM_EDITORIAL.muted,
      }} />
    </WarmEditorialShell>
  );
}
