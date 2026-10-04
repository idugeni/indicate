/**
 * Narrow an unknown value to a string-keyed record.
 *
 * @param value - Value of unknown shape, usually a database row or parsed JSON.
 * @returns The value as a record, or null when it is not a plain object.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
