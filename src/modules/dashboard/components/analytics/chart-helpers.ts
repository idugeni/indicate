import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const COLOR_PUBLISHED = '#5fcbb0';
export const COLOR_FAILED = '#d9705f';
export const COLOR_QUEUED = '#d8a94e';

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
