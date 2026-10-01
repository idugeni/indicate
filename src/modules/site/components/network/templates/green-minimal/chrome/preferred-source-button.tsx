import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya chip ringkas untuk Green Minimal.
 *
 * @param site - Data situs tenant aktif.
 * @returns Chip kecil: logo G, label singkat, pemisah, dan ikon bookmark.
 */
export function GreenMinimalPreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 ring-1 ring-slate-200 transition-shadow hover:shadow-sm"
    >
      <GoogleGLogo className="h-4 w-4 flex-none" />
      <span className="font-sans text-xs font-semibold text-slate-700">Tambah Sumber</span>
      <span aria-hidden="true" className="h-4 w-px flex-none bg-slate-200" />
      <Bookmark className="h-3.5 w-3.5 flex-none text-[#1d7a38]" aria-hidden="true" />
    </a>
  );
}
