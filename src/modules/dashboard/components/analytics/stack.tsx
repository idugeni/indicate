'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TaskDay } from '@/modules/dashboard/models';
import { COLOR_PUBLISHED, COLOR_FAILED, COLOR_QUEUED, weekdayLabel } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

/**
 * Render daily task composition as stacked bars.
 *
 * @param series - Daily buckets from the analytics projection (max 90 days).
 * @returns Bar card for the trailing 30 days by task status.
 */
export function StackedTasks({ series }: { readonly series: readonly TaskDay[] }) {
  const data = series.slice(-30).map((point) => ({
    label: weekdayLabel(point.hari),
    Diterbitkan: point.diterbitkan,
    Gagal: point.gagal,
    Antre: point.antre,
  }));
  return (
    <section
      aria-label="Tugas bertumpuk"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Tugas bertumpuk
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Diterbitkan, gagal, dan antre per hari
      </p>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data deret waktu." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer
          config={{
            Diterbitkan: { label: 'Diterbitkan', color: COLOR_PUBLISHED },
            Gagal: { label: 'Gagal', color: COLOR_FAILED },
            Antre: { label: 'Antre', color: COLOR_QUEUED },
          }}
          className="mt-4 h-64 w-full"
        >
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Bar dataKey="Diterbitkan" stackId="tugas" fill="var(--color-Diterbitkan)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Gagal" stackId="tugas" fill="var(--color-Gagal)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Antre" stackId="tugas" fill="var(--color-Antre)" radius={[3, 3, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}
