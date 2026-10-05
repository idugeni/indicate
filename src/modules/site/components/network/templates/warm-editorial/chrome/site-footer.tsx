import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteFooter } from '@/modules/site/components/network/ui/site-footer';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';
import { WarmEditorialPreferredSourceButton } from '@/modules/site/components/network/templates/warm-editorial/chrome/preferred-source-button';

/**
 * Footer WarmEditorial: varian newsletter-first dari mode footer bersama.
 *
 * @param site - Data situs tenant aktif.
 * @returns Footer newsletter-first dengan warna tema warm-editorial.
 */
export async function WarmEditorialFooter({ site }: { readonly site: NetworkSiteData }) {
  return (
    <SiteFooter
      variant="newsletter"
      site={site}
      skin={{
        accent: WARM_EDITORIAL.primary,
        tone: 'light',
        card: WARM_EDITORIAL.card,
        ring: WARM_EDITORIAL.ring,
        ink: WARM_EDITORIAL.ink,
        muted: WARM_EDITORIAL.muted,
      }}
      templateId="warm-editorial"
      preferredSource={<WarmEditorialPreferredSourceButton site={site} />}
      appBlurb={`Temukan cerita ${site.settings.name} yang hangat dan mudah dibaca, kapan pun Anda punya waktu luang.`}
    />
  );
}
