import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

/**
 * Halaman 404 BlackLime: varian minimal dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function BlackLimeNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <BlackLimeShell site={site} path="/404">
      <NotFoundSection variant="minimal" site={site}       skin={{
        accent: BLACK_LIME.primary,
        tone: 'dark',
        card: BLACK_LIME.card,
        ring: BLACK_LIME.ring,
        ink: BLACK_LIME.ink,
        muted: BLACK_LIME.muted,
      }} />
    </BlackLimeShell>
  );
}
