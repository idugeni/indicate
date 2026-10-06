import { Bookmark } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { GoogleGLogo } from '@/modules/site/components/network/chrome/google-g-logo';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya tersegmen untuk Purple Editorial.
 *
 * @param site - Data situs tenant aktif.
 * @returns Dua segmen: logo G plus label, dan segmen aksi bookmark pastel.
 */
export function PurpleEditorialPreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-stretch overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-md"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
        <GoogleGLogo className="h-5 w-5 flex-none" />
        <span className="truncate font-sans text-sm font-semibold text-slate-800">
          Tambahkan ke Sumber Pilihan
        </span>
      </span>
      <span className="flex flex-none items-center border-l border-[var(--tpl-primary,#7c3aed)]/20 bg-[var(--tpl-primary-soft,#ede9fe)] px-3">
        <Bookmark className="h-4 w-4 text-[var(--tpl-primary,#7c3aed)]" aria-hidden="true" />
      </span>
    </a>
  );
}
