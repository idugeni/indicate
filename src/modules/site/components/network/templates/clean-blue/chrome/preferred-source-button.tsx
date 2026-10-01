import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya pil minimal untuk Clean Blue.
 *
 * @param site - Data situs tenant aktif.
 * @returns Tautan pil putih: logo G, label, pemisah, dan ikon bookmark.
 */
export function CleanBluePreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
    >
      <GoogleGLogo className="h-7 w-7 flex-none rounded-full bg-white p-0.5 ring-1 ring-slate-200" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-slate-800">
        Tambahkan ke Sumber Pilihan
      </span>
      <span aria-hidden="true" className="h-5 w-px flex-none bg-slate-200" />
      <Bookmark className="h-4 w-4 flex-none text-[#1a5fd0]" aria-hidden="true" />
    </a>
  );
}
