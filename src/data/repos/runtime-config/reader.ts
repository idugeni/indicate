import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { PersistedRuntimeConfigReadModel } from '@/core/config/persisted/read-model';
import { RuntimeConfigReadError, type RuntimeConfigReadRepository } from '@/modules/persisted-config/ports';
import type * as schema from '@/data/schema';

type RuntimeConfigDatabase = PostgresJsDatabase<typeof schema>;

/** Retries a complete config read when the runtime revision moves mid-read. */
const READ_RETRY_LIMIT = 3;

/**
 * Read the persisted runtime configuration snapshot.
 *
 * @remarks The driver delivers bigint as string; coerce so revision math and the positive-int parser rule see a real number (null stays null). Revision reads go via the security-definer read; the runtime role never reads the RLS-protected revision table directly.
 */
export class DrizzleRuntimeConfigRepository implements RuntimeConfigReadRepository {
  constructor(private readonly database: RuntimeConfigDatabase) {}

  async readComplete(environment: string): Promise<PersistedRuntimeConfigReadModel> {
    let previousRevision = -1;
    for (let attempt = 0; attempt < READ_RETRY_LIMIT; attempt += 1) {
      const { revision, model } = await this.readOnce(environment);
      if (revision === previousRevision) {
        return model;
      }
      previousRevision = revision;
    }
    throw new RuntimeConfigReadError('runtime config read exceeded retry limit');
  }

  private async readOnce(environment: string): Promise<{ revision: number; model: PersistedRuntimeConfigReadModel }> {
    const model = await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);

      const revision = await this.peekRevision(transaction, environment);
      const [sharedRow] = await transaction.execute<Record<string, unknown>>(
        sql`SELECT * FROM indicate_private.read_runtime_config_shared()`,
      );
      const policyRows = await transaction.execute<Record<string, unknown>>(
        sql`SELECT * FROM indicate_private.read_runtime_config_policies()`,
      );
      const domainRows = await transaction.execute<Record<string, unknown>>(
        sql`SELECT * FROM indicate_private.read_runtime_config_active_domains()`,
      );
      const siteRows = await transaction.execute<Record<string, unknown>>(
        sql`SELECT * FROM indicate_private.read_runtime_config_active_sites()`,
      );
      const settingsRows = await transaction.execute<Record<string, unknown>>(
        sql`SELECT * FROM indicate_private.read_runtime_config_site_settings()`,
      );

      return this.buildModel(environment, revision ?? 0, { sharedRow, policyRows, domainRows, siteRows, settingsRows });
    });

    const revisionAfter = await this.peekRevision(this.database, environment);
    return { revision: revisionAfter ?? 0, model };
  }

  private buildModel(
    environment: string,
    revision: number,
    rows: {
      sharedRow: Record<string, unknown> | undefined;
      policyRows: readonly Record<string, unknown>[];
      domainRows: readonly Record<string, unknown>[];
      siteRows: readonly Record<string, unknown>[];
      settingsRows: readonly Record<string, unknown>[];
    },
  ): PersistedRuntimeConfigReadModel {
    const { sharedRow, policyRows, domainRows, siteRows, settingsRows } = rows;
    const byKind = new Map<string, Record<string, unknown>>();
    for (const row of policyRows) {
      if (typeof row.policy_kind === 'string') byKind.set(row.policy_kind, row);
    }

    return {
      environment: environment as PersistedRuntimeConfigReadModel['environment'],
      configurationVersion: revision,
      readAt: new Date().toISOString(),
      sharedDeployment: this.safeCast(sharedRow === undefined ? undefined : this.toCanonicalRow(sharedRow)),
      mediaPolicy: this.safeCast(byKind.get('media_policy')?.fields),
      publicationPolicy: this.safeCast(byKind.get('publication_policy')?.fields),
      webhookPolicy: this.safeCast(byKind.get('webhook_policy')?.fields),
      cachePolicy: this.safeCast(byKind.get('cache_policy')?.fields),
      rateLimitPolicies: policyRows
        .filter((row) => row.policy_kind === 'rate_limit_policy')
        .map((row) => this.safeCast({
          ...this.toCanonicalRow(this.safeCast<Record<string, unknown>>(row.fields)),
          endpointClass: row.endpoint_class,
        })),
      domains: domainRows.map((row) => this.safeCast(this.toCanonicalRow(row))),
      sites: this.safeCast(siteRows.map((row) => this.toCanonicalRow(row))),
      siteSettings: this.safeCast(settingsRows.map((row) => this.toCanonicalRow(row))),
    };
  }

  /** TypeScript cannot verify SQL row shape; escape via unknown at the wire boundary. */
  private safeCast<T>(value: unknown): T {
    return value as T;
  }

  /**
   * Wire normalization: SQL functions return snake_case keys while the parser
   * speaks camelCase, and the driver delivers bigint/timestamptz as
   * string/Date instead of number/string. Normalize here so the parser only
   * ever sees canonical shapes; never partially.
   */
  private toCanonicalRow(value: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const camel = key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
      out[camel] = entry instanceof Date ? entry.toISOString() : entry;
    }
    return out;
  }

  private async peekRevision(source: PostgresJsDatabase<typeof schema> | Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0], environment: string): Promise<number | null> {
    const rows = await source.execute<{ version: number | null }>(
      sql`SELECT indicate_private.read_runtime_config_revision(${environment}) AS version`,
    );
    const raw = rows[0]?.version ?? null;
    return raw === null ? null : Number(raw);
  }

  async readInventoryVersion(environment: string): Promise<{ readonly configurationVersion: number }> {
    const rows = await this.database.execute<{ version: number | null }>(
      sql`SELECT indicate_private.read_runtime_config_revision(${environment}) AS version`,
    );
    return { configurationVersion: Number(rows[0]?.version ?? 0) };
  }
}