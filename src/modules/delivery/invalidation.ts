import type { InvalidationPlan, InvalidationTask } from '@/modules/delivery/models';
import type { NextCacheInvalidationPort } from '@/modules/delivery/ports';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { DeliveryRepository, SocialWarmLedger, SocialWarmTarget } from '@/modules/delivery/ports';
import type { SocialWarmer } from '@/modules/delivery/social-warm';
import { logEvent } from '@/core/observability/logger';

export type NetworkMutation =
  | { readonly kind: 'article' | 'publication'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlug: string; readonly categorySlug?: string }
  | { readonly kind: 'site_settings' | 'media'; readonly organizationId: string; readonly siteId: string; readonly hostname: string }
  | { readonly kind: 'hostname'; readonly organizationId: string; readonly siteId: string; readonly previousHostname: string | null; readonly currentHostname: string | null }
  | { readonly kind: 'publisher'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlugs: readonly string[] };

const sitePaths = ['/', '/kebijakan-privasi', '/syarat-ketentuan', '/tentang', '/kontak', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', '/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report'];
const HOST_TAG_PREFIX = 'host:';
const ARTICLE_TAG_PREFIX = 'article:';
const WARM_BATCH_SIZE = 8;
const WARM_QUEUE_LIMIT = 64;
const WARM_BUDGET_MS = 15_000;
const WARM_FAILURE_LOG_LIMIT = 10;
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

/**
 * Warm queued article URLs in parallel batches and report every outcome.
 *
 * @param targets - Due article URLs collected from the ledger.
 * @param warmer - Page, image, and Facebook pre-scrape warmer.
 * @returns Article site ids whose Meta scrape succeeded, ready to be marked.
 * @remarks Batch width stays at `WARM_BATCH_SIZE` so parallel fetches cannot
 * outlive the publication function budget, but the queue is drained across
 * batches instead of truncated at the first one. The `WARM_QUEUE_LIMIT` and
 * `WARM_BUDGET_MS` ceilings bound a pathological batch and both report the
 * remainder rather than dropping it silently; a dropped target stays unmarked
 * in the ledger, so the next dispatch serves it again. A single batch can still
 * overrun its slice because each warm issues up to three sequential fetches
 * bounded by the warmer's own timeouts.
 */
async function drainSocialWarm(targets: readonly SocialWarmTarget[], warmer: Pick<SocialWarmer, 'warmArticle'>): Promise<readonly string[]> {
  const startedAt = Date.now();
  const warmed: string[] = [];
  const failures: { url: string; pageOk: boolean; imageOk: boolean; facebookOk: boolean }[] = [];
  let attempted = 0;
  let truncated = 0;
  for (let offset = 0; offset < targets.length; offset += WARM_BATCH_SIZE) {
    if (offset >= WARM_QUEUE_LIMIT || Date.now() - startedAt >= WARM_BUDGET_MS) {
      truncated = targets.length - offset;
      break;
    }
    const batch = targets.slice(offset, Math.min(offset + WARM_BATCH_SIZE, WARM_QUEUE_LIMIT));
    const outcomes = await Promise.allSettled(batch.map((target) => warmer.warmArticle(target.url)));
    for (const [index, outcome] of outcomes.entries()) {
      const target = batch[index];
      if (target === undefined) continue;
      attempted += 1;
      if (outcome.status === 'rejected') {
        failures.push({ url: target.url, pageOk: false, imageOk: false, facebookOk: false });
        continue;
      }
      const { pageOk, imageOk, facebookOk } = outcome.value;
      if (!pageOk || !imageOk || !facebookOk) failures.push({ url: target.url, pageOk, imageOk, facebookOk });
      if (facebookOk) warmed.push(target.articleSiteId);
    }
  }
  if (failures.length > 0) {
    logEvent('warn', {
      event: 'delivery.social_warm.incomplete',
      context: { attempted, failed: failures.length, failures: failures.slice(0, WARM_FAILURE_LOG_LIMIT) },
    });
  }
  if (truncated > 0) {
    logEvent('warn', { event: 'delivery.social_warm.truncated', context: { attempted, truncated, budgetMs: WARM_BUDGET_MS } });
  }
  if (failures.length === 0 && truncated === 0) {
    logEvent('info', { event: 'delivery.social_warm.complete', context: { attempted, durationMs: Date.now() - startedAt } });
  }
  return warmed;
}

/**
 * Serve the ledger's due article URLs and record the ones Meta accepted.
 *
 * @remarks Never throws. A ledger or provider failure leaves its targets due,
 * so the next dispatch retries them instead of losing the single warm each URL
 * is allowed.
 */
async function drainDueSocialWarm(ledger: SocialWarmLedger, warmer: Pick<SocialWarmer, 'warmArticle'>, now: Date): Promise<void> {
  let due: readonly SocialWarmTarget[];
  try {
    due = await ledger.dueTargets(WARM_QUEUE_LIMIT);
  } catch {
    logEvent('warn', { event: 'delivery.social_warm.due_failed' });
    return;
  }
  if (due.length === 0) return;
  const warmed = await drainSocialWarm(due, warmer);
  if (warmed.length === 0) return;
  try {
    await ledger.markWarmed(warmed, now);
  } catch {
    logEvent('warn', { event: 'delivery.social_warm.mark_failed', context: { attempted: warmed.length } });
  }
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
 * @remarks One edge purge per batch (unique URLs across tasks): per-host per-task purges would trigger a thundering-herd to the origin, while the edge TTL is only 60 seconds. A purge failure does not fail the task; Next revalidate is the primary mechanism and the edge recovers on its own within one TTL. The purge set is bounded by `PURGE_URL_BUDGET` and ordered so article URLs are never the ones deferred. A poison task does not stop the batch: a failed complete is recorded via fail, and a fail that also fails counts as stranded. Social warming runs after the tasks are already complete, so the edge is fresh before a scraper is sent to the page, and only when at least one task completed: warming a page whose purge has not landed would spend the URL's single Meta scrape on stale markup. Warming is best-effort, so a warm failure never affects the summary.
 */
export class InvalidationDispatcher {
  constructor(private readonly repository: Pick<DeliveryRepository, 'claimInvalidations' | 'completeInvalidation' | 'failInvalidation'>, private readonly nextCache: NextCacheInvalidationPort, private readonly cloudflare: CloudflareAuthorityPort, private readonly retryDelaysSeconds: readonly number[], private readonly maxAttempts: number, private readonly socialWarm: Pick<SocialWarmer, 'warmArticle'> | null = null, private readonly warmLedger: SocialWarmLedger | null = null) {}

  async dispatch(now: Date, limit: number): Promise<{ completed: number; failed: number; stranded: number }> {
    const tasks = await this.repository.claimInvalidations(now.toISOString(), limit);
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
    for (const task of tasks) {
      let step = 'revalidate';
      try {
        await this.nextCache.revalidateTags(task.tags); await this.nextCache.revalidatePaths(task.paths);
        step = 'complete';
        await this.repository.completeInvalidation(task, now.toISOString()); completed += 1;
      } catch {
        try {
          const terminal = task.attempts + 1 >= this.maxAttempts;
          const seconds = this.retryDelaysSeconds[Math.min(task.attempts, this.retryDelaysSeconds.length - 1)] ?? 60;
          await this.repository.failInvalidation(task, { code: 'provider_unavailable', step }, new Date(now.getTime() + seconds * 1_000).toISOString(), terminal, now.toISOString()); failed += 1;
        } catch {
          stranded += 1;
        }
      }
    }
    if (completed > 0 && this.socialWarm !== null && this.warmLedger !== null) {
      await drainDueSocialWarm(this.warmLedger, this.socialWarm, now);
    }
    return { completed, failed, stranded };
  }
}
