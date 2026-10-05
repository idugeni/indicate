import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { NotFoundSection } from '@/modules/site/components/network/ui/public-pages';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Halaman 404 GlassyBlue: varian classic dari mode halaman publik bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Halaman tidak ditemukan dalam shell template.
 */
export function GlassyBlueNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <GlassyBlueShell site={site} path="/404">
      <NotFoundSection variant="classic" site={site}       skin={{
        accent: GLASSY_BLUE.primary,
        tone: 'light',
        card: GLASSY_BLUE.card,
        ring: GLASSY_BLUE.ring,
        ink: GLASSY_BLUE.ink,
        muted: GLASSY_BLUE.muted,
      }} />
    </GlassyBlueShell>
  );
}
