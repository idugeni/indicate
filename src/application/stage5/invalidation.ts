import type { InvalidationPlan, InvalidationTask } from '@/domain/stage5/models';
import type { CacheCoordinationPort, NextCacheInvalidationPort } from '@/ports/cache-invalidation';
import type { CloudflareAuthorityPort } from '@/ports/cloudflare';
import type { Stage5Repository } from '@/ports/stage5-repository';

export type PublicMutation =
  | { readonly kind: 'article' | 'publication'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlug: string; readonly categorySlug?: string }
  | { readonly kind: 'site_settings' | 'media'; readonly organizationId: string; readonly siteId: string; readonly hostname: string }
  | { readonly kind: 'hostname'; readonly organizationId: string; readonly siteId: string; readonly previousHostname: string | null; readonly currentHostname: string | null }
  | { readonly kind: 'publisher'; readonly organizationId: string; readonly siteId: string; readonly hostname: string; readonly articleSlugs: readonly string[] };

const sitePaths = ['/', '/articles', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml'];
export function planInvalidation(mutation: PublicMutation): InvalidationPlan {
  const hostnames = mutation.kind === 'hostname' ? [mutation.previousHostname, mutation.currentHostname].filter((value): value is string => value !== null) : [mutation.hostname];
  const articleSlugs = mutation.kind === 'article' || mutation.kind === 'publication' ? [mutation.articleSlug] : mutation.kind === 'publisher' ? [...mutation.articleSlugs] : [];
  const paths = new Set(sitePaths);
  for (const slug of articleSlugs) paths.add(`/articles/${slug}`);
  if ((mutation.kind === 'article' || mutation.kind === 'publication') && mutation.categorySlug !== undefined) paths.add(`/categories/${mutation.categorySlug}`);
  const tags = new Set([`org:${mutation.organizationId}`, `site:${mutation.siteId}`, ...hostnames.map((host) => `host:${host}`), ...articleSlugs.map((slug) => `article:${slug}`)]);
  return Object.freeze({ organizationId: mutation.organizationId, siteId: mutation.siteId, previousHostname: mutation.kind === 'hostname' ? mutation.previousHostname : null, currentHostname: mutation.kind === 'hostname' ? mutation.currentHostname : mutation.hostname, tags: [...tags].sort(), paths: [...paths].sort(), urls: hostnames.flatMap((host) => [...paths].map((path) => `https://${host}${path}`)).sort(), reason: mutation.kind });
}

export class InvalidationDispatcher {
  constructor(private readonly repository: Pick<Stage5Repository, 'claimInvalidations' | 'completeInvalidation' | 'failInvalidation'>, private readonly nextCache: NextCacheInvalidationPort, private readonly coordination: CacheCoordinationPort, private readonly cloudflare: CloudflareAuthorityPort, private readonly retryDelaysSeconds: readonly number[], private readonly maxAttempts: number) {}

  async dispatch(now: Date, limit: number): Promise<{ completed: number; failed: number }> {
    const tasks = await this.repository.claimInvalidations(now.toISOString(), limit);
    let completed = 0; let failed = 0;
    for (const task of tasks) {
      try {
        await this.nextCache.revalidateTags(task.tags); await this.nextCache.revalidatePaths(task.paths);
        await this.coordination.incrementSiteVersion(task.organizationId, task.siteId);
        await this.cloudflare.purgeExactUrls(task.urls);
        for (const host of new Set([task.previousHostname, task.currentHostname].filter((value): value is string => value !== null))) await this.cloudflare.purgeHostname(host);
        await this.coordination.setSiteBypass(task.organizationId, task.siteId, false);
        await this.repository.completeInvalidation(task, now.toISOString()); completed += 1;
      } catch {
        failed += 1;
        const terminal = task.attempts + 1 >= this.maxAttempts;
        const seconds = this.retryDelaysSeconds[Math.min(task.attempts, this.retryDelaysSeconds.length - 1)] ?? 60;
        await this.repository.failInvalidation(task, { code: 'provider_unavailable' }, new Date(now.getTime() + seconds * 1_000).toISOString(), terminal, now.toISOString());
        try { await this.coordination.setSiteBypass(task.organizationId, task.siteId, true); } catch { /* PostgreSQL bypass remains authoritative. */ }
        if (terminal) for (const host of [task.currentHostname, task.previousHostname]) if (host !== null) try { await this.cloudflare.purgeHostname(host); } catch { /* durable Site bypass remains enabled */ }
      }
    }
    return { completed, failed };
  }
}

export function invalidationTaskFromPlan(plan: InvalidationPlan, now: string): InvalidationTask {
  return { ...plan, id: crypto.randomUUID(), attempts: 0, nextAttemptAt: now, status: 'pending', claimToken: null, claimExpiresAt: null, sanitizedFailure: null };
}
