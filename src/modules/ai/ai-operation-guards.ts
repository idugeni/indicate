import 'server-only';

import { sql } from 'drizzle-orm';

import { recordOperation } from '@/core/observability/operation-metrics';
import {
  checkAiModelRateLimit,
  checkOrganizationQuota,
  estimateAiInputTokens,
  getAiModelLimits,
  getOrganizationQuotaLimits,
  type AiRateLimitStore,
} from '@/modules/ai/ai-rate-limit';
import { isModelBreakerTripped, recordModelInfraFailure, recordModelSuccess } from '@/modules/ai/ai-router';
import type { AiBudgetGuard } from '@/modules/ai/ai-security';
import type { AiDb } from '@/modules/ai/ai-types';

/** Neutral operation label for embedding calls without a known caller action. */
export const AI_EMBED_OPERATION = 'ai.embed';

/** Operation label for archive-search embedding calls. */
export const AI_EMBED_OPERATION_QUERY = 'ai.embed.query';

/** Operation label for article reindex embedding calls. */
export const AI_EMBED_OPERATION_REINDEX = 'ai.embed.reindex';

/** Provider label used in logs/metrics when a guard blocks before any transport runs. */
export const AI_EMBED_GUARD_PROVIDER = 'embed-guardrail';

/**
 * Injected control surface for non-generative AI operations (embeddings) and
 * for entry points that re-implement the generative pre-flight (streaming).
 *
 * @remarks Mirrors the subset of `AiServiceDeps` that guards need: database
 * for limit reads and audit writes, the global budget guard, and the shared
 * Redis counter store. Every check fails open so a control outage never
 * blocks answers; blocks are always observable via the audit log.
 */
export interface AiOperationControls {
  readonly db: AiDb;
  readonly budget: AiBudgetGuard;
  readonly store?: AiRateLimitStore | undefined;
  readonly log?: ((entry: AiOperationLogEntry) => Promise<void>) | undefined;
  readonly clock?: (() => Date) | undefined;
}

/**
 * One audit row for a guarded non-generative operation.
 *
 * @remarks Column-compatible with `ai_request_logs` (free-text `channel`,
 * `status` in `success|failed|blocked`); plaintext keys, vectors, and raw
 * user content never travel here — only counts and attribution.
 */
export interface AiOperationLogEntry {
  readonly correlationId: string;
  readonly channel: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly credentialId: string | null;
  readonly organizationId?: string | null | undefined;
  readonly status: 'success' | 'failed' | 'blocked';
  readonly retryCount: number;
  readonly latencyMs: number;
  readonly promptTokens?: number | undefined;
  readonly completionTokens?: number | undefined;
  readonly totalTokens?: number | undefined;
  readonly errorClass?: string | undefined;
  readonly errorMessage?: string | undefined;
}

async function defaultLogOperation(db: AiDb, entry: AiOperationLogEntry): Promise<void> {
  try {
    await db.execute(
      sql`insert into ai_request_logs (correlation_id, channel, provider_id, model_name, credential_id, organization_id, status, retry_count, latency_ms, prompt_tokens, completion_tokens, total_tokens, tools_executed, error_class, error_message) values (${entry.correlationId}, ${entry.channel}, ${entry.providerId}, ${entry.modelName}, ${entry.credentialId}, ${entry.organizationId ?? null}, ${entry.status}, ${entry.retryCount}, ${entry.latencyMs}, ${entry.promptTokens ?? 0}, ${entry.completionTokens ?? 0}, ${entry.totalTokens ?? 0}, null, ${entry.errorClass ?? null}, ${entry.errorMessage ?? null})`,
    );
  } catch {
    /* Logging must never fail an answer. */
  }
}

/**
 * Persist one guarded-operation audit row; never throws.
 *
 * @param controls - Control surface carrying the database port and optional log override.
 * @param entry - Attribution-only row (no vectors, prompts, or secrets).
 */
export async function logOperationResult(
  controls: Pick<AiOperationControls, 'db' | 'log'>,
  entry: AiOperationLogEntry,
): Promise<void> {
  const log = controls.log ?? ((row: AiOperationLogEntry) => defaultLogOperation(controls.db, row));
  try {
    await log(entry);
  } catch {
    /* Logging must never fail an answer. */
  }
}

/**
 * Estimate embedding input tokens from raw texts.
 *
 * @param texts - Chunk or query texts before transport truncation.
 * @returns Summed estimate, at least 1 per text, via the shared chars/4 heuristic.
 */
export function estimateEmbeddingTokens(texts: readonly string[]): number {
  let total = 0;
  for (const text of texts) total += estimateAiInputTokens(text, 0);
  return total;
}

/** Verdict of the shared budget-plus-quota pre-flight. */
export type AiBudgetQuotaVerdict =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly gate: 'budget' | 'org-quota';
      readonly errorClass: string;
      readonly message: string;
    };

/**
 * Shared global-budget then per-organization-quota pre-flight.
 *
 * @param controls - Database, budget guard, optional Redis store and clock.
 * @param input.organizationId - Tenant under enforcement; null skips the org-quota leg.
 * @param input.estimatedTokens - Pre-call input estimate charged to token quotas on allow.
 * @param input.now - Observation time; defaults to the control clock or current time.
 * @returns Allowed verdict, or the blocking gate with a safe caller message.
 * @remarks Order matches `executeAiQuery` (budget first, then org quota) so the
 * streaming entry and the embedding path share one parity definition. Allowed
 * quota verdicts charge the estimate, doubling as the usage record — identical
 * to the generative path. Every failure resolves to allowed (fail-open).
 */
export async function checkOperationBudgetQuota(
  controls: Pick<AiOperationControls, 'db' | 'budget' | 'store' | 'clock'>,
  input: { readonly organizationId: string | null; readonly estimatedTokens: number; readonly now?: Date | undefined },
): Promise<AiBudgetQuotaVerdict> {
  const now = input.now ?? controls.clock?.() ?? new Date();
  try {
    const budget = await controls.budget.checkAiBudgetSafeguard();
    if (!budget.allowed) {
      return {
        allowed: false,
        gate: 'budget',
        errorClass: 'quota_exhausted',
        message: 'Daily/hourly AI budget exceeded',
      };
    }
  } catch {
    /* Budget checks fail open. */
  }
  if (input.organizationId !== null && controls.store !== undefined) {
    try {
      const limits = await getOrganizationQuotaLimits(controls.db, input.organizationId);
      if (limits.dailyRequestLimit !== null || limits.dailyTokenLimit !== null) {
        const verdict = await checkOrganizationQuota(
          controls.store,
          input.organizationId,
          limits,
          input.estimatedTokens,
          now,
        );
        if (!verdict.allowed) {
          return {
            allowed: false,
            gate: 'org-quota',
            errorClass: verdict.reason ?? 'quota_exhausted',
            message: 'Organization daily AI quota exceeded',
          };
        }
      }
    } catch {
      /* Quota checks fail open so a quota outage never blocks answers. */
    }
  }
  return { allowed: true };
}

/** Verdict of the per-transport rate-limit plus breaker gate. */
export type AiTransportVerdict =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly gate: 'rate-limit' | 'breaker';
      readonly errorClass: string;
      readonly message: string;
    };

/**
 * Per-model rate-limit plus breaker gate for one embedding transport attempt.
 *
 * @param controls - Database, optional Redis store and clock.
 * @param input.providerId - Transport owner (e.g. `workers-ai`, `gemini`).
 * @param input.modelName - Model whose RPM/TPM ceilings and breaker apply.
 * @param input.estimatedTokens - Pre-call input estimate charged to the TPM window on allow.
 * @param input.now - Observation time for the breaker half-open check.
 * @returns Allowed verdict, or the blocking gate. Absent store or limits resolve
 * to allowed; every error resolves to allowed (fail-open). Blocked calls
 * consume nothing.
 */
export async function checkEmbeddingTransport(
  controls: Pick<AiOperationControls, 'db' | 'store'>,
  input: {
    readonly providerId: string;
    readonly modelName: string;
    readonly estimatedTokens: number;
    readonly now?: Date | undefined;
  },
): Promise<AiTransportVerdict> {
  const store = controls.store;
  if (store === undefined) return { allowed: true };
  try {
    const limits = await getAiModelLimits(controls.db, input.modelName).catch(() => null);
    if (limits !== null) {
      const verdict = await checkAiModelRateLimit(store, limits, input.modelName, input.estimatedTokens);
      if (!verdict.allowed) {
        return {
          allowed: false,
          gate: 'rate-limit',
          errorClass: verdict.reason ?? 'rate_limited',
          message: `Model ${input.modelName} exceeded ${verdict.reason === 'tpm_exceeded' ? 'TPM' : 'RPM'} limit`,
        };
      }
    }
  } catch {
    return { allowed: true };
  }
  try {
    const tripped = await isModelBreakerTripped(
      store,
      input.providerId,
      input.modelName,
      input.now?.getTime() ?? Date.now(),
    );
    if (tripped) {
      return {
        allowed: false,
        gate: 'breaker',
        errorClass: 'breaker_open',
        message: `Model ${input.modelName} is temporarily cut off after repeated failures`,
      };
    }
  } catch {
    /* Breaker reads fail open. */
  }
  return { allowed: true };
}

/**
 * Record one transport attempt outcome on the model breaker.
 *
 * @param controls - Control surface carrying the optional Redis store.
 * @param input.providerId - Transport owner.
 * @param input.modelName - Attempted model.
 * @param input.succeeded - True when the transport returned at least one vector.
 * @remarks Skipped without a store; never throws. Partial (some-null) batches
 * count as success because the provider served the request.
 */
export async function recordEmbeddingTransportOutcome(
  controls: Pick<AiOperationControls, 'store'>,
  input: { readonly providerId: string; readonly modelName: string; readonly succeeded: boolean },
): Promise<void> {
  const store = controls.store;
  if (store === undefined) return;
  try {
    if (input.succeeded) await recordModelSuccess(store, input.providerId, input.modelName);
    else await recordModelInfraFailure(store, input.providerId, input.modelName);
  } catch {
    /* Breaker telemetry must never fail an answer. */
  }
}

/**
 * Emit one `ai` metrics sample for a guarded operation attempt.
 *
 * @param input.operation - Operation label (`ai.embed.query`, `ai.embed.reindex`, …).
 * @param input.provider - Transport owner or guardrail label; never a secret.
 * @param input.model - Model under attribution; never content.
 * @param input.organizationId - Tenant attribution; null when unavailable.
 * @param input.durationMs - Wall-clock duration of the attempt.
 * @param input.status - 200 served, 429 guard-blocked, 500 transport/dependency failure.
 * @param input.tokens - Estimated input tokens where the provider reports no usage.
 * @remarks Never throws; carries numeric aggregates and code-constant
 * dimensions only — no vectors, prompts, or secrets.
 */
export function recordEmbeddingOperation(input: {
  readonly operation: string;
  readonly provider: string;
  readonly model: string;
  readonly organizationId: string | null;
  readonly durationMs: number;
  readonly status: number;
  readonly tokens?: number | undefined;
}): void {
  try {
    recordOperation({
      route: 'ai',
      operation: input.operation,
      provider: input.provider,
      model: input.model,
      ...(input.organizationId === null ? {} : { tenantId: input.organizationId }),
      durationMs: input.durationMs,
      status: input.status,
      ...(input.tokens === undefined ? {} : { tokens: input.tokens }),
    });
  } catch {
    /* Telemetry must never fail the caller. */
  }
}
