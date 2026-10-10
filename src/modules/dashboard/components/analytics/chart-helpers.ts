import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import type { AnalyticsPoint, AnalyticsProjection, PublisherFlow, TaskDay } from '@/modules/dashboard/models';

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
 * Resolve dimension IDs to display labels using a projection's label maps.
 *
 * @param rows - Raw dimension points; missing dimensions read as empty.
 * @param labels - ID-to-name label map, or undefined when unavailable.
 * @returns Points whose keys are display labels, truncated to fit chart axes.
 */
const INTERNAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayDimension(value: string, fallback: string): string {
  return INTERNAL_UUID_PATTERN.test(value) ? fallback : truncateLabel(value, 24);
}

export function withLabels(
  rows: readonly AnalyticsPoint[] | undefined,
  labels: Readonly<Record<string, string>> | undefined,
): readonly AnalyticsPoint[] {
  return (rows ?? []).map((point) => ({ key: labels?.[point.key] ?? displayDimension(point.key, 'Entitas tidak tersedia'), count: point.count }));
}

/**
 * Resolve one site id to its display name, truncated to fit a chart axis.
 *
 * @param id - Site id from a projection point.
 * @param siteLabels - Tenant's site label map, or undefined when unavailable.
 * @returns Site display name, or a truncated id when the tenant has no label.
 */
export function siteLabel(id: string, siteLabels: Readonly<Record<string, string>> | undefined): string {
  return siteLabels?.[id] ?? displayDimension(id, 'Situs tidak tersedia');
}

/**
 * Replace the site half of a `site:state` outcome key with its display name.
 *
 * @param points - Outcome points keyed `siteId:state`.
 * @param siteLabels - Tenant's site label map, or undefined when unavailable.
 * @returns Points keyed `siteName:state`; a key without a separator is unchanged.
 */
export function labelOutcomes(
  points: readonly AnalyticsPoint[] | undefined,
  siteLabels: Readonly<Record<string, string>> | undefined,
): readonly AnalyticsPoint[] {
  return (points ?? []).map((point) => {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) return { key: displayDimension(point.key, 'Entitas tidak tersedia'), count: point.count };
    return { key: `${siteLabel(point.key.slice(0, separatorIndex), siteLabels)}:${point.key.slice(separatorIndex + 1)}`, count: point.count };
  });
}

/**
 * Replace publisher and site ids in publisher flow legs with display names.
 *
 * @param flows - Publisher to site to outcome flow legs from the projection.
 * @param publisherLabels - Tenant's publisher label map.
 * @param siteLabels - Tenant's site label map.
 * @returns The same legs, labelled for display.
 */
export function labelFlows(
  flows: readonly PublisherFlow[] | undefined,
  publisherLabels: Readonly<Record<string, string>> | undefined,
  siteLabels: Readonly<Record<string, string>> | undefined,
): readonly PublisherFlow[] {
  return (flows ?? []).map((flow) => ({
    penerbit: publisherLabels?.[flow.penerbit] ?? displayDimension(flow.penerbit, 'Penerbit tidak tersedia'),
    situs: siteLabel(flow.situs, siteLabels),
    hasil: flow.hasil,
    jumlah: flow.jumlah,
  }));
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
