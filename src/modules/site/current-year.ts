'use cache';

import { cacheLife } from 'next/cache';

/**
 * Calendar year (UTC) for the footer. Real-time values must never render
 * directly during prerender (blocking-prerender-current-time), so the result
 * is cached daily: identical for all readers until revalidation.
 *
 * File-level directive (not inline) so the module stays importable from
 * component chains that also enter the client bundle (auth forms use primitives
 * from auth-ui, which imports BrandPanel).
 */
export async function currentYear(): Promise<number> {
  cacheLife('days');
  return new Date().getUTCFullYear();
}
