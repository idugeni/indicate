'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  isCategoryNavActive,
  withCategoryIndex,
  type CategoryNavItem,
} from '@/modules/site/components/network/ui/nav';

/**
 * Toleransi posisi scroll agar guncangan sub-piksel tidak membuat strip berkedip.
 * Pita kategori menutup begitu halaman digulir, lalu kembali saat menyentuh puncak.
 */
const TOP_SLACK_PX = 24;

/**
 * Strip kanal geser horizontal untuk layar kecil dan tablet di dalam header sticky.
 *
 * @param categories - Kanal navbar tanpa item Indeks.
 * @param path - Path halaman aktif.
 * @returns Bar snap-x dengan "Indeks" terakhir, hanya di bawah lg, menyusut saat digulir.
 * @remarks Padanan `TemplateBackToTop`: listener scroll pasif yang hanya menyimpan
 *   satu boolean. Row `0fr`/`1fr` dipilih agar tinggi menutup tanpa mengukur tinggi
 *   strip di JS, dan `inert` ikut dipakai supaya link yang tak terlihat hilang dari
 *   tab-order serta pohon aksesibilitas.
 */
export function CategoryNavStrip({
  categories,
  path,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
}) {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY <= TOP_SLACK_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = withCategoryIndex(categories);
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Kanal liputan"
      aria-hidden={!atTop}
      inert={!atTop}
      className={`grid border-t border-[var(--tpl-ring,var(--tpl-faint))] transition-[grid-template-rows] duration-180 ease-out lg:hidden ${
        atTop ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <ul className="m-0 flex min-h-0 list-none snap-x snap-mandatory gap-1.5 overflow-x-auto overflow-y-hidden px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isCategoryNavActive(path, item.href);
          return (
            <li key={`${item.href}:${item.label}`} className="m-0 shrink-0 snap-start p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[13px] transition-colors ${
                  active
                    ? 'bg-[var(--tpl-primary-soft,var(--tpl-faint))] font-bold text-[var(--tpl-primary)] underline decoration-2 underline-offset-4'
                    : 'font-medium text-[var(--tpl-muted)] hover:bg-[var(--tpl-primary-soft,var(--tpl-faint))] hover:text-[var(--tpl-ink)]'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}