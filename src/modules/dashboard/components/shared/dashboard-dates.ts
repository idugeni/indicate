import { format, formatDistance, startOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

function parseDate(iso: string): Date | null {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format an Indonesian calendar date for the dashboard.
 *
 * @param iso - ISO or raw date string from the API.
 * @returns Date as `d MMM yyyy` (id-ID); invalid input returns as-is.
 */
export function formatDate(iso: string): string {
  const parsed = parseDate(iso);
  if (parsed === null) return iso;
  return format(parsed, 'd MMM yyyy', { locale: id });
}

/**
 * Format a date with time for dashboard timestamps.
 *
 * @param iso - ISO or raw date string from the API.
 * @returns Date as `d MMM yyyy, HH.mm` (id-ID); invalid input returns as-is.
 */
export function formatDateTime(iso: string): string {
  const parsed = parseDate(iso);
  if (parsed === null) return iso;
  return format(parsed, 'd MMM yyyy, HH.mm', { locale: id });
}

/**
 * Relative time distance to now for dashboard timestamps.
 *
 * @param iso - ISO or raw date string from the API.
 * @param now - Reference time; defaults to `new Date()` in production.
 * @returns Phrase such as `3 jam lalu`; invalid input returns as-is.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const parsed = parseDate(iso);
  if (parsed === null) return iso;
  return formatDistance(parsed, now, { locale: id, addSuffix: true, includeSeconds: true });
}

export type RangePreset = 'today' | '7-days' | '30-days';

export interface RangeIso {
  readonly from: string;
  readonly to: string;
}

/**
 * ISO range ready for analytics/telemetry filters from a single preset.
 *
 * @param preset - One of `today`, `7-days`, or `30-days`.
 * @param now - Reference time; defaults to `new Date()` in production.
 * @returns `from`/`to` ISO pair; `to` is always the reference time.
 */
export function presetRange(preset: RangePreset, now: Date = new Date()): RangeIso {
  const to = now.toISOString();
  if (preset === 'today') return { from: startOfDay(now).toISOString(), to };
  const days = preset === '7-days' ? 6 : 29;
  return { from: startOfDay(subDays(now, days)).toISOString(), to };
}
