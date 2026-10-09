import { parsePageviewKey } from '@/modules/site/pageview-contract';

export interface FlushEntry {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
  readonly count: number;
}
export type FlushDelta = Map<string, FlushEntry & { count: number }>;
export const VIEW_FLUSH_MAX_SCAN_PAGES = 500;

export function collectPoppedDeltas(pairs: readonly string[]): {
  readonly deltas: FlushDelta;
  readonly invalidKeys: readonly string[];
} {
  const deltas: FlushDelta = new Map();
  const invalidKeys: string[] = [];
  for (let index = 0; index + 1 < pairs.length; index += 2) {
    const key = pairs[index]!;
    const count = Number(pairs[index + 1]);
    const identity = parsePageviewKey(key);
    if (identity === null || !Number.isFinite(count) || count <= 0) {
      invalidKeys.push(key);
      continue;
    }
    const { organizationId, siteId, articleSiteId } = identity;
    const existing = deltas.get(key);
    deltas.set(key, {
      organizationId: existing?.organizationId ?? organizationId,
      siteId: existing?.siteId ?? siteId,
      articleSiteId: existing?.articleSiteId ?? articleSiteId,
      count: (existing?.count ?? 0) + count,
    });
  }
  return { deltas, invalidKeys };
}
