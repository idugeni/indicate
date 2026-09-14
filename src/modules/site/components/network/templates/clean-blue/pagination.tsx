import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Pagination bernomor gaya contoh (pill aktif biru). */
export function CleanBluePagination({
  page,
  totalPages,
  basePath,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly basePath: string;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => (target <= 1 ? basePath : `${basePath}?page=${target}`);
  const windowed: number[] = [];
  for (let n = 1; n <= totalPages; n += 1) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) windowed.push(n);
  }
  return (
    <nav aria-label="Navigasi halaman" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          aria-label="Halaman sebelumnya"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
      {windowed.map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-label={`Halaman ${n}`}
          aria-current={n === page ? 'page' : undefined}
          className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-sans text-sm font-bold transition-colors ${
            n === page
              ? 'bg-[#1f6feb] text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-[#1f6feb]'
          }`}
        >
          {n}
        </Link>
      ))}
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          aria-label="Halaman berikutnya"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
