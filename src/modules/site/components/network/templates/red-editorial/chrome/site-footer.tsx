import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';
import { RedEditorialPreferredSourceButton } from '@/modules/site/components/network/templates/red-editorial/chrome/preferred-source-button';

/**
 * Footer RedEditorial: varian newsletter-first dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer newsletter-first dengan warna tema red-editorial.
 */
export async function RedEditorialFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="newsletter"
      site={site}
      skin={{
        accent: RED_EDITORIAL.primary,
        tone: 'light',
        card: RED_EDITORIAL.card,
        ring: RED_EDITORIAL.ring,
        ink: RED_EDITORIAL.ink,
        muted: RED_EDITORIAL.muted,
      }}
      templateId="red-editorial"
      preferredSource={<RedEditorialPreferredSourceButton site={site} />}
      appBlurb={`Berita ${site.settings.name} diverifikasi berlapis sebelum tayang, supaya Anda tidak salah membaca.`}
    />
  );
}
