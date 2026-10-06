import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya kaca untuk Glassy Blue.
 *
 * @param site - Data situs tenant aktif.
 * @returns Pil kaca buram: logo G, label, pemisah, dan ikon bookmark.
 */
export function GlassyBluePreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/70 py-1.5 pl-1.5 pr-3 shadow-xl shadow-[#1f7cff]/10 ring-1 ring-white backdrop-blur-xl transition-shadow hover:shadow-2xl hover:shadow-[#1f7cff]/20"
    >
      <GoogleGLogo className="h-7 w-7 flex-none rounded-full bg-white/90 p-0.5 shadow-sm" />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-slate-800">
        Tambahkan ke Sumber Pilihan
      </span>
      <span aria-hidden="true" className="h-5 w-px flex-none bg-slate-300/70" />
      <Bookmark className="h-4 w-4 flex-none text-[var(--tpl-primary,#1f7cff)]" aria-hidden="true" />
    </a>
  );
}
