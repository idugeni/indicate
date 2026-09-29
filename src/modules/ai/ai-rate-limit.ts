import 'server-only';

import { sql } from 'drizzle-orm';
import { Redis } from '@upstash/redis';

import type { AiDb } from '@/modules/ai/ai-types';

/** Sliding window for per-model RPM/TPM enforcement. */
export const AI_RATE_LIMIT_WINDOW_SECONDS = 60;

/** Per-model limits read from `ai_models`; null means unlimited. */
export interface AiModelRateLimits {
  readonly rpmLimit: number | null;
  readonly tpmLimit: number | null;
}

/** Minimal Redis surface for the fixed-window counters; fail-open lives in the check. */
export interface AiRateLimitStore {
  readonly get: (key: string) => Promise<number | null>;
  readonly incrby: (key: string, delta: number) => Promise<number>;
  readonly expire: (key: string, seconds: number) => Promise<void>;
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
 * Enforce per-model RPM/TPM against a 60-second fixed window.
 *
 * @param store - Redis counter surface.
 * @param limits - Ceilings for the model; nulls skip that dimension.
 * @param modelName - Model under enforcement.
 * @param estimatedTokens - Pre-call input estimate charged to the TPM window.
 * @param now - Observation time; defaults to the current time.
 * @returns Allowed verdict, or the exceeded dimension. Blocked calls consume
 * nothing; every Redis failure resolves to allowed.
 */
export async function checkAiModelRateLimit(
  store: AiRateLimitStore,
  limits: AiModelRateLimits,
  modelName: string,
  estimatedTokens: number,
  now: Date = new Date(),
): Promise<AiRateLimitCheck> {
  const window = aiRateLimitWindow(now);
  const rpmKey = aiRpmKey(modelName, window);
  const tpmKey = aiTpmKey(modelName, window);
  try {
    if (limits.rpmLimit !== null) {
      const current = (await store.get(rpmKey)) ?? 0;
      if (current >= limits.rpmLimit) return { allowed: false, reason: 'rpm_exceeded' };
    }
    if (limits.tpmLimit !== null) {
      const current = (await store.get(tpmKey)) ?? 0;
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
export function createAiModelRateLimitStore(config: { readonly url: string; readonly token: string }): AiRateLimitStore {
  const redis = new Redis({ url: config.url, token: config.token });
  return {
    async get(key: string): Promise<number | null> {
      const value = await redis.get<number>(key);
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    },
    async incrby(key: string, delta: number): Promise<number> {
      return redis.incrby(key, delta);
    },
    async expire(key: string, seconds: number): Promise<void> {
      await redis.expire(key, seconds);
    },
  };
}
