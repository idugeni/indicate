'use client';

import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { potongLabel } from '@/modules/dashboard/components/analytics/bantuan-grafik';

const BATAS_SITUS = 20;

interface Gelembung {
  readonly situs: string;
  readonly label: string;
  readonly total: number;
  readonly sukses: number;
}

/**
 * Render throughput vs tingkat sukses per situs sebagai gelembung.
 *
 * @param hasil - Titik `situs:status` dari proyeksi analitik.
 * @returns Kartu sebar: sumbu-x volume, sumbu-y persen sukses, ukuran gelembung volume.
 */
export function GelembungSitus({ hasil }: { readonly hasil: readonly AnalyticsPoint[] }) {
  const perSitus = new Map<string, { total: number; sukses: number }>();
  for (const titik of hasil) {
    const pisah = titik.key.indexOf(':');
    if (pisah < 0) continue;
    const situs = titik.key.slice(0, pisah);
    const status = titik.key.slice(pisah + 1);
    const slot = perSitus.get(situs) ?? { total: 0, sukses: 0 };
    slot.total += titik.count;
    if (status === 'published') slot.sukses += titik.count;
    perSitus.set(situs, slot);
  }
  const data: Gelembung[] = [...perSitus]
    .map(([situs, slot]) => ({
      situs,
      label: potongLabel(situs, 14),
      total: slot.total,
      sukses: slot.total > 0 ? Math.round((slot.sukses / slot.total) * 100) : 0,
    }))
    .sort((kiri, kanan) => kanan.total - kiri.total)
    .slice(0, BATAS_SITUS);
  return (
    <section
      aria-label="Gelembung situs"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Gelembung situs
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Volume vs persen sukses per situs
      </p>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada hasil situs.</p>
      ) : (
        <ChartContainer config={{ total: { label: 'Volume', color: '#6c93c9' } }} className="mt-4 h-64 w-full">
          <ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <XAxis
              type="number"
              dataKey="total"
              name="Volume"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              label={{ value: 'volume', position: 'insideBottomRight', fontSize: 10, fill: '#8b93a7' }}
            />
            <YAxis
              type="number"
              dataKey="sukses"
              name="Sukses"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              label={{ value: '% sukses', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8b93a7' }}
            />
            <ZAxis type="number" dataKey="total" range={[24, 220]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const pertama = payload?.[0]?.payload as Gelembung | undefined;
                    return pertama === undefined ? null : pertama.situs;
                  }}
                  formatter={(nilai, nama) => (
                    <span className="font-mono tabular-nums">
                      {typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')}
                      {' '}
                      {nama === 'sukses' ? '%' : ''}
                    </span>
                  )}
                />
              }
            />
            <Scatter data={data} fill="#6c93c9" fillOpacity={0.75} />
          </ScatterChart>
        </ChartContainer>
      )}
    </section>
  );
}
