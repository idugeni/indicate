import Link from 'next/link';

import { DOCS_PAGES } from '@/modules/docs/navigation';

export function DocsPager({ slug }: { readonly slug: string }) {
  const index = DOCS_PAGES.findIndex((page) => page.slug === slug);
  if (index < 0) return null;
  const previous = index > 0 ? DOCS_PAGES[index - 1]! : null;
  const next = index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1]! : null;
  if (previous === null && next === null) return null;
  return (
    <nav aria-label="Halaman berikut" className="mt-12 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
      <div className="min-w-0">
        {previous === null ? null : (
          <Link
            href={previous.path}
            className="group block rounded-2xl bg-white p-4 no-underline shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md"
          >
            <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">Sebelumnya</span>
            <span className="mt-1 block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1a5fd0]">
              {previous.title}
            </span>
          </Link>
        )}
      </div>
      <div className="min-w-0 text-right">
        {next === null ? null : (
          <Link
            href={next.path}
            className="group block rounded-2xl bg-white p-4 no-underline shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md"
          >
            <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">Berikutnya</span>
            <span className="mt-1 block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1a5fd0]">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
