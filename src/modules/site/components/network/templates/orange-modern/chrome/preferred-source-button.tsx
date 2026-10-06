import { BookmarkPlus } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya kapsul gradasi untuk Orange Modern.
 *
 * @param site - Data situs tenant aktif.
 * @returns Kapsul gradasi senja: logo G, label, pemisah, dan ikon tambah.
 */
export function OrangeModernPreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-gradient-to-r from-[var(--tpl-primary,#ea580c)] to-[#f59e0b] py-1.5 pl-1.5 pr-3 shadow-lg shadow-orange-500/30 transition-shadow hover:shadow-xl hover:shadow-orange-500/40"
    >
      <GoogleGLogo className="h-7 w-7 flex-none rounded-full bg-white p-0.5" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-white">
        Tambahkan ke Sumber Pilihan
      </span>
      <span aria-hidden="true" className="h-5 w-px flex-none bg-white/40" />
      <BookmarkPlus className="h-4 w-4 flex-none text-white" aria-hidden="true" />
    </a>
  );
}
