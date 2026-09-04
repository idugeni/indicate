import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { PublicationTargetPublisherPort, TargetPublicationOutcome } from '@/modules/publishing/ports';
import type { PublicationTargetRecord, WorkerClaim } from '@/modules/publishing/models';
import { articleSites, articles, publishingJobs, sites } from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;

export class DrizzlePublicationTargetPublisher implements PublicationTargetPublisherPort {
  constructor(private readonly database: Database) {}
  async publish(claim: WorkerClaim, target: PublicationTargetRecord): Promise<TargetPublicationOutcome> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${claim.organizationId}::uuid, ${claim.jobId}, ${`worker:${claim.workerId}`})`);
      const rows = await transaction.select({ hostname: sites.normalizedHostname, slug: articles.slug })
        .from(publishingJobs)
        .innerJoin(articles, and(eq(articles.organizationId, publishingJobs.organizationId), eq(articles.id, publishingJobs.articleId)))
        .innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobs.organizationId), eq(articleSites.id, target.articleSiteId)))
        .innerJoin(sites, and(eq(sites.organizationId, articleSites.organizationId), eq(sites.id, articleSites.siteId)))
        .where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(sites.status, 'active'))).limit(1);
      const row = rows[0];
      return row === undefined ? { kind: 'terminal_failure', code: 'target_unavailable' } : { kind: 'published', url: `https://${row.hostname}/articles/${row.slug}` };
    });
  }
}
