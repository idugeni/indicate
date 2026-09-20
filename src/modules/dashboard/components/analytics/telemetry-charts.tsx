'use client';

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { warnaKategori } from '@/modules/dashboard/components/analytics/bantuan-grafik';

interface Dimensi {
  readonly judul: string;
  readonly warna: string;
  readonly baris: readonly { readonly key: string; readonly count: number }[];
}

const BATAS_BARIS = 10;

function potongLabel(nilai: string): string {
  return nilai.length > 20 ? `${nilai.slice(0, 19)}…` : nilai;
}

/**
 * Render distribusi telemetri jaringan sebagai diagram batang.
 *
 * @param data - Proyeksi analitik per organisasi dari endpoint workspace.
 * @returns Grid kartu diagram; null saat seluruh dimensi kosong.
 */
export function TelemetryCharts({ data }: { readonly data: AnalyticsProjection }) {
  const dimensi: readonly Dimensi[] = [
    { judul: 'Artikel per wilayah', warna: '#cc9a44', baris: data.articlesByRegion },
    { judul: 'Artikel per kategori', warna: '#6c93c9', baris: data.articlesByCategory },
    { judul: 'Artikel per penerbit', warna: '#5fcbb0', baris: data.articlesByPublisher },
    { judul: 'Tugas per status', warna: '#d8a94e', baris: data.jobsByState },
    { judul: 'Hasil per situs', warna: '#cc9a44', baris: data.outcomesBySiteAndState },
  ];

  if (dimensi.every(({ baris }) => baris.length === 0)) return null;

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {dimensi.map(({ judul, warna, baris }) => {
        const teratas = [...baris].sort((a, b) => b.count - a.count).slice(0, BATAS_BARIS);
        const total = baris.reduce((jumlah, titik) => jumlah + titik.count, 0);
        const sisa = baris.length - teratas.length;
        return (
          <section
            key={judul}
            aria-label={judul}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                {judul}
              </h2>
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                {total.toLocaleString('id-ID')} total
              </p>
            </div>
            {teratas.length === 0 ? (
              <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data.</p>
            ) : (
              <ChartContainer
                config={{ count: { label: judul, color: warna } }}
                className="mt-4 max-h-64 w-full"
              >
                <BarChart data={teratas} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="key"
                    type="category"
                    width={132}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(nilai: string) => potongLabel(nilai)}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(nilai) =>
                          typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                        }
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[2, 2, 2, 2]}>
                    {teratas.map((titik, peringkat) => (
                      <Cell key={titik.key} fill={warnaKategori(peringkat)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
            {sisa > 0 ? (
              <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
                +{sisa} lainnya
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
