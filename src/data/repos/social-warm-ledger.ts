import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { SocialWarmLedger, SocialWarmTarget } from '@/modules/delivery/ports';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;

/**
 * One-shot social warm marker, stored beside the row that owns each public URL.
 *
 * @remarks Both calls are SECURITY DEFINER helpers rather than tenant-scoped
 * queries: the dispatcher is fleet-wide and claims tasks across organizations,
 * so there is no single tenant context to set. Nothing crosses a tenant
 * boundary — each row carries its own hostname and is warmed on its own URL.
 */
export class DrizzleSocialWarmLedger implements SocialWarmLedger {
  constructor(private readonly database: Database) {}

  async dueTargets(limit: number): Promise<readonly SocialWarmTarget[]> {
    const rows = await this.database.execute<{ articleSiteId: string; url: string }>(sql`
      SELECT article_site_id AS "articleSiteId", url
      FROM indicate_private.due_social_warm_targets(${limit}::integer)`);
    return [...rows];
  }

  async markWarmed(articleSiteIds: readonly string[], now: Date): Promise<void> {
    if (articleSiteIds.length === 0) return;
    await this.database.execute(sql`
      SELECT indicate_private.mark_social_warm_targets(${articleSiteIds}::uuid[], ${now.toISOString()}::timestamptz)`);
  }
}
