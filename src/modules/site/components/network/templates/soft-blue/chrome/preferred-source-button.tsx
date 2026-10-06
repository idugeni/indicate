import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya neumorfik lembut untuk Soft Blue.
 *
 * @param site - Data situs tenant aktif.
 * @returns Kartu timbul lembut: logo G, label, pemisah, dan ikon bookmark.
 */
export function SoftBluePreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-2.5 rounded-2xl bg-[#eef2f9] px-3 py-2 shadow-[6px_6px_12px_#d3dcea,-6px_-6px_12px_#ffffff] transition-shadow hover:shadow-[8px_8px_16px_#d3dcea,-8px_-8px_16px_#ffffff]"
    >
      <GoogleGLogo className="h-5 w-5 flex-none" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-slate-700">
        Tambahkan ke Sumber Pilihan
      </span>
      <span aria-hidden="true" className="h-5 w-px flex-none bg-slate-300" />
      <Bookmark className="h-4 w-4 flex-none text-[var(--tpl-primary,#2563eb)]" aria-hidden="true" />
    </a>
  );
}
