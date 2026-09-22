'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';
import type { ActivityHour, TaskDay } from '@/modules/dashboard/models';
import { weekdayLabel } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

function scale(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return 0.22 + 0.78 * (value / max);
}

/**
 * Render an activity heatmap per day and hour (Asia/Jakarta).
 *
 * @param cells - Nonzero activity cells from the analytics projection.
 * @returns 7x24 grid with color intensity.
 */
export function ActivityHeatmap({ cells }: { readonly cells: readonly ActivityHour[] }) {
  const cellMap = new Map(cells.map((point) => [`${point.hari}:${point.jam}`, point.jumlah]));
  const max = Math.max(...cells.map((point) => point.jumlah), 1);
  const hours = Array.from({ length: 24 }, (_, value) => value);
  return (
    <section
      aria-label="Peta panas"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Peta panas
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Intensitas hasil per hari dan jam (WIB)
      </p>
      <div className="mt-4 space-y-1 overflow-x-auto">
        <div className="grid min-w-[30rem] grid-cols-[3.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
          <span className="sticky left-0 bg-bg-raised" />
          {hours.map((value) =>
            value % 6 === 0 ? (
              <span key={value} className="text-center font-mono text-[10px] tabular-nums text-paper-faint">
                {String(value).padStart(2, '0')}
              </span>
            ) : (
              <span key={value} />
            ),
          )}
        </div>
        {DAY_NAMES.map((name, day) => (
          <div key={name} className="grid min-w-[30rem] grid-cols-[3.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
            <span className="sticky left-0 truncate bg-bg-raised pr-1 font-sans text-[11px] text-paper-dim">{name}</span>
            {hours.map((value) => {
              const count = cellMap.get(`${day}:${value}`) ?? 0;
              return (
                <ChartTip key={value} tip={`${name} ${String(value).padStart(2, '0')}:00 — ${count}`}>
                  <span
                    className="h-4 w-full rounded-[3px]"
                    style={
                      count === 0
                        ? undefined
                        : { backgroundColor: '#d8a94e', opacity: scale(count, max) }
                    }
                  />
                </ChartTip>
              );
            })}
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 font-mono text-[11px] tabular-nums text-paper-faint">
        Puncak: {max.toLocaleString('id-ID')} per jam
      </p>
    </section>
  );
}

/**
 * Render a daily publication activity calendar.
 *
 * @param series - Daily buckets from the analytics projection.
 * @returns Week x day grid with a 30/90-day switch.
 */
export function ActivityCalendar({ series }: { readonly series: readonly TaskDay[] }) {
  const [range, setRange] = useState<number>(90);
  const visible = series.slice(-range);
  const total = (point: TaskDay): number => point.diterbitkan + point.gagal + point.antre;
  const max = Math.max(...visible.map(total), 1);
  const leadingEmpty = visible.length === 0 ? 0 : (new Date(`${visible[0]?.hari ?? ''}T00:00:00Z`).getUTCDay() + 6) % 7;
  const leadingCount = Number.isNaN(leadingEmpty) ? 0 : leadingEmpty;
  const padded: readonly (TaskDay | null)[] = [...Array<TaskDay | null>(leadingCount).fill(null), ...visible];
  const columns: (TaskDay | null)[][] = [];
  padded.forEach((point, index) => {
    const column = Math.floor(index / 7);
    columns[column] = [...(columns[column] ?? []), point];
  });
  const totalAll = visible.reduce((count, point) => count + total(point), 0);
  return (
    <section
      aria-label="Kalender aktivitas"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Kalender aktivitas
          </h2>
          <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
            {totalAll.toLocaleString('id-ID')} tugas dalam rentang
          </p>
        </div>
        <div role="group" aria-label="Rentang kalender" className="flex items-center gap-1.5">
          {[30, 90].map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={`font-mono text-[11px] tabular-nums ${
                range === option
                  ? 'border-brass/60 bg-bg-raised-2 text-paper'
                  : 'border-hairline text-paper-faint hover:border-hairline-strong hover:text-paper'
              }`}
            >
              {option}h
            </Button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="Belum ada data deret waktu." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {columns.map((column, index) => (
            <div key={index} className="flex flex-1 flex-col gap-1">
              {column.map((point, row) =>
                point === null ? (
                  <span key={row} className="h-3.5 w-full rounded-[3px]" />
                ) : (
                  <ChartTip key={row} tip={`${weekdayLabel(point.hari)} — ${total(point)}`}>
                    <span
                      className="h-3.5 w-full rounded-[3px] bg-bg-raised-2"
                      style={
                        total(point) === 0
                          ? undefined
                          : { backgroundColor: '#5fcbb0', opacity: scale(total(point), max) }
                      }
                    />
                  </ChartTip>
                ),
              )}
            </div>
          ))}
        </div>
      )}
      <p className="m-0 mt-3 flex items-center gap-2 font-mono text-[11px] tabular-nums text-paper-faint">
        Sepi
        <span className="inline-block h-3 w-3 rounded-[3px] bg-bg-raised-2" aria-hidden="true" />
        <span className="inline-block h-3 w-3 rounded-[3px] bg-signal/40" aria-hidden="true" />
        <span className="inline-block h-3 w-3 rounded-[3px] bg-signal" aria-hidden="true" />
        Ramai
      </p>
    </section>
  );
}
