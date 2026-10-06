import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya outlined split untuk Warm Editorial.
 *
 * @param site - Data situs tenant aktif.
 * @returns Pil garis terakota: logo G, label, pemisah, dan ikon bookmark.
 */
export function WarmEditorialPreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-transparent px-1.5 py-1.5 ring-2 ring-[var(--tpl-primary,#b4532a)] transition-colors hover:bg-[var(--tpl-primary,#b4532a)]/5"
    >
      <GoogleGLogo className="h-7 w-7 flex-none" />
      <span className="min-w-0 flex-1 truncate px-1 font-sans text-sm font-semibold text-[var(--tpl-ink,#231208)]">
        Tambahkan ke Sumber Pilihan
      </span>
      <span aria-hidden="true" className="h-5 w-px flex-none bg-[var(--tpl-primary,#b4532a)]/40" />
      <Bookmark className="mr-1 h-4 w-4 flex-none text-[var(--tpl-primary,#b4532a)]" aria-hidden="true" />
    </a>
  );
}
