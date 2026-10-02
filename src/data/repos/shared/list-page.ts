/**
 * Bounded page of one admin list endpoint plus the opaque cursor of its last row.
 *
 * @param items - The records of the current page, newest first.
 * @param limit - Effective row ceiling applied at the source.
 */
export interface ListPage<T> {
  readonly items: readonly T[];
  readonly limit: number;
}

/**
 * Resolve an opaque cursor of the form `<createdAtIso>~<id>` into bind parameters.
 *
 * @returns Null for an absent or malformed cursor.
 */
export function parseCursor(cursor: string | undefined): { readonly createdAt: string; readonly id: string } | null {
  if (cursor === undefined || cursor === '') return null;
  const sep = cursor.indexOf('~');
  if (sep <= 0 || sep === cursor.length - 1) return null;
  const createdAt = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(Date.parse(createdAt)) || !/^[0-9a-fA-F-]{36}$/.test(id)) return null;
  return { createdAt: new Date(createdAt).toISOString(), id };
}

/**
 * Clamp the requested page size into `[1, max]`.
 */
export function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  if (limit === undefined || Number.isNaN(limit)) return fallback;
  return Math.min(Math.max(Math.floor(limit), 1), max);
}

/**
 * Encode the last row of a page so the caller can request the next one.
 */
export function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}~${id}`;
}

/**
 * Build a validated `{ limit, cursor }` from URL search params.
 */
export function pageFromSearchParams(url: URL): { readonly limit?: number; readonly cursor?: string } {
  const limit = url.searchParams.get('limit');
  const cursor = url.searchParams.get('cursor');
  const page: { limit?: number; cursor?: string } = {};
  if (limit !== null && Number.isInteger(Number(limit)) && Number(limit) > 0) page.limit = Number(limit);
  if (cursor !== null && cursor !== '') page.cursor = cursor;
  return page;
}
