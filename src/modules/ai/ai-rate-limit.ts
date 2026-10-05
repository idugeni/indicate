import 'server-only';

import { sql } from 'drizzle-orm';
import { Redis } from '@upstash/redis';

import type { AiDb } from '@/modules/ai/ai-types';
import { aiScopedGet, aiScopedKey } from '@/modules/ai/ai-redis-namespace';

/** Sliding window for per-model RPM/TPM enforcement. */
export const AI_RATE_LIMIT_WINDOW_SECONDS = 60;

/** Per-model limits read from `ai_models`; null means unlimited. */
export interface AiModelRateLimits {
  readonly rpmLimit: number | null;
  readonly tpmLimit: number | null;
}

/** Minimal Redis surface for the fixed-window counters; fail-open lives in the check. */
export interface AiRateLimitStore {
  /** Raw counter read; Upstash may return numeric strings, coerced with `Number()`. */
  readonly get: (key: string) => Promise<number | string | null>;
  readonly incrby: (key: string, delta: number) => Promise<number>;
  readonly expire: (key: string, seconds: number) => Promise<void>;
  /** Optional atomic set for breaker timestamp values; absent stores use incrby. */
  readonly set?: ((key: string, value: string) => Promise<void>) | undefined;
  /** Optional Lua eval for atomic check-and-charge; absent stores use the legacy path. */
  readonly eval?: ((script: string, keys: readonly string[], args: ReadonlyArray<string | number>) => Promise<unknown>) | undefined;
  /** Derived Redis namespace (`indicate:{env}:vN`); null/undefined keeps legacy global `ai:*` keys. */
  readonly namespace?: string | null | undefined;
}

/**
 * Atomic RPM/TPM check-and-charge script.
 *
 * @remarks KEYS[1] RPM counter, KEYS[2] TPM counter; ARGV rpm_limit, tpm_limit
 * (-1 = unlimited), token charge, window TTL. Returns 'ok', 'rpm_exceeded',
 * or 'tpm_exceeded'. One server round-trip: concurrent instances can no
 * longer over-admit between check and increment.
 */
export const AI_RATE_LIMIT_LUA = [
  "local rpm = tonumber(redis.call('GET', KEYS[1]) or 0)",
  "local tpm = tonumber(redis.call('GET', KEYS[2]) or 0)",
  'if tonumber(ARGV[1]) >= 0 and rpm >= tonumber(ARGV[1]) then return {\'rpm_exceeded\'} end',
  'if tonumber(ARGV[2]) >= 0 and tpm + tonumber(ARGV[3]) > tonumber(ARGV[2]) then return {\'tpm_exceeded\'} end',
  "if tonumber(ARGV[1]) >= 0 then redis.call('INCRBY', KEYS[1], 1) redis.call('EXPIRE', KEYS[1], ARGV[4]) end",
  "if tonumber(ARGV[2]) >= 0 then redis.call('INCRBY', KEYS[2], tonumber(ARGV[3])) redis.call('EXPIRE', KEYS[2], ARGV[4]) end",
  "return {'ok'}",
].join('\n');

/**
 * Read one verdict token from a Lua script result.
 *
 * @param value - Raw eval result (single-element array or plain string).
 * @returns Check verdict; unknown shapes fail open to allowed.
 */
export function readRateLimitVerdict(value: unknown): AiRateLimitCheck {
  const token = Array.isArray(value) ? value[0] : value;
  if (token === 'rpm_exceeded') return { allowed: false, reason: 'rpm_exceeded' };
  if (token === 'tpm_exceeded') return { allowed: false, reason: 'tpm_exceeded' };
  return { allowed: true };
}

/** Verdict of one pre-call limit check. */
export interface AiRateLimitCheck {
  readonly allowed: boolean;
  readonly reason?: 'rpm_exceeded' | 'tpm_exceeded' | undefined;
}

/**
 * Resolve the 60-second window bucket for one timestamp.
 *
 * @param now - Observation time.
 * @returns Whole-minute bucket shared by every instance.
 */
export function aiRateLimitWindow(now: Date): number {
  return Math.floor(now.getTime() / 60000);
}

/**
 * Build the request-counter key for one model and window.
 *
 * @param modelName - Model under enforcement.
 * @param window - Whole-minute bucket from `aiRateLimitWindow`.
 * @returns Namespaced RPM key.
 * @remarks Key shape is stable (`ai:limit:rpm:<model>:<window>`); counters
 * turn over by window, so tuning limits never requires renaming keys.
 */
export function aiRpmKey(modelName: string, window: number): string {
  return `ai:limit:rpm:${modelName}:${window}`;
}

/**
 * Build the token-counter key for one model and window.
 *
 * @param modelName - Model under enforcement.
 * @param window - Whole-minute bucket from `aiRateLimitWindow`.
 * @returns Namespaced TPM key.
 * @remarks Key shape is stable (`ai:limit:tpm:<model>:<window>`); counters
 * turn over by window, so tuning limits never requires renaming keys.
 */
export function aiTpmKey(modelName: string, window: number): string {
  return `ai:limit:tpm:${modelName}:${window}`;
}

function toPositiveOrNull(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

/**
 * Read RPM/TPM ceilings for one model from the model directory.
 *
 * @param db - Runtime database port.
 * @param modelName - Model whose ceilings apply.
 * @returns Limits, or nulls (unlimited) when the model is not registered or the read fails.
 */
export async function getAiModelLimits(db: AiDb, modelName: string): Promise<AiModelRateLimits> {
  try {
    const value = await db.execute(
      sql`select rpm_limit, tpm_limit from ai_models where model_name = ${modelName} limit 1`,
    );
    const row = (Array.isArray(value) ? value[0] : undefined) as Record<string, unknown> | undefined;
    if (row === undefined) return { rpmLimit: null, tpmLimit: null };
    return { rpmLimit: toPositiveOrNull(row.rpm_limit), tpmLimit: toPositiveOrNull(row.tpm_limit) };
  } catch {
    return { rpmLimit: null, tpmLimit: null };
  }
}

/**
 * Estimate input tokens from prompt text length.
 *
 * @param promptText - Raw caller prompt.
 * @param historyLength - Conversation turns forwarded with the prompt.
 * @returns Token estimate, at least 1.
 */
export function estimateAiInputTokens(promptText: string, historyLength = 0): number {
  return Math.max(1, Math.ceil((promptText.length + historyLength * 200) / 4));
}

/**
 * Coerce a Redis counter read to a finite number.
 *
 * @param value - Raw store value (Upstash may return numeric strings).
 * @returns Finite number, or 0 when missing or non-numeric.
 */
function toCounterOrZero(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Enforce per-model RPM/TPM against a 60-second fixed window.
 *
 * @param store - Redis counter surface.
 * @param limits - Ceilings for the model; nulls skip that dimension.
 * @param modelName - Model under enforcement.
 * @param estimatedTokens - Pre-call input estimate charged to the TPM window.
 * @param now - Observation time; defaults to the current time.
 * @returns Allowed verdict, or the exceeded dimension. Blocked calls consume
 * nothing; every Redis failure resolves to allowed.
 * @remarks Prefers the atomic Lua path when the store supports eval;
 * otherwise falls back to legacy check-then-increment (concurrent instances
 * may slightly overshoot). Fail-open is intentional: Redis errors resolve
 * to allowed so a counter outage never blocks answers.
 */
export async function checkAiModelRateLimit(
  store: AiRateLimitStore,
  limits: AiModelRateLimits,
  modelName: string,
  estimatedTokens: number,
  now: Date = new Date(),
): Promise<AiRateLimitCheck> {
  const window = aiRateLimitWindow(now);
  const namespace = store.namespace ?? null;
  const read = (key: string): Promise<unknown> => store.get(key);
  const rpmKey = aiScopedKey(namespace, aiRpmKey(modelName, window));
  const tpmKey = aiScopedKey(namespace, aiTpmKey(modelName, window));
  const charge = Math.max(1, Math.floor(estimatedTokens));
  if (store.eval !== undefined) {
    try {
      const verdict = await store.eval(
        AI_RATE_LIMIT_LUA,
        [rpmKey, tpmKey],
        [limits.rpmLimit ?? -1, limits.tpmLimit ?? -1, charge, AI_RATE_LIMIT_WINDOW_SECONDS],
      );
      return readRateLimitVerdict(verdict);
    } catch {
      return { allowed: true };
    }
  }
  try {
    if (limits.rpmLimit !== null) {
      const current = toCounterOrZero(await aiScopedGet(read, namespace, aiRpmKey(modelName, window)));
      if (current >= limits.rpmLimit) return { allowed: false, reason: 'rpm_exceeded' };
    }
    if (limits.tpmLimit !== null) {
      const current = toCounterOrZero(await aiScopedGet(read, namespace, aiTpmKey(modelName, window)));
      if (current + Math.max(1, Math.floor(estimatedTokens)) > limits.tpmLimit) {
        return { allowed: false, reason: 'tpm_exceeded' };
      }
    }
    if (limits.rpmLimit !== null) {
      await store.incrby(rpmKey, 1);
      await store.expire(rpmKey, AI_RATE_LIMIT_WINDOW_SECONDS);
    }
    if (limits.tpmLimit !== null) {
      await store.incrby(tpmKey, Math.max(1, Math.floor(estimatedTokens)));
      await store.expire(tpmKey, AI_RATE_LIMIT_WINDOW_SECONDS);
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Build the Upstash-backed counter surface for per-model enforcement.
 *
 * @param config - Upstash connection details.
 * @returns Store whose failures the check treats as allowed.
 * @remarks Sourced from the assembled runtime configuration, never from
 * per-feature environment variables.
 */
export function createAiModelRateLimitStore(config: { readonly url: string; readonly token: string; readonly namespace?: string | null | undefined }): AiRateLimitStore {
  const redis = new Redis({ url: config.url, token: config.token });
  const namespace = config.namespace ?? null;
  return {
    namespace,
    async get(key: string): Promise<number | null> {
      // Upstash may return numeric strings; coerce with Number().
      const value = await redis.get<number | string>(key);
      if (value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
    async incrby(key: string, delta: number): Promise<number> {
      return redis.incrby(key, delta);
    },
    async expire(key: string, seconds: number): Promise<void> {
      await redis.expire(key, seconds);
    },
    async eval(script: string, keys: readonly string[], args: ReadonlyArray<string | number>): Promise<unknown> {
      return redis.eval(script, [...keys], [...args] as (string | number)[]);
    },
  };
}

/** Time-to-live for per-organization daily quota counters. */
export const AI_ORG_QUOTA_TTL_SECONDS = 48 * 3600;

/** Daily ceilings for one organization; null means unlimited. */
export interface AiOrganizationQuotaLimits {
  readonly dailyRequestLimit: number | null;
  readonly dailyTokenLimit: number | null;
}

/** Verdict of one pre-call per-organization quota check. */
export interface AiOrganizationQuotaCheck {
  readonly allowed: boolean;
  readonly reason?: 'org_daily_requests_exceeded' | 'org_daily_tokens_exceeded' | undefined;
  readonly remainingRequests?: number | undefined;
  readonly remainingTokens?: number | undefined;
}

/**
 * Build the daily request-counter key for one organization.
 *
 * @param organizationId - Tenant under enforcement.
 * @param day - Calendar day (`YYYY-MM-DD`) shared by every instance.
 * @returns Namespaced per-organization request key.
 */
export function aiOrgQuotaRequestsKey(organizationId: string, day: string): string {
  return `ai:quota:org:req:${organizationId}:${day}`;
}

/**
 * Build the daily token-counter key for one organization.
 *
 * @param organizationId - Tenant under enforcement.
 * @param day - Calendar day (`YYYY-MM-DD`) shared by every instance.
 * @returns Namespaced per-organization token key.
 */
export function aiOrgQuotaTokensKey(organizationId: string, day: string): string {
  return `ai:quota:org:tok:${organizationId}:${day}`;
}

/**
 * Enforce per-organization daily request and token quotas.
 *
 * @param store - Redis counter surface.
 * @param organizationId - Tenant under enforcement.
 * @param limits - Daily ceilings; nulls skip that dimension.
 * @param estimatedTokens - Pre-call input estimate charged to the token quota.
 * @param now - Observation time; defaults to the current time.
 * @returns Allowed verdict with remaining quota, or the exceeded dimension.
 * Blocked calls consume nothing; every Redis failure resolves to allowed.
 * @remarks Check-then-increment is not atomic; concurrent instances may
 * slightly overshoot the ceiling. Fail-open is intentional.
 */
export async function checkOrganizationQuota(
  store: AiRateLimitStore,
  organizationId: string,
  limits: AiOrganizationQuotaLimits,
  estimatedTokens = 1,
  now: Date = new Date(),
): Promise<AiOrganizationQuotaCheck> {
  const day = now.toISOString().slice(0, 10);
  const namespace = store.namespace ?? null;
  const read = (key: string): Promise<unknown> => store.get(key);
  const requestsKey = aiScopedKey(namespace, aiOrgQuotaRequestsKey(organizationId, day));
  const tokensKey = aiScopedKey(namespace, aiOrgQuotaTokensKey(organizationId, day));
  const charge = Math.max(1, Math.floor(estimatedTokens));
  try {
    let remainingRequests: number | undefined;
    let remainingTokens: number | undefined;
    if (limits.dailyRequestLimit !== null) {
      const current = toCounterOrZero(await aiScopedGet(read, namespace, aiOrgQuotaRequestsKey(organizationId, day)));
      if (current >= limits.dailyRequestLimit) {
        return { allowed: false, reason: 'org_daily_requests_exceeded', remainingRequests: 0 };
      }
      remainingRequests = limits.dailyRequestLimit - current;
    }
    if (limits.dailyTokenLimit !== null) {
      const current = toCounterOrZero(await aiScopedGet(read, namespace, aiOrgQuotaTokensKey(organizationId, day)));
      if (current + charge > limits.dailyTokenLimit) {
        return { allowed: false, reason: 'org_daily_tokens_exceeded', remainingTokens: Math.max(0, limits.dailyTokenLimit - current) };
      }
      remainingTokens = limits.dailyTokenLimit - current;
    }
    if (limits.dailyRequestLimit !== null) {
      await store.incrby(requestsKey, 1);
      await store.expire(requestsKey, AI_ORG_QUOTA_TTL_SECONDS);
    }
    if (limits.dailyTokenLimit !== null) {
      await store.incrby(tokensKey, charge);
      await store.expire(tokensKey, AI_ORG_QUOTA_TTL_SECONDS);
    }
    return { allowed: true, remainingRequests, remainingTokens };
  } catch {
    return { allowed: true };
  }
}

/**
 * Read daily per-organization quota ceilings.
 *
 * @param db - Runtime database port.
 * @param organizationId - Tenant whose ceilings apply.
 * @returns Limits, or nulls (unlimited) when the row is missing or the read fails.
 */
export async function getOrganizationQuotaLimits(
  db: AiDb,
  organizationId: string,
): Promise<AiOrganizationQuotaLimits> {
  try {
    const value = await db.execute(
      sql`select daily_request_limit, daily_token_limit from organizations where id = ${organizationId} limit 1`,
    );
    const row = (Array.isArray(value) ? value[0] : undefined) as Record<string, unknown> | undefined;
    if (row === undefined) return { dailyRequestLimit: null, dailyTokenLimit: null };
    return {
      dailyRequestLimit: toPositiveOrNull(row.daily_request_limit),
      dailyTokenLimit: toPositiveOrNull(row.daily_token_limit),
    };
  } catch {
    return { dailyRequestLimit: null, dailyTokenLimit: null };
  }
}
