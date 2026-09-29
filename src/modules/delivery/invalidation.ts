import type { InvalidationPlan, InvalidationTask } from '@/modules/delivery/models';
import type { NextCacheInvalidationPort } from '@/modules/delivery/ports';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { logEvent } from '@/core/observability/logger';

export type NetworkMutation =
  | { readonly kind: 'article' | 'publication'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlug: string; readonly categorySlug?: string }
  | { readonly kind: 'site_settings' | 'media'; readonly organizationId: string; readonly siteId: string; readonly hostname: string }
  | { readonly kind: 'hostname'; readonly organizationId: string; readonly siteId: string; readonly previousHostname: string | null; readonly currentHostname: string | null }
  | { readonly kind: 'publisher'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlugs: readonly string[] };

const sitePaths = ['/', '/kebijakan-privasi', '/syarat-ketentuan', '/tentang', '/kontak', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', '/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report'];
const HOST_TAG_PREFIX = 'host:';

/**
 * Run `worker` over `items` keeping at most `limit` calls in flight, preserving input order.
 *
 * @param items - Work items to process.
 * @param limit - Maximum number of concurrent calls; must be at least 1.
 * @param worker - Per-item operation; its resolved value is returned in input order.
 * @returns One result per item, in the order the items were given.
 * @throws {RangeError} If `limit` is below 1.
 *
 * @remarks A dispatch batch is bounded by the claim lease, so a sequential loop
 * over `batch_size` tasks can outlive the lease it was claimed under. The claim
 * SQL then re-selects the same rows with a fresh token and the batch repeats
 * forever without completing anything. Overlapping a few calls keeps the batch
 * inside the lease. The ceiling stays well under `DEFAULT_POOL_MAX` because each
 * step awaits the database, and a saturated pool does not reject queued queries,
 * it never dispatches them.
 */
async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<readonly R[]> {
  if (limit < 1) throw new RangeError('limit must be at least 1');
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let index = cursor++; index < items.length; index = cursor++) {
      results[index] = await worker(items[index] as T);
    }
  });
  await Promise.all(runners);
  return results;
}
const ARTICLE_TAG_PREFIX = 'article:';
/**
 * Hard ceiling on exact-URL purges per dispatch.
 *
 * @remarks `purgeExactUrls` issues its provider calls sequentially in chunks of
 * 30, so this ceiling bounds one dispatch to at most ten provider calls. A
 * network-wide publication produces apex tasks that each carry a few hundred
 * URLs, and an unbounded batch could exhaust the function budget before a
 * single task completes, which re-claims the same heavy tasks forever.
 */
const PURGE_URL_BUDGET = 300;

function articleWarmUrls(tags: readonly string[]): readonly string[] {
  const hosts = tags
    .filter((tag) => tag.startsWith(HOST_TAG_PREFIX))
    .map((tag) => tag.slice(HOST_TAG_PREFIX.length))
    .filter((host) => host !== '');
  const slugs = tags
    .filter((tag) => tag.startsWith(ARTICLE_TAG_PREFIX))
    .map((tag) => tag.slice(ARTICLE_TAG_PREFIX.length))
    .filter((slug) => slug !== '');
  return hosts.flatMap((host) => slugs.map((slug) => `https://${host}/${slug}`));
}

/**
 * Order purge candidates so freshly published article URLs survive the budget.
 *
 * @param tasks - Claimed invalidation tasks.
 * @returns Unique URLs, article URLs first, then the static and brand paths.
 * @remarks A deferred URL is not lost: the edge TTL is 60 seconds and Next
 * revalidation already ran, so the worst case is one TTL of staleness on a
 * static path instead of an unbounded provider stall.
 */
function purgeOrder(tasks: readonly InvalidationTask[]): readonly string[] {
  const articleFirst: string[] = [];
  const remainder: string[] = [];
  for (const task of tasks) {
    const warm = new Set(articleWarmUrls(task.tags));
    for (const url of task.urls) (warm.has(url) ? articleFirst : remainder).push(url);
  }
  return [...new Set([...articleFirst, ...remainder])];
}

export function planInvalidation(mutation: NetworkMutation): InvalidationPlan {
  const hostnames = mutation.kind === 'hostname' ? [mutation.previousHostname, mutation.currentHostname].filter((value): value is string => value !== null) : [mutation.hostname];
  const articleSlugs = mutation.kind === 'article' || mutation.kind === 'publication' ? [mutation.articleSlug] : mutation.kind === 'publisher' ? [...mutation.articleSlugs] : [];
  const paths = new Set(sitePaths);
  for (const slug of articleSlugs) {
    paths.add(`/${slug}`);
  }
  if ((mutation.kind === 'article' || mutation.kind === 'publication') && mutation.categorySlug !== undefined) paths.add(`/categories/${mutation.categorySlug}`);
  const tags = new Set([`org:${mutation.organizationId}`, `site:${mutation.siteId}`, ...hostnames.map((host) => `host:${host}`), ...articleSlugs.map((slug) => `article:${slug}`)]);
  return Object.freeze({ organizationId: mutation.organizationId, siteId: mutation.siteId, previousHostname: mutation.kind === 'hostname' ? mutation.previousHostname : null, currentHostname: mutation.kind === 'hostname' ? mutation.currentHostname : mutation.hostname, tags: [...tags].sort(), paths: [...paths].sort(), urls: hostnames.flatMap((host) => [...paths].map((path) => `https://${host}${path}`)).sort(), reason: mutation.kind });
}

/**
 * Dispatch claimed invalidation tasks through Next cache and edge purge.
 *
 * @remarks One edge purge per batch (unique URLs across tasks): per-host per-task purges would trigger a thundering-herd to the origin, while the edge TTL is only 60 seconds. A purge failure does not fail the task; Next revalidate is the primary mechanism and the edge recovers on its own within one TTL. The purge set is bounded by `PURGE_URL_BUDGET` and ordered so article URLs are never the ones deferred. A poison task does not stop the batch: a failed complete is recorded via fail, and a fail that also fails counts as stranded.
 */
export class InvalidationDispatcher {
  constructor(private readonly repository: Pick<DeliveryRepository, 'claimInvalidations' | 'completeInvalidation' | 'failInvalidation'>, private readonly nextCache: NextCacheInvalidationPort, private readonly cloudflare: CloudflareAuthorityPort, private readonly retryDelaysSeconds: readonly number[], private readonly maxAttempts: number, private readonly leaseSeconds: number) {}

  async dispatch(now: Date, limit: number): Promise<{ completed: number; failed: number; stranded: number }> {
    const tasks = await this.repository.claimInvalidations(now.toISOString(), limit, this.leaseSeconds);
    const urls = purgeOrder(tasks);
    const budgeted = urls.slice(0, PURGE_URL_BUDGET);
    const deferred = urls.length - budgeted.length;
    if (budgeted.length > 0) {
      try {
        await this.cloudflare.purgeExactUrls(budgeted);
      } catch {
        /* left to expire via the edge TTL; the task still completes below */
      }
    }
    if (deferred > 0) {
      logEvent('warn', { event: 'delivery.invalidation.purge_deferred', context: { requested: urls.length, purged: budgeted.length, deferred, budget: PURGE_URL_BUDGET } });
    }
    let completed = 0; let failed = 0; let stranded = 0;
    const outcomes = await mapWithConcurrency(tasks, 4, async (task) => {
      let step = 'revalidate';
      try {
        await this.nextCache.revalidateTags(task.tags); await this.nextCache.revalidatePaths(task.paths);
        step = 'complete';
        await this.repository.completeInvalidation(task, now.toISOString());
        return 'completed' as const;
      } catch {
        try {
          const terminal = task.attempts + 1 >= this.maxAttempts;
          const seconds = this.retryDelaysSeconds[Math.min(task.attempts, this.retryDelaysSeconds.length - 1)] ?? 60;
          await this.repository.failInvalidation(task, { code: 'provider_unavailable', step }, new Date(now.getTime() + seconds * 1_000).toISOString(), terminal, now.toISOString());
          return 'failed' as const;
        } catch {
          return 'stranded' as const;
        }
      }
    });
    for (const outcome of outcomes) {
      if (outcome === 'completed') completed += 1;
      else if (outcome === 'failed') failed += 1;
      else stranded += 1;
    }
    return { completed, failed, stranded };
  }
}
