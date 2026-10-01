import 'server-only';

import { Redis } from '@upstash/redis';

/** OpenAI-compatible entry point for every Vercel AI Gateway model. */
export const VERCEL_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/** Monthly token ceiling per gateway credential for editorial free-tier workloads. */
export const VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET = 500_000;

/** Minimal Redis surface for the monthly counters; fail-open lives in the guard. */
export interface VercelGatewayBudgetStore {
  get(key: string): Promise<unknown>;
  incrby(key: string, value: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
}

/** Verdict of one pre-call monthly budget check. */
export interface VercelGatewayBudgetVerdict {
  readonly allowed: boolean;
  readonly remainingBudget: number;
}

function monthKey(credentialId: string, now: Date): string {
  return `ai:vercel-gateway:tokens:${credentialId}:${now.toISOString().slice(0, 7)}`;
}

function secondsUntilMonthEnd(now: Date): number {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(3600, Math.floor((end.getTime() - now.getTime()) / 1000));
}

/**
 * Checks one gateway credential against its monthly token budget.
 *
 * @param store - Shared Upstash client; null means unconfigured and allows the request.
 * @param credentialId - Gateway credential row receiving the spend.
 * @param now - Clock reference; defaults to the current time in production.
 * @returns Verdict plus the remaining monthly token budget.
 * @remarks Fail-open: a Redis failure allows the request rather than blocking it.
 */
export async function checkVercelGatewayBudget(
  store: VercelGatewayBudgetStore | null,
  credentialId: string,
  now: Date = new Date(),
): Promise<VercelGatewayBudgetVerdict> {
  if (store === null) return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET };
  try {
    const spent = Number((await store.get(monthKey(credentialId, now))) ?? 0);
    if (spent >= VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET) {
      return { allowed: false, remainingBudget: Math.max(0, VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - spent) };
    }
    return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - spent };
  } catch {
    return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET };
  }
}

/**
 * Records token consumption against one gateway credential's monthly budget.
 *
 * @param store - Shared Upstash client; null means unconfigured and records nothing.
 * @param credentialId - Gateway credential row receiving the spend.
 * @param tokensCount - Total tokens for this turn.
 * @param now - Clock reference; defaults to the current time in production.
 * @remarks Fail-open: telemetry failure never fails the answer.
 */
export async function recordVercelGatewayUsage(
  store: VercelGatewayBudgetStore | null,
  credentialId: string,
  tokensCount: number,
  now: Date = new Date(),
): Promise<void> {
  if (store === null) return;
  try {
    const key = monthKey(credentialId, now);
    await store.incrby(key, Math.max(1, Math.floor(tokensCount || 1)));
    await store.expire(key, secondsUntilMonthEnd(now));
  } catch {
    /* telemetry failure does not fail the answer */
  }
}

/**
 * Builds a monthly budget guard bound to the shared Upstash resource.
 *
 * @param config - Redis connection from the runtime config; no new environment variable.
 * @returns Check and record closures sharing one client.
 */
export function createVercelGatewayBudgetGuard(config: { readonly url: string; readonly token: string }): {
  check(credentialId: string, now?: Date): Promise<VercelGatewayBudgetVerdict>;
  record(credentialId: string, tokensCount: number, now?: Date): Promise<void>;
} {
  const redis = new Redis({ url: config.url, token: config.token });
  return {
    check: (credentialId: string, now?: Date) => checkVercelGatewayBudget(redis, credentialId, now),
    record: (credentialId: string, tokensCount: number, now?: Date) => recordVercelGatewayUsage(redis, credentialId, tokensCount, now),
  };
}
