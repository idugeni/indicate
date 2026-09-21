'use client';

import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { truncateLabel } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const SITE_LIMIT = 20;

interface Bubble {
  readonly site: string;
  readonly label: string;
  readonly total: number;
  readonly succeeded: number;
}

/**
 * Render throughput vs success rate per site as bubbles.
 *
 * @param results - `site:status` points from the analytics projection.
 * @returns Scatter card: x-axis volume, y-axis success percent, bubble size volume.
 */
export function SiteBubbles({ results }: { readonly results: readonly AnalyticsPoint[] }) {
  const bySite = new Map<string, { total: number; succeeded: number }>();
  for (const point of results) {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) continue;
    const siteId = point.key.slice(0, separatorIndex);
    const status = point.key.slice(separatorIndex + 1);
    const slot = bySite.get(siteId) ?? { total: 0, succeeded: 0 };
    slot.total += point.count;
    if (status === 'published') slot.succeeded += point.count;
    bySite.set(siteId, slot);
  }
  const data: Bubble[] = [...bySite]
    .map(([siteId, slot]) => ({
      site: siteId,
      label: truncateLabel(siteId, 14),
      total: slot.total,
      succeeded: slot.total > 0 ? Math.round((slot.succeeded / slot.total) * 100) : 0,
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, SITE_LIMIT);
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
        <EmptyState title="Belum ada hasil situs." description="Data akan tampil di sini setelah tersedia." />
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
              dataKey="succeeded"
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
                    const first = payload?.[0]?.payload as Bubble | undefined;
                    return first === undefined ? null : first.site;
                  }}
                  formatter={(value, name) => (
                    <span className="font-mono tabular-nums">
                      {typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')}
                      {' '}
                      {name === 'succeeded' ? '%' : ''}
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
