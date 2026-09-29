import 'server-only';

import { Redis } from '@upstash/redis';

export const DAILY_AI_TOKEN_BUDGET = 250_000;
export const HOURLY_AI_REQUEST_LIMIT = 60;

const TOKENS_TTL_SECONDS = 48 * 3600;
const REQUESTS_TTL_SECONDS = 2 * 3600;

export interface AiBudgetRedis {
  get(key: string): Promise<unknown>;
  incrby(key: string, value: number): Promise<unknown>;
  incr(key: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export interface AiBudgetVerdict {
  readonly allowed: boolean;
  readonly remainingBudget: number;
}

function dayKey(now: Date): string {
  return `ai:budget:tokens:${now.toISOString().slice(0, 10)}`;
}

function hourKey(now: Date): string {
  return `ai:budget:reqs:${now.toISOString().slice(0, 13)}`;
}

/**
 * Checks the global AI spend against the daily token and hourly request caps.
 *
 * @param redis - Shared Upstash client; null means unconfigured and allows the request.
 * @param now - Clock reference; defaults to the current time in production.
 * @returns Verdict plus the remaining daily token budget.
 * @remarks Fail-open: a Redis failure allows the request rather than blocking it.
 */
export async function checkAiBudgetSafeguard(redis: AiBudgetRedis | null, now: Date = new Date()): Promise<AiBudgetVerdict> {
  if (redis === null) return { allowed: true, remainingBudget: DAILY_AI_TOKEN_BUDGET };
  try {
    const [tokens, reqs] = await Promise.all([redis.get(dayKey(now)), redis.get(hourKey(now))]);
    const tokensToday = Number(tokens ?? 0);
    const reqsHour = Number(reqs ?? 0);
    if (tokensToday >= DAILY_AI_TOKEN_BUDGET || reqsHour >= HOURLY_AI_REQUEST_LIMIT) {
      return { allowed: false, remainingBudget: Math.max(0, DAILY_AI_TOKEN_BUDGET - tokensToday) };
    }
    return { allowed: true, remainingBudget: DAILY_AI_TOKEN_BUDGET - tokensToday };
  } catch {
    return { allowed: true, remainingBudget: DAILY_AI_TOKEN_BUDGET };
  }
}

/**
 * Records token consumption and one request against the global AI budget.
 *
 * @param redis - Shared Upstash client; null means unconfigured and records nothing.
 * @param tokensCount - Completion-side token total for this turn.
 * @param now - Clock reference; defaults to the current time in production.
 * @remarks Fail-open: telemetry failure never fails the answer.
 */
export async function recordAiTokenUsage(
  redis: AiBudgetRedis | null,
  tokensCount: number,
  now: Date = new Date(),
): Promise<void> {
  if (redis === null) return;
  try {
    const tokens = Math.max(1, Math.floor(tokensCount || 1));
    await redis.incrby(dayKey(now), tokens);
    await redis.expire(dayKey(now), TOKENS_TTL_SECONDS);
    await redis.incr(hourKey(now));
    await redis.expire(hourKey(now), REQUESTS_TTL_SECONDS);
  } catch {
    /* telemetry failure does not fail the answer */
  }
}

/**
 * Builds budget guards bound to the shared Upstash resource.
 *
 * @param config - Redis connection from the runtime config; no new environment variable.
 * @returns Check and record closures sharing one client.
 */
export function createAiBudgetGuard(config: { readonly url: string; readonly token: string }): {
  check(now?: Date): Promise<AiBudgetVerdict>;
  record(tokensCount: number, now?: Date): Promise<void>;
} {
  const redis = new Redis({ url: config.url, token: config.token });
  return {
    check: (now?: Date) => checkAiBudgetSafeguard(redis, now),
    record: (tokensCount: number, now?: Date) => recordAiTokenUsage(redis, tokensCount, now),
  };
}
