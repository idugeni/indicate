import { BookmarkPlus } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { preferredSourceHref } from '@/modules/site/components/network/chrome/google-preferred-source';

/**
 * Tombol Sumber Pilihan gaya aksi melayang gelap untuk Black Lime.
 *
 * @param site - Data situs tenant aktif.
 * @returns Chip cincin gelap dengan tombol lingkaran lime menyala.
 * @remarks Cincin `#242b1f` dan aksen lime saat hover sengaja mengikuti chip
 * ikon sosial di footer Black Lime yang sama, bukan pil putih 9 template
 * terang. Padding `py-1.5 pr-1.5` bukan kosmetik: tanpa itu label setinggi
 * `text-sm` hanya punya area sentuh di bawah ambang WCAG 2.2 AA, sedangkan
 * ikon `h-11` sendirian sudah memenuhi 44px.
 */
export function BlackLimePreferredSourceButton({ site }: { readonly site: NetworkSiteData }) {
  return (
    <a
      href={preferredSourceHref(site.context.normalizedHostname)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google`}
      className="inline-flex max-w-full items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4 ring-1 ring-[var(--tpl-ring,#242b1f)] transition-colors hover:ring-[var(--tpl-primary,#c5f82a)]/50"
    >
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-slate-100">
        Tambahkan ke Sumber Pilihan
      </span>
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary,#c5f82a)] text-[var(--tpl-on-primary,#0a0c07)] shadow-[0_0_24px_rgba(197,248,42,0.55)] transition-shadow hover:shadow-[0_0_32px_rgba(197,248,42,0.75)]">
        <BookmarkPlus className="h-5 w-5" aria-hidden="true" />
      </span>
    </a>
  );
}
