const MOMENT = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Format an absolute moment for an audit row, a published article, or a job.
 *
 * @param value - ISO timestamp, or null when the moment was never recorded.
 * @returns The Indonesian long date with a short time, or null when absent.
 * @remarks An unparsable value returns null rather than echoing the raw string,
 * so a bad timestamp reads as missing instead of as data.
 */
export function formatMoment(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : MOMENT.format(parsed);
}
