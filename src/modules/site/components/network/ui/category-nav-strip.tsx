import Link from 'next/link';

import {
  isCategoryNavActive,
  withCategoryIndex,
  type CategoryNavItem,
} from '@/modules/site/components/network/ui/nav';

/**
 * Strip kanal geser horizontal untuk layar sangat kecil di dalam header sticky.
 *
 * @param categories - Kanal navbar tanpa item Indeks.
 * @param path - Path halaman aktif.
 * @returns Bar snap-x dengan "Indeks" terakhir, hanya di bawah sm.
 */
export function CategoryNavStrip({
  categories,
  path,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
}) {
  const items = withCategoryIndex(categories);
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Kanal liputan"
      className="border-t border-[var(--tpl-ring,var(--tpl-faint))] sm:hidden"
    >
      <ul className="m-0 flex list-none snap-x snap-mandatory gap-1.5 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
