import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { SeedRepository, SeedTransaction } from '@/ports/seed-repository';
import { domains, regions, seedRuns } from '../schema';
import type * as schema from '../schema';

type Database = PostgresJsDatabase<typeof schema>;

export class DrizzleSeedRepository implements SeedRepository {
  constructor(private readonly database: Database) {}

  async transaction<T>(organizationId: string, operation: (transaction: SeedTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async (databaseTransaction) => {
      await databaseTransaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'indicate:mvp-seed:' + organizationId}))`);
      const transaction: SeedTransaction = {
        reconcileDomain: async (input) => {
          const existing = await databaseTransaction.query.domains.findFirst({
            where: eq(domains.normalizedHostname, input.normalizedHostname),
          });
          if (existing !== undefined) {
            if (existing.organizationId !== input.organizationId) throw new Error('Seed domain is unavailable');
            return 'unchanged';
          }
          await databaseTransaction.insert(domains).values({
            organizationId: input.organizationId,
            id: input.id,
            normalizedHostname: input.normalizedHostname,
            status: 'inactive',
          });
          return 'created';
        },
        reconcileRegion: async (input) => {
          const existing = await databaseTransaction.query.regions.findFirst({
            where: and(
              eq(regions.organizationId, input.organizationId),
              eq(regions.externalKey, input.externalKey),
            ),
          });
          if (existing === undefined) {
            await databaseTransaction.insert(regions).values({
              organizationId: input.organizationId,
              id: input.id,
              externalKey: input.externalKey,
              name: input.name,
              slug: input.slug,
              status: 'active',
            });
            return 'created';
          }
          if (existing.name === input.name && existing.slug === input.slug && existing.status === 'active') {
            return 'unchanged';
          }
          await databaseTransaction.update(regions).set({
            name: input.name,
            slug: input.slug,
            status: 'active',
            updatedAt: new Date(),
          }).where(and(eq(regions.organizationId, input.organizationId), eq(regions.id, existing.id)));
          return 'updated';
        },
        completeRun: async (input) => {
          const existing = await databaseTransaction.query.seedRuns.findFirst({
            where: and(
              eq(seedRuns.organizationId, input.organizationId),
              eq(seedRuns.configFingerprint, input.fingerprint),
              eq(seedRuns.status, 'completed'),
            ),
          });
          if (existing !== undefined) return;
          await databaseTransaction.insert(seedRuns).values({
            organizationId: input.organizationId,
            id: input.id,
            configFingerprint: input.fingerprint,
            status: 'completed',
            createdCount: input.created,
            updatedCount: input.updated,
            unchangedCount: input.unchanged,
            failedCount: 0,
            completedAt: new Date(),
          });
        },
      };
      return operation(transaction);
    });
  }
}
