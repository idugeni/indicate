import { EmptyState } from '@/modules/dashboard/components/empty-state';
import type { AnalyticsPoint } from '@/modules/dashboard/models';

const BATAS_BARIS = 5;

function persen(nilai: number, dasar: number): string {
  if (dasar <= 0) return '—';
  return `${Math.round((nilai / dasar) * 100)}%`;
}

/**
 * Render corong konversi redaksi dari artikel hingga hasil sukses.
 *
 * @param active - Jumlah artikel aktif siap salur.
 * @param tasks - Jumlah tugas antrean penerbitan.
 * @param succeeded - Jumlah hasil situs yang sukses.
 * @param className - Span bento dari grid induk.
 * @returns Tiga tahap berurutan dengan laju konversi antar tahap.
 */
export function ConversionFunnel({
  active,
  tasks,
  succeeded,
  className,
}: {
  readonly active: number;
  readonly tasks: number;
  readonly succeeded: number;
  readonly className?: string;
}) {
  const tahap = [
    { label: 'Artikel aktif', nilai: active, catatan: 'Naskah siap salur' },
    { label: 'Tugas antrean', nilai: tasks, catatan: `${persen(tasks, active)} dari artikel` },
    { label: 'Hasil sukses', nilai: succeeded, catatan: `${persen(succeeded, tasks)} dari tugas` },
  ];
  const maks = Math.max(active, tasks, succeeded, 1);
  return (
    <section
      aria-label="Corong konversi"
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6${className === undefined ? '' : ` ${className}`}`}
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Corong konversi
      </h2>
      <ol className="m-0 mt-4 list-none space-y-4 p-0">
        {tahap.map((item) => (
          <li key={item.label} className="grid min-w-0 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-[13px] font-medium text-paper">{item.label}</p>
              <p className="m-0 truncate font-sans text-xs text-paper-faint">{item.catatan}</p>
            </div>
            <span className="h-2 min-w-0 overflow-hidden rounded-full bg-bg-raised-2" role="presentation">
              <span
                className="block h-full rounded-full bg-brass transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max((item.nilai / maks) * 100, 2)}%` }}
              />
            </span>
            <span className="flex-none font-mono text-sm font-bold tabular-nums text-paper">
              {item.nilai.toLocaleString('id-ID')}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Render peringkat lima teratas satu dimensi analitik.
 *
 * @param title - Judul kartu peringkat.
 * @param rows - Titik analitik (`key` + `count`) yang belum terurut.
 * @param className - Span bento dari grid induk.
 * @returns Daftar berperingkat dengan bar proporsional; teks kosong bila nihil.
 */
export function TopRanked({
  title,
  rows,
  className,
}: {
  readonly title: string;
  readonly rows: readonly AnalyticsPoint[];
  readonly className?: string;
}) {
  const teratas = [...rows].sort((a, b) => b.count - a.count).slice(0, BATAS_BARIS);
  const maks = Math.max(...teratas.map((titik) => titik.count), 1);
  return (
    <section
      aria-label={title}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5${className === undefined ? '' : ` ${className}`}`}
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        {title}
      </h2>
      {teratas.length === 0 ? (
        <EmptyState title="Belum ada data." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ol className="m-0 mt-3 list-none space-y-2.5 p-0">
          {teratas.map((titik, peringkat) => (
            <li key={titik.key} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
              <span className="w-5 flex-none font-mono text-[11px] tabular-nums text-paper-faint">
                {peringkat + 1}
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate font-sans text-[13px] text-paper" title={titik.key}>
                  {titik.key}
                </p>
                <span className="mt-1 block h-1 min-w-0 overflow-hidden rounded-full bg-bg-raised-2" role="presentation">
                  <span
                    className="block h-full rounded-full bg-signal transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max((titik.count / maks) * 100, 2)}%` }}
                  />
                </span>
              </div>
              <span className="flex-none font-mono text-xs font-bold tabular-nums text-paper">
                {titik.count.toLocaleString('id-ID')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
