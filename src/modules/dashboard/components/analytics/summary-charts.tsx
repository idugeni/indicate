'use client';

import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { cn } from '@/ui/cn';

const STATUS_COLORS: Record<string, string> = {
  queued: '#d8a94e',
  processing: '#6c93c9',
  published: '#5fcbb0',
  failed: '#d9705f',
  retrying: '#cc9a44',
};

const RESULT_COLORS: Record<string, string> = {
  berhasil: '#5fcbb0',
  gagal: '#d9705f',
};

interface Slice {
  readonly name: string;
  readonly value: number;
  readonly color: string;
}

/**
 * Render a distribution donut for one summary dimension.
 *
 * @param title - Visible card title.
 * @param slices - Donut slices with dark-token colors.
 * @param emptyText - Replacement text when the total is zero.
 * @param className - Parent-grid bento span.
 * @returns Donut card with an id-ID numeric legend.
 */
function Donut({
  title,
  slices,
  emptyText,
  className,
}: {
  readonly title: string;
  readonly slices: readonly Slice[];
  readonly emptyText: string;
  readonly className?: string;
}) {
  const total = slices.reduce((count, slice) => count + slice.value, 0);
  return (
    <section
      aria-label={title}
      className={cn('flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          {title}
        </h2>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {total === 0 ? (
        <EmptyState title={emptyText} description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <ChartContainer config={{ value: { label: title } }} className="aspect-square w-36 flex-none sm:w-40">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                    }
                  />
                }
              />
              <Pie
                data={[...slices]}
                dataKey="value"
                nameKey="name"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={2}
                strokeWidth={0}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="m-0 min-w-0 flex-1 list-none space-y-1.5 p-0">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 flex-none rounded-[2px]"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-wider text-paper-dim" title={slice.name}>
                  {slice.name}
                </span>
                <span className="flex-none font-mono text-xs font-bold tabular-nums text-paper">
                  {slice.value.toLocaleString('id-ID')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Render the main dashboard summary visuals from the organization snapshot.
 *
 * @param jobs - Publishing task counts by status.
 * @param succeeded - Successful site outcome count.
 * @param failed - Failed site outcome count.
 * @param active - Active article count.
 * @param archived - Archived article count.
 * @returns Fragment of three donut cards ready for the parent bento layout.
 */
export function SummaryCharts({
  jobs,
  succeeded,
  failed,
  active,
  archived,
}: {
  readonly jobs: Readonly<Record<string, number>>;
  readonly succeeded: number;
  readonly failed: number;
  readonly active: number;
  readonly archived: number;
}) {
  return (
    <>
      <Donut
        title="Distribusi antrean"
        emptyText="Belum ada tugas penerbitan. Tugas antrean akan terisi setelah artikel pertama dijadwalkan."
        className="sm:col-span-2 lg:col-span-5"
        slices={Object.entries(jobs).map(([status, value]) => ({
          name: status,
          value: Number(value),
          color: STATUS_COLORS[status] ?? '#8b93a7',
        }))}
      />
      <Donut
        title="Komposisi hasil"
        emptyText="Belum ada hasil penyaluran. Hasil situs akan diringkas di sini setelah antrean pertama berjalan."
        className="sm:col-span-1 lg:col-span-4"
        slices={[
          { name: 'berhasil', value: succeeded, color: RESULT_COLORS.berhasil ?? '#5fcbb0' },
          { name: 'gagal', value: failed, color: RESULT_COLORS.gagal ?? '#d9705f' },
        ]}
      />
      <Donut
        title="Komposisi artikel"
        emptyText="Belum ada artikel. Tulis naskah perdana dari ruang redaksi."
        className="sm:col-span-1 lg:col-span-3"
        slices={[
          { name: 'aktif', value: active, color: '#cc9a44' },
          { name: 'arsip', value: archived, color: '#8b93a7' },
        ]}
      />
    </>
  );
}

/**
 * Render a delivery success-rate ring.
 *
 * @param succeeded - Successful site outcome count.
 * @param failed - Failed site outcome count.
 * @param className - Parent-grid bento span.
 * @returns Radial card with a centered percent figure.
 */
export function SuccessRate({
  succeeded,
  failed,
  className,
}: {
  readonly succeeded: number;
  readonly failed: number;
  readonly className?: string;
}) {
  const total = succeeded + failed;
  const rate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  return (
    <section
      aria-label="Tingkat keberhasilan"
      className={cn('flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          Tingkat keberhasilan
        </h2>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} hasil
        </p>
      </div>
      {total === 0 ? (
        <EmptyState title="Belum ada hasil penyaluran." description="Cincin terisi setelah antrean pertama berjalan." />
      ) : (
        <>
          <div className="relative mx-auto mt-2 w-full max-w-52">
            <ChartContainer config={{ rate: { label: 'Keberhasilan', color: '#5fcbb0' } }} className="aspect-square w-full">
              <RadialBarChart
                data={[{ name: 'sukses', rate }]}
                startAngle={90}
                endAngle={-270}
                innerRadius="74%"
                outerRadius="100%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  dataKey="rate"
                  cornerRadius={8}
                  fill="var(--color-rate)"
                  background={{ fill: '#1c2436' }}
                  angleAxisId={0}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === 'number' ? `${value}%` : String(value ?? '')
                      }
                    />
                  }
                />
              </RadialBarChart>
            </ChartContainer>
            <p className="pointer-events-none absolute inset-0 m-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-paper">
                {rate}
                <span className="text-base font-medium text-paper-faint">%</span>
              </span>
              <span className="font-sans text-xs text-paper-faint">sukses</span>
            </p>
          </div>
          <dl className="m-0 mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <dt className="font-sans text-xs text-paper-dim">Berhasil</dt>
              <dd className="m-0 font-mono text-xs font-bold tabular-nums text-signal">
                {succeeded.toLocaleString('id-ID')}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-sans text-xs text-paper-dim">Gagal</dt>
              <dd className="m-0 font-mono text-xs font-bold tabular-nums text-error">
                {failed.toLocaleString('id-ID')}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
