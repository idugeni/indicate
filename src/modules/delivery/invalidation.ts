import type { InvalidationPlan } from '@/modules/delivery/models';
import type { NextCacheInvalidationPort } from '@/modules/delivery/ports';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
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
 * Warm queued article URLs in parallel batches and report every outcome.
 *
 * @param urls - Unique article URLs collected from completed tasks.
 * @param warmer - Page, image, and Facebook pre-scrape warmer.
 * @returns Nothing; failures and truncation land in `delivery.social_warm.*` events.
 * @remarks Batch width stays at `WARM_BATCH_SIZE` so parallel fetches cannot
 * outlive the publication function budget, but the queue is drained across
 * batches instead of truncated at the first one: a task whose completion is
 * already recorded is never reclaimed by `claim_delivery_invalidation_tasks`,
 * so anything dropped here would stay cold until its edge TTL expired. The
 * `WARM_QUEUE_LIMIT` and `WARM_BUDGET_MS` ceilings bound a pathological batch
 * and both report the remainder rather than dropping it silently. A single
 * batch can still overrun its slice because each warm issues up to three
 * sequential fetches bounded by the warmer's own timeouts.
 */
async function drainSocialWarm(urls: readonly string[], warmer: Pick<SocialWarmer, 'warmArticle'>): Promise<void> {
  const startedAt = Date.now();
  const failures: { url: string; pageOk: boolean; imageOk: boolean; facebookOk: boolean }[] = [];
  let attempted = 0;
  let truncated = 0;
  for (let offset = 0; offset < urls.length; offset += WARM_BATCH_SIZE) {
    if (offset >= WARM_QUEUE_LIMIT || Date.now() - startedAt >= WARM_BUDGET_MS) {
      truncated = urls.length - offset;
      break;
    }
    const batch = urls.slice(offset, Math.min(offset + WARM_BATCH_SIZE, WARM_QUEUE_LIMIT));
    const outcomes = await Promise.allSettled(batch.map((url) => warmer.warmArticle(url)));
    for (const [index, outcome] of outcomes.entries()) {
      const url = batch[index] ?? '';
      attempted += 1;
      if (outcome.status === 'rejected') {
        failures.push({ url, pageOk: false, imageOk: false, facebookOk: false });
        continue;
      }
      const { pageOk, imageOk, facebookOk } = outcome.value;
      if (!pageOk || !imageOk || !facebookOk) failures.push({ url, pageOk, imageOk, facebookOk });
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
 * @remarks One edge purge per batch (unique URLs across tasks): per-host per-task purges would trigger a thundering-herd to the origin, while the edge TTL is only 60 seconds. A purge failure does not fail the task; Next revalidate is the primary mechanism and the edge recovers on its own within one TTL. A poison task does not stop the batch: a failed complete is recorded via fail, and a fail that also fails counts as stranded. Social warming is best-effort and runs after the tasks are already complete, so a warm failure never affects the summary; `drainSocialWarm` owns its parallel width, its budget, and its reporting.
 */
export class InvalidationDispatcher {
  constructor(private readonly repository: Pick<DeliveryRepository, 'claimInvalidations' | 'completeInvalidation' | 'failInvalidation'>, private readonly nextCache: NextCacheInvalidationPort, private readonly cloudflare: CloudflareAuthorityPort, private readonly retryDelaysSeconds: readonly number[], private readonly maxAttempts: number, private readonly socialWarm: Pick<SocialWarmer, 'warmArticle'> | null = null) {}

  async dispatch(now: Date, limit: number): Promise<{ completed: number; failed: number; stranded: number }> {
    const tasks = await this.repository.claimInvalidations(now.toISOString(), limit);
    const urls = [...new Set(tasks.flatMap((task) => task.urls))];
    if (urls.length > 0) {
      try {
        await this.cloudflare.purgeExactUrls(urls);
      } catch {
        /* left to expire via the edge TTL; the task still completes below */
      }
    }
    const warmer = this.socialWarm;
    let completed = 0; let failed = 0; let stranded = 0;
    const warmQueue: string[] = [];
    const queuedWarm = new Set<string>();
    for (const task of tasks) {
      let step = 'revalidate';
      try {
        await this.nextCache.revalidateTags(task.tags); await this.nextCache.revalidatePaths(task.paths);
        step = 'complete';
        await this.repository.completeInvalidation(task, now.toISOString()); completed += 1;
        if (warmer !== null) {
          for (const url of articleWarmUrls(task.tags)) {
            if (queuedWarm.has(url)) continue;
            queuedWarm.add(url);
            warmQueue.push(url);
          }
        }
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
    if (warmer !== null && warmQueue.length > 0) {
      await drainSocialWarm(warmQueue, warmer);
    }
    return { completed, failed, stranded };
  }
}
