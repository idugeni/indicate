import type { getSharedRuntimeDatabase } from '@/data/client';
import type {
  RuntimeConfigInvalidationClaim,
  RuntimeConfigInvalidationRepository,
} from '@/modules/persisted-config/invalidation-reconciler';

type RuntimeSqlClient = ReturnType<typeof getSharedRuntimeDatabase>['client'];

interface ClaimedRow {
  readonly intent_id: string;
  readonly runtime_revision: number | string;
  readonly claim_token: string;
}

/**
 * Durable consumer for runtime configuration invalidation intents.
 *
 * @remarks Claims and status transitions are delegated to SECURITY DEFINER
 * functions because runtime-config tables are not directly readable by the
 * runtime role. Completion/failure is fenced by the claim token.
 */
export class RuntimeConfigInvalidationPostgresRepository implements RuntimeConfigInvalidationRepository {
  constructor(private readonly client: RuntimeSqlClient) {}

  async claimDue(limit: number, leaseUntil: Date): Promise<readonly RuntimeConfigInvalidationClaim[]> {
    const rows = await this.client<ClaimedRow[]>`
      SELECT *
        FROM indicate_private.claim_runtime_config_invalidations(
          ${limit}::integer,
          ${leaseUntil.toISOString()}::timestamptz
        )
    `;
    return rows.map((row) => {
      const runtimeRevision = Number(row.runtime_revision);
      if (!Number.isSafeInteger(runtimeRevision) || runtimeRevision < 0) {
        throw new Error('runtime_config_invalidation_invalid_revision');
      }
      return Object.freeze({
        intentId: row.intent_id,
        runtimeRevision,
        claimToken: row.claim_token,
      });
    });
  }

  async complete(intentId: string, claimToken: string): Promise<void> {
    await this.client`
      SELECT indicate_private.complete_runtime_config_invalidation(
        ${intentId}::uuid,
        ${claimToken}::uuid
      )
    `;
  }

  async fail(intentId: string, claimToken: string, category: string, nextAttemptAt: Date): Promise<void> {
    await this.client`
      SELECT indicate_private.fail_runtime_config_invalidation(
        ${intentId}::uuid,
        ${claimToken}::uuid,
        ${category},
        ${nextAttemptAt.toISOString()}::timestamptz
      )
    `;
  }
}
