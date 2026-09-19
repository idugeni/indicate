import Link from 'next/link';
import { Cpu, Globe, HeartHandshake, Landmark, LayoutGrid, Tag, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';

import type { CategoryNavItem } from '@/modules/site/components/network/templates/glassy-blue/lib/nav';

function pillIcon(label: string): LucideIcon {
  const key = label.toLowerCase();
  if (key.includes('nasional')) return Landmark;
  if (key.includes('ekonomi') || key.includes('bisnis')) return TrendingUp;
  if (key.includes('teknologi') || key.includes('tekno') || key.includes('digital')) return Cpu;
  if (key.includes('gaya') || key.includes('lifestyle') || key.includes('hidup')) return HeartHandshake;
  if (key.includes('olahraga') || key.includes('sport') || key.includes('bola')) return Trophy;
  if (key.includes('dunia') || key.includes('internasional') || key.includes('global')) return Globe;
  return Tag;
}

/**
 * Pil kategori horizontal gaya contoh: Semua aktif biru, sisanya pil putih berikon.
 *
 * @param items - Daftar kanal kategori tujuan.
 * @param activePath - Path aktif untuk status pil.
 * @returns Baris pil kategori yang dapat digulir horizontal.
 */
export function GlassyBlueCategoryPills({
  items,
  activePath = '/',
}: {
  readonly items: readonly CategoryNavItem[];
  readonly activePath?: string;
}) {
  const pill = (active: boolean): string =>
    `inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 font-sans text-[13px] transition-colors ${
      active
        ? 'bg-[#1f7cff] font-bold text-white shadow-md shadow-[#1f7cff]/30'
        : 'bg-white font-semibold text-slate-700 ring-1 ring-slate-200/80 hover:text-[#1f7cff] hover:ring-[#1f7cff]/40'
    }`;
  return (
    <nav aria-label="Kategori berita">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Link href="/" aria-current={activePath === '/' ? 'page' : undefined} className={pill(activePath === '/')}>
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          Semua
        </Link>
        {items.map((item) => {
          const Icon = pillIcon(item.label);
          const active = activePath === item.href;
          return (
            <Link
              key={`${item.href}:${item.label}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={pill(active)}
            >
              <Icon className="h-3.5 w-3.5 text-[#1f7cff]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/search"
          aria-label="Telusuri semua kategori"
          title="Telusuri semua kategori"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200/80 transition-colors hover:text-[#1f7cff]"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
