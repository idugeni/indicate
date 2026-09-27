import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import type { AnalyticsProjection, TaskDay } from '@/modules/dashboard/models';

export const COLOR_PUBLISHED = '#5fcbb0';
export const COLOR_FAILED = '#d9705f';
export const COLOR_QUEUED = '#d8a94e';

export const NO_PUBLICATION_TITLE = 'Belum ada satu pun terpublikasi.';

export const NO_PUBLICATION_DESCRIPTION =
  'Semua grafik di halaman ini diukur dari penerbitan nyata: artikel yang masuk antrean, AIM yang tersalin ke tiap situs portal, dan tayangan pembaca. Belum ada satu pun yang tercatat, jadi belum ada yang bisa diukur.';

/**
 * 12-color categorical palette for dashboard visuals on dark backgrounds.
 *
 * @remarks Order alternates hues (brass, green, blue, coral, purple, …)
 * so adjacent segments always contrast. The first six colors inherit
 * existing tokens and charts; the other six complete 12 categories
 * without repeating. Out-of-range indexes wrap modulo via `categoryColor`.
 */
export const CATEGORY_PALETTE: readonly string[] = [
  '#cc9a44',
  '#5fcbb0',
  '#6c93c9',
  '#d9705f',
  '#9d7bd8',
  '#d8a94e',
  '#4fb3a9',
  '#e08bb8',
  '#7ec850',
  '#5aa9e6',
  '#e6c15a',
  '#b8b8d0',
];

/**
 * Deterministic category color from the palette by index.
 *
 * @param index - Category position.
 * @returns Palette hex; negative or large indexes wrap modulo.
 */
export function categoryColor(index: number): string {
  const palette = CATEGORY_PALETTE;
  const position = ((Math.trunc(index) % palette.length) + palette.length) % palette.length;
  return palette[position] ?? '#8b93a7';
}

/**
 * Indonesian calendar axis label from a `YYYY-MM-DD` day (UTC).
 *
 * @param day - ISO day without time.
 * @returns Label as `d MMM` (id-ID); invalid input returns as-is.
 */
export function weekdayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return format(date, 'd MMM', { locale: id });
}

/**
 * Truncate long category labels for axes and legends.
 *
 * @param value - Raw label (e.g. site ID).
 * @param max - Maximum length before ellipsis; default 20.
 * @returns Truncated label with `…` when over the limit.
 */
export function truncateLabel(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isQuietTaskDay(point: TaskDay): boolean {
  return point.diterbitkan === 0 && point.gagal === 0 && point.antre === 0;
}

/**
 * Reports whether an analytics projection holds any measurement at all.
 *
 * @remarks The daily series are dense: every day in the window is present even when
 * nothing happened, so length alone is not a measurement and only a non-zero bucket
 * counts. Used to collapse a gallery of empty charts into one honest empty state.
 *
 * @remarks A cached dashboard snapshot may embed only part of the projection, so every
 * collection is read defensively: a missing one reads as empty rather than throwing.
 *
 * @param analytics - Tenant analytics projection, possibly partial.
 * @returns True when at least one collection carries a non-zero measurement.
 */
export function hasAnalyticsSignal(analytics: AnalyticsProjection): boolean {
  const rows = (value: readonly unknown[] | undefined): readonly unknown[] => value ?? [];
  return (
    rows(analytics.tugasHarian).some((point) => !isQuietTaskDay(point as TaskDay)) ||
    rows(analytics.penyaluranHarian).some((point) => !isQuietTaskDay(point as TaskDay)) ||
    rows(analytics.viewsHarian).some((point) => ((point as { views?: number }).views ?? 0) > 0) ||
    rows(analytics.articlesByRegion).length > 0 ||
    rows(analytics.articlesBySite).length > 0 ||
    rows(analytics.articlesByCategory).length > 0 ||
    rows(analytics.articlesByPublisher).length > 0 ||
    rows(analytics.jobsByState).length > 0 ||
    rows(analytics.outcomesBySiteAndState).length > 0 ||
    rows(analytics.aktivitasPerJam).length > 0 ||
    rows(analytics.aktivitasTerbaru).length > 0 ||
    rows(analytics.arusPenerbit).length > 0 ||
    rows(analytics.viewsBySite).length > 0 ||
    rows(analytics.viewsByArticle).length > 0
  );
}
