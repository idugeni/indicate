import { Star } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

const PREFERRED_SOURCE_ENDPOINT = 'https://www.google.com/preferences/source';

/**
 * Tautan "tambahkan sebagai Sumber Pilihan" untuk satu tenant portal.
 *
 * @remarks
 * Google mem-parsing nilai `q` sebagai URL sumber yang akan dicentang di
 * dialog preferensi, jadi nilainya harus absolut dan tanpa trailing slash.
 * Host diambil dari `site.context` agar rebrand domain tidak perlu menyentuh
 * markup ini.
 */
function preferredSourceHref(hostname: string): string {
  return `${PREFERRED_SOURCE_ENDPOINT}?q=${encodeURIComponent(`https://${hostname}`)}`;
}

export function GooglePreferredSourceLink({
  site,
  className,
}: {
  readonly site: NetworkSiteData;
  readonly className: string;
}) {
  return (
    <TemplateTooltip label={`Tambahkan ${site.settings.name} ke Sumber Pilihan Google`}>
      <a
        href={preferredSourceHref(site.context.normalizedHostname)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
        className={className}
      >
        <Star className="h-4 w-4" aria-hidden="true" />
      </a>
    </TemplateTooltip>
  );
}
