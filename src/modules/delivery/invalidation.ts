import type { InvalidationPlan } from '@/modules/delivery/models';
import type { NextCacheInvalidationPort } from '@/modules/delivery/ports';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import type { SocialWarmer } from '@/modules/delivery/social-warm';

export type NetworkMutation =
  | { readonly kind: 'article' | 'publication'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlug: string; readonly categorySlug?: string }
  | { readonly kind: 'site_settings' | 'media'; readonly organizationId: string; readonly siteId: string; readonly hostname: string }
  | { readonly kind: 'hostname'; readonly organizationId: string; readonly siteId: string; readonly previousHostname: string | null; readonly currentHostname: string | null }
  | { readonly kind: 'publisher'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlugs: readonly string[] };

const sitePaths = ['/', '/kebijakan-privasi', '/syarat-ketentuan', '/tentang', '/kontak', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', '/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report'];
const HOST_TAG_PREFIX = 'host:';
const ARTICLE_TAG_PREFIX = 'article:';
const MAX_WARM_URLS_PER_DISPATCH = 8;

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
 * @remarks One edge purge per batch (unique URLs across tasks): per-host per-task purges would trigger a thundering-herd to the origin, while the edge TTL is only 60 seconds. A purge failure does not fail the task; Next revalidate is the primary mechanism and the edge recovers on its own within one TTL. A poison task does not stop the batch: a failed complete is recorded via fail, and a fail that also fails counts as stranded. Social warming is one parallel best-effort batch per dispatch (unique article URLs, capped): sequential per-URL fetches could outlive the function budget, while tasks are already complete before warming so a warm failure never affects the summary.
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
            if (warmQueue.length >= MAX_WARM_URLS_PER_DISPATCH) break;
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
      await Promise.allSettled(warmQueue.map((url) => warmer.warmArticle(url)));
    }
    return { completed, failed, stranded };
  }
}
