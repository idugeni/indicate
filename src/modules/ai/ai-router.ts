import 'server-only';

import { sql } from 'drizzle-orm';

import { decryptAiKey } from '@/modules/ai/ai-crypto';
import type { AiRateLimitStore } from '@/modules/ai/ai-rate-limit';
import type {
  AiAccessChannel,
  AiCredentialRecord,
  AiCredentialStatus,
  AiDb,
  AiErrorClass,
  AiRotationStrategy,
  AiRoutingPolicy,
  AiThinkingConfig,
} from '@/modules/ai/ai-types';

/**
 * Routing policy used when no `ai_routing_policies` row is armed.
 *
 * @remarks Fail-closed static default: rotation stays health-aware and the
 * request path reports exhaustion instead of inventing credentials.
 */
export const DEFAULT_AI_ROUTING_POLICY: AiRoutingPolicy = {
  id: 'default',
  rotationStrategy: 'health_aware',
  primaryProviderId: 'gemini',
  fallbackProviderId: null,
  defaultModel: 'gemini-3.8-flash',
  fallbackModel: 'gemini-3.6-flash',
  maxRetries: 5,
  perKeyRetryLimit: 2,
  cooldownDurationSec: 60,
  requestTimeoutMs: 60000,
  globalConcurrencyLimit: 100,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

/** Full column projection for one credential row, kept explicit for egress review. */
const CREDENTIAL_COLUMNS = sql`id, provider_id, organization_id, label, key_encrypted, key_masked, status, priority, weight, cooldown_until, last_used_at, last_success_at, last_failure_at, last_error_message, last_error_class, total_requests, successful_requests, failed_requests, rate_limit_count, quota_exhausted_count, avg_latency_ms, created_at, updated_at`;

const ERROR_CLASSES: readonly AiErrorClass[] = [
  'auth_failure',
  'invalid_key',
  'rate_limit',
  'quota_exhausted',
  'timeout',
  'network_error',
  'provider_unavailable',
  'malformed_response',
  'model_unavailable',
  'safety_blocked',
  'application_error',
];

const CREDENTIAL_STATUSES: readonly AiCredentialStatus[] = [
  'active',
  'inactive',
  'disabled',
  'exhausted',
  'invalid',
  'cooldown',
];

/** Credential selection scope for one provider lookup. */
export interface AiCredentialScope {
  readonly organizationId?: string | null | undefined;
  readonly limit?: number | undefined;
  readonly now?: Date | undefined;
}

export interface AiClassifiedError {
  readonly errorClass: AiErrorClass;
  readonly isRetryable: boolean;
  readonly message: string;
}

let roundRobinIndex = 0;

/**
 * Reset the round-robin rotation counter.
 *
 * @remarks Deterministic starting point for tests and freshly booted
 * instances sharing one process-wide counter.
 */
export function resetAiRotationState(): void {
  roundRobinIndex = 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNumberOrFallback(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function toErrorClassOrNull(value: unknown): AiErrorClass | null {
  return typeof value === 'string' && (ERROR_CLASSES as readonly string[]).includes(value)
    ? (value as AiErrorClass)
    : null;
}

function toStatusOrFallback(value: unknown, fallback: AiCredentialStatus): AiCredentialStatus {
  return typeof value === 'string' && (CREDENTIAL_STATUSES as readonly string[]).includes(value)
    ? (value as AiCredentialStatus)
    : fallback;
}

function toCredentialRow(value: unknown): AiCredentialRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const id = toStringOrNull(row.id);
  const providerId = toStringOrNull(row.provider_id);
  const keyEncrypted = toStringOrNull(row.key_encrypted);
  const keyMasked = toStringOrNull(row.key_masked);
  if (id === null || providerId === null || keyEncrypted === null || keyMasked === null) return null;
  return {
    id,
    providerId,
    organizationId: toStringOrNull(row.organization_id),
    label: toStringOrNull(row.label) ?? '',
    keyEncrypted,
    keyMasked,
    status: toStatusOrFallback(row.status, 'active'),
    priority: toNumberOrFallback(row.priority, 100),
    weight: toNumberOrFallback(row.weight, 100),
    cooldownUntil: toIsoOrNull(row.cooldown_until),
    lastUsedAt: toIsoOrNull(row.last_used_at),
    lastSuccessAt: toIsoOrNull(row.last_success_at),
    lastFailureAt: toIsoOrNull(row.last_failure_at),
    lastErrorMessage: toStringOrNull(row.last_error_message),
    lastErrorClass: toErrorClassOrNull(row.last_error_class),
    totalRequests: toNumberOrFallback(row.total_requests, 0),
    successfulRequests: toNumberOrFallback(row.successful_requests, 0),
    failedRequests: toNumberOrFallback(row.failed_requests, 0),
    rateLimitCount: toNumberOrFallback(row.rate_limit_count, 0),
    quotaExhaustedCount: toNumberOrFallback(row.quota_exhausted_count, 0),
    avgLatencyMs: toNumberOrFallback(row.avg_latency_ms, 0),
    createdAt: toIsoOrNull(row.created_at) ?? '',
    updatedAt: toIsoOrNull(row.updated_at) ?? '',
  };
}

function toRowArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Resolve the adaptive thinking budget for one request.
 *
 * @param channel - Access channel driving the default budget.
 * @param userThinkingConfig - Explicit caller override, honoured first.
 * @param _promptLength - Reserved for length-aware budgets; channel-driven today.
 * @returns Thinking configuration, or undefined when the adapter default applies.
 */
export function resolveThinkingBudget(
  channel?: AiAccessChannel | undefined,
  userThinkingConfig?: AiThinkingConfig | undefined,
  _promptLength = 0,
): AiThinkingConfig | undefined {
  if (userThinkingConfig?.thinkingBudget !== undefined) return userThinkingConfig;
  switch (channel) {
    case 'telegram':
      return { thinkingBudget: -1, includeThoughts: true };
    case 'api':
      return { thinkingBudget: 32768, includeThoughts: true };
    case 'web':
    default:
      return { thinkingBudget: -1, includeThoughts: true };
  }
}

/**
 * Read the armed routing policy.
 *
 * @param db - Runtime database port.
 * @returns Stored `default` policy, or the static default when no row is armed.
 */
export async function getActiveRoutingPolicy(db: AiDb): Promise<AiRoutingPolicy> {
  try {
    const value = await db.execute(
      sql`select id, rotation_strategy, primary_provider_id, fallback_provider_id, default_model, fallback_model, max_retries, per_key_retry_limit, cooldown_duration_sec, request_timeout_ms, global_concurrency_limit, updated_at from ai_routing_policies where id = 'default' limit 1`,
    );
    const row = toRowArray(value)[0];
    if (typeof row !== 'object' || row === null) return DEFAULT_AI_ROUTING_POLICY;
    const record = row as Record<string, unknown>;
    const strategy = toStringOrNull(record.rotation_strategy);
    return {
      id: toStringOrNull(record.id) ?? DEFAULT_AI_ROUTING_POLICY.id,
      rotationStrategy:
        strategy === 'round_robin' ||
        strategy === 'random' ||
        strategy === 'least_used' ||
        strategy === 'lowest_error_rate' ||
        strategy === 'priority_based' ||
        strategy === 'health_aware'
          ? strategy
          : DEFAULT_AI_ROUTING_POLICY.rotationStrategy,
      primaryProviderId: toStringOrNull(record.primary_provider_id),
      fallbackProviderId: toStringOrNull(record.fallback_provider_id),
      defaultModel: toStringOrNull(record.default_model) ?? DEFAULT_AI_ROUTING_POLICY.defaultModel,
      fallbackModel:
        toStringOrNull(record.fallback_model) ?? DEFAULT_AI_ROUTING_POLICY.fallbackModel,
      maxRetries: toNumberOrFallback(record.max_retries, DEFAULT_AI_ROUTING_POLICY.maxRetries),
      perKeyRetryLimit: toNumberOrFallback(
        record.per_key_retry_limit,
        DEFAULT_AI_ROUTING_POLICY.perKeyRetryLimit,
      ),
      cooldownDurationSec: toNumberOrFallback(
        record.cooldown_duration_sec,
        DEFAULT_AI_ROUTING_POLICY.cooldownDurationSec,
      ),
      requestTimeoutMs: toNumberOrFallback(
        record.request_timeout_ms,
        DEFAULT_AI_ROUTING_POLICY.requestTimeoutMs,
      ),
      globalConcurrencyLimit: toNumberOrFallback(
        record.global_concurrency_limit,
        DEFAULT_AI_ROUTING_POLICY.globalConcurrencyLimit,
      ),
      updatedAt: toStringOrNull(record.updated_at) ?? new Date().toISOString(),
    };
  } catch {
    return DEFAULT_AI_ROUTING_POLICY;
  }
}

/**
 * Satu langkah dalam rantai failover model.
 */
export interface AiModelChainEntry {
  readonly providerId: string;
  readonly modelName: string;
}

/**
 * Menyusun rantai model primary → fallback untuk satu query.
 *
 * @param policy - Kebijakan routing aktif dari database.
 * @param modelOverride - Model khusus modalitas (sampul, TTS, transkripsi); bila diisi, rantai hanya berisi override tersebut.
 * @returns Satu atau dua entri; fallback ditambahkan bila provider atau modelnya berbeda dari primary.
 * @remarks `fallback_provider_id` yang null dibaca sebagai provider primary, sehingga `fallback_model` yang berbeda tetap menyelamatkan query saat model utama kelebihan beban.
 */
export function resolveAiModelChain(
  policy: AiRoutingPolicy,
  modelOverride?: string | undefined,
): readonly AiModelChainEntry[] {
  const primaryProviderId = policy.primaryProviderId ?? 'gemini';
  const targetModel = modelOverride ?? policy.defaultModel;
  if (modelOverride !== undefined) return [{ providerId: primaryProviderId, modelName: targetModel }];
  const fallbackProviderId = policy.fallbackProviderId ?? primaryProviderId;
  if (fallbackProviderId === primaryProviderId && policy.fallbackModel === targetModel) {
    return [{ providerId: primaryProviderId, modelName: targetModel }];
  }
  return [
    { providerId: primaryProviderId, modelName: targetModel },
    { providerId: fallbackProviderId, modelName: policy.fallbackModel },
  ];
}

/**
 * Gagal infrastruktur beruntun yang membuka circuit breaker satu model.
 */
export const AI_BREAKER_TRIP_THRESHOLD = 5;

/**
 * Jendela memori kegagalan model; kedaluwarsa berarti half-open.
 */
export const AI_BREAKER_WINDOW_SECONDS = 120;

/**
 * Kelas error yang menandai modelnya (bukan key-nya) sedang bermasalah.
 */
export const AI_BREAKER_ERROR_CLASSES: readonly AiErrorClass[] = [
  'provider_unavailable',
  'timeout',
  'rate_limit',
  'quota_exhausted',
];

/**
 * Kunci Redis untuk hitungan gagal satu model.
 *
 * @param providerId - Provider pemilik model.
 * @param modelName - Model yang diputus sementara saat trip.
 * @returns Kunci counter dengan TTL jendela breaker.
 */
export function aiBreakerKey(providerId: string, modelName: string): string {
  return `ai:breaker:${providerId}:${modelName}`;
}

/**
 * Memeriksa apakah satu model sedang diputus sementara.
 *
 * @param store - Counter Redis; undefined berarti fail-open (sehat).
 * @param providerId - Provider pemilik model.
 * @param modelName - Model kandidat.
 * @returns True bila gagal beruntun mencapai ambang dalam jendela.
 */
export async function isModelBreakerTripped(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
): Promise<boolean> {
  if (store === undefined) return false;
  try {
    const count = (await store.get(aiBreakerKey(providerId, modelName))) ?? 0;
    return count >= AI_BREAKER_TRIP_THRESHOLD;
  } catch {
    return false;
  }
}

/**
 * Mencatat satu kegagalan infrastruktur untuk satu model.
 *
 * @param store - Counter Redis; undefined berarti tidak dicatat.
 * @param providerId - Provider pemilik model.
 * @param modelName - Model yang gagal.
 */
export async function recordModelInfraFailure(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
): Promise<void> {
  if (store === undefined) return;
  try {
    await store.incrby(aiBreakerKey(providerId, modelName), 1);
    await store.expire(aiBreakerKey(providerId, modelName), AI_BREAKER_WINDOW_SECONDS);
  } catch {
    /* Breaker tidak boleh menggagalkan jawaban. */
  }
}

/**
 * Mendinginkan hitungan gagal satu model setelah sukses.
 *
 * @param store - Counter Redis; undefined berarti tidak dicatat.
 * @param providerId - Provider pemilik model.
 * @param modelName - Model yang sukses.
 */
export async function recordModelSuccess(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
): Promise<void> {
  if (store === undefined) return;
  try {
    await store.expire(aiBreakerKey(providerId, modelName), 1);
  } catch {
    /* Breaker tidak boleh menggagalkan jawaban. */
  }
}

/**
 * List usable credentials for one provider.
 *
 * @param db - Runtime database port.
 * @param providerId - Provider whose keys are eligible.
 * @param scope - Tenant scope, fetch bound, and clock override.
 * @returns Active credentials ordered by priority then least-recent use.
 * @remarks Expired cooldowns auto-recover first. Tenant scoping always
 * includes shared global keys alongside the tenant's own. Database-only:
 * an empty table yields an empty list, never an environment fallback.
 */
export async function getAvailableCredentials(
  db: AiDb,
  providerId = 'gemini',
  scope?: AiCredentialScope | undefined,
): Promise<AiCredentialRecord[]> {
  const nowIso = (scope?.now ?? new Date()).toISOString();
  const limit = Math.min(Math.max(scope?.limit ?? 25, 1), 100);
  const organizationId = scope?.organizationId ?? null;

  try {
    await db.execute(
      sql`update ai_credentials set status = 'active', cooldown_until = null, updated_at = ${nowIso} where provider_id = ${providerId} and status = 'cooldown' and cooldown_until < ${nowIso}`,
    );

    const value =
      organizationId === null
        ? await db.execute(
            sql`select ${CREDENTIAL_COLUMNS} from ai_credentials where provider_id = ${providerId} and status = 'active' and organization_id is null order by priority asc, last_used_at asc limit ${limit}`,
          )
        : await db.execute(
            sql`select ${CREDENTIAL_COLUMNS} from ai_credentials where provider_id = ${providerId} and status = 'active' and (organization_id is null or organization_id = ${organizationId}) order by priority asc, last_used_at asc limit ${limit}`,
          );

    const credentials: AiCredentialRecord[] = [];
    for (const row of toRowArray(value)) {
      const credential = toCredentialRow(row);
      if (credential !== null) credentials.push(credential);
    }
    return credentials;
  } catch {
    return [];
  }
}

function errorRate(credential: AiCredentialRecord): number {
  return credential.totalRequests > 0 ? credential.failedRequests / credential.totalRequests : 0;
}

/**
 * Pick one credential from the eligible set under the active strategy.
 *
 * @param candidates - Eligible credentials, already tenant-scoped and ordered.
 * @param strategy - Rotation strategy; health-aware blends priority, error rate, and volume.
 * @returns Selected credential, or null when the set is empty.
 */
export function selectCredential(
  candidates: readonly AiCredentialRecord[],
  strategy: AiRotationStrategy,
): AiCredentialRecord | null {
  if (candidates.length === 0) return null;

  switch (strategy) {
    case 'round_robin': {
      const selected = candidates[roundRobinIndex % candidates.length];
      roundRobinIndex = (roundRobinIndex + 1) % 1000000;
      return selected ?? null;
    }
    case 'random': {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      return selected ?? null;
    }
    case 'least_used': {
      const selected = [...candidates].sort((a, b) => a.totalRequests - b.totalRequests)[0];
      return selected ?? null;
    }
    case 'lowest_error_rate': {
      const selected = [...candidates].sort((a, b) => errorRate(a) - errorRate(b))[0];
      return selected ?? null;
    }
    case 'priority_based': {
      const selected = [...candidates].sort((a, b) => a.priority - b.priority)[0];
      return selected ?? null;
    }
    case 'health_aware':
    default: {
      const selected = [...candidates].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const rateA = errorRate(a);
        const rateB = errorRate(b);
        if (rateA !== rateB) return rateA - rateB;
        return a.totalRequests - b.totalRequests;
      })[0];
      return selected ?? null;
    }
  }
}

/**
 * Classify a provider failure into a routing decision.
 *
 * @param error - Thrown provider or transport error.
 * @returns Stable error class, whether another key may be tried, and the message.
 */
export function classifyAiError(error: unknown): AiClassifiedError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthenticated') ||
    lower.includes('401')
  ) {
    return { errorClass: 'invalid_key', isRetryable: true, message };
  }

  if (lower.includes('quota_exhausted') || lower.includes('quotaexhausted')) {
    return { errorClass: 'quota_exhausted', isRetryable: true, message };
  }

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded') ||
    lower.includes('429') ||
    lower.includes('rate limit')
  ) {
    return { errorClass: 'rate_limit', isRetryable: true, message };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline exceeded') || lower.includes('aborterror')) {
    return { errorClass: 'timeout', isRetryable: true, message };
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('fetch failed') ||
    lower.includes('network error') ||
    lower.includes('503') ||
    lower.includes('unavailable')
  ) {
    return { errorClass: 'provider_unavailable', isRetryable: true, message };
  }

  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('content_filter')) {
    return { errorClass: 'safety_blocked', isRetryable: false, message };
  }

  return { errorClass: 'application_error', isRetryable: true, message };
}

/**
 * Record a successful provider call against one credential.
 *
 * @param db - Runtime database port.
 * @param credentialId - Credential row receiving the success counters.
 * @param latencyMs - Observed provider latency for the moving average.
 */
export async function recordKeySuccess(
  db: AiDb,
  credentialId: string,
  latencyMs: number,
): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const value = await db.execute(
      sql`select total_requests, successful_requests, avg_latency_ms from ai_credentials where id = ${credentialId} limit 1`,
    );
    const row = toRowArray(value)[0];
    const record = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
    const prevTotal = toNumberOrFallback(record.total_requests, 0);
    const prevSuccess = toNumberOrFallback(record.successful_requests, 0);
    const prevAvg = toNumberOrFallback(record.avg_latency_ms, latencyMs);
    const newAvg = Math.round((prevAvg * prevTotal + latencyMs) / (prevTotal + 1));
    await db.execute(
      sql`update ai_credentials set last_used_at = ${nowIso}, last_success_at = ${nowIso}, total_requests = ${prevTotal + 1}, successful_requests = ${prevSuccess + 1}, avg_latency_ms = ${newAvg}, updated_at = ${nowIso} where id = ${credentialId}`,
    );
  } catch {
    /* Telemetry must never fail an answer. */
  }
}

/**
 * Record a failed provider call and cool the credential down when warranted.
 *
 * @param db - Runtime database port.
 * @param credentialId - Credential row receiving the failure counters.
 * @param errorClass - Classified failure driving cooldown and status.
 * @param errorMessage - Raw message, truncated to 500 characters server-side.
 * @param cooldownDurationSec - Cooldown window for rate, quota, and invalid-key failures.
 */
export async function recordKeyFailure(
  db: AiDb,
  credentialId: string,
  errorClass: AiErrorClass,
  errorMessage: string,
  cooldownDurationSec = 300,
): Promise<void> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const cooldownUntil =
      errorClass === 'rate_limit' || errorClass === 'quota_exhausted' || errorClass === 'invalid_key'
        ? new Date(now.getTime() + cooldownDurationSec * 1000).toISOString()
        : null;
    const newStatus: AiCredentialStatus =
      errorClass === 'invalid_key' ? 'invalid' : cooldownUntil !== null ? 'cooldown' : 'active';

    const value = await db.execute(
      sql`select total_requests, failed_requests, rate_limit_count, quota_exhausted_count from ai_credentials where id = ${credentialId} limit 1`,
    );
    const row = toRowArray(value)[0];
    const record = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
    await db.execute(
      sql`update ai_credentials set status = ${newStatus}, cooldown_until = ${cooldownUntil}, last_used_at = ${nowIso}, last_failure_at = ${nowIso}, last_error_message = ${errorMessage.slice(0, 500)}, last_error_class = ${errorClass}, total_requests = ${toNumberOrFallback(record.total_requests, 0) + 1}, failed_requests = ${toNumberOrFallback(record.failed_requests, 0) + 1}, rate_limit_count = ${toNumberOrFallback(record.rate_limit_count, 0) + (errorClass === 'rate_limit' ? 1 : 0)}, quota_exhausted_count = ${toNumberOrFallback(record.quota_exhausted_count, 0) + (errorClass === 'quota_exhausted' ? 1 : 0)}, updated_at = ${nowIso} where id = ${credentialId}`,
    );
  } catch {
    /* Telemetry must never fail an answer. */
  }
}

/**
 * Resolve one usable plaintext key without exposing it beyond the server.
 *
 * @param db - Runtime database port.
 * @param providerId - Provider whose highest-priority credential wins.
 * @param scope - Tenant scope forwarded to credential selection.
 * @returns Plaintext key for the provider adapter, or null when none is usable.
 * @remarks Database-only: no environment fallback exists, so callers must
 * handle null as provider exhaustion rather than retrying another source.
 */
export async function resolveApiKey(
  db: AiDb,
  providerId = 'gemini',
  scope?: AiCredentialScope | undefined,
): Promise<string | null> {
  const credentials = await getAvailableCredentials(db, providerId, scope);
  const selected = credentials[0];
  if (selected === undefined) return null;
  const plain = await decryptAiKey(db, selected.keyEncrypted);
  return plain === '' ? null : plain;
}
