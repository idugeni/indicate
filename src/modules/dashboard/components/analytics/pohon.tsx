'use client';

import { Treemap } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { PALET_KATEGORI } from '@/modules/dashboard/components/analytics/bantuan-grafik';

const BATAS_SEGMEN = 12;

/**
 * Render distribusi volume sebagai treemap.
 *
 * @param judul - Judul kartu yang tampil.
 * @param baris - Titik dimensi (`key` + `count`).
 * @param kosong - Teks pengganti saat nihil.
 * @returns Kartu treemap 12 segmen teratas.
 */
export function PetaPohon({
  judul,
  baris,
  kosong,
}: {
  readonly judul: string;
  readonly baris: readonly AnalyticsPoint[];
  readonly kosong: string;
}) {
  const data = [...baris]
    .sort((kiri, kanan) => kanan.count - kiri.count)
    .slice(0, BATAS_SEGMEN)
    .map((titik) => ({ name: titik.key, size: titik.count }));
  const total = data.reduce((jumlah, segmen) => jumlah + segmen.size, 0);
  return (
    <section
      aria-label={judul}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          {judul}
        </h2>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">{kosong}</p>
      ) : (
        <ChartContainer config={{}} className="mt-4 h-64 w-full">
          <Treemap data={data} dataKey="size" stroke="#0e1320" fill="#cc9a44" colorPanel={[...PALET_KATEGORI]}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(nilai, nama) => (
                    <span className="font-mono tabular-nums">
                      {typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')}
                      {' · '}
                      {String(nama ?? '')}
                    </span>
                  )}
                />
              }
            />
          </Treemap>
        </ChartContainer>
      )}
    </section>
  );
}
