'use client';

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { categoryColor } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

interface Dimension {
  readonly title: string;
  readonly color: string;
  readonly rows: readonly { readonly key: string; readonly count: number }[];
}

const ROW_LIMIT = 10;

function truncateLabel(value: string): string {
  return value.length > 20 ? `${value.slice(0, 19)}…` : value;
}

/**
 * Render network telemetry distributions as bar charts.
 *
 * @param data - Per-organization analytics projection from the workspace endpoint.
 * @returns Card grid; null when every dimension is empty.
 */
export function TelemetryCharts({ data }: { readonly data: AnalyticsProjection }) {
  const dimensions: readonly Dimension[] = [
    { title: 'Artikel per wilayah', color: '#cc9a44', rows: data.articlesByRegion },
    { title: 'Artikel per kategori', color: '#6c93c9', rows: data.articlesByCategory },
    { title: 'Artikel per penerbit', color: '#5fcbb0', rows: data.articlesByPublisher },
    { title: 'Tugas per status', color: '#d8a94e', rows: data.jobsByState },
    { title: 'Hasil per situs', color: '#cc9a44', rows: data.outcomesBySiteAndState },
  ];

  if (dimensions.every(({ rows }) => rows.length === 0)) return null;

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {dimensions.map(({ title, color, rows }) => {
        const topRows = [...rows].sort((a, b) => b.count - a.count).slice(0, ROW_LIMIT);
        const total = rows.reduce((count, point) => count + point.count, 0);
        const restCount = rows.length - topRows.length;
        return (
          <section
            key={title}
            aria-label={title}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                {title}
              </h2>
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                {total.toLocaleString('id-ID')} total
              </p>
            </div>
            {topRows.length === 0 ? (
              <EmptyState title="Belum ada data." description="Data akan tampil di sini setelah tersedia." />
            ) : (
              <ChartContainer
                config={{ count: { label: title, color } }}
                className="mt-4 max-h-64 w-full"
              >
                <BarChart data={topRows} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="key"
                    type="category"
                    width={132}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: string) => truncateLabel(value)}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                        }
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[2, 2, 2, 2]}>
                    {topRows.map((point, rank) => (
                      <Cell key={point.key} fill={categoryColor(rank)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
            {restCount > 0 ? (
              <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
                +{restCount} lainnya
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
