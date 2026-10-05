import 'server-only';

import { Redis } from '@upstash/redis';

import { aiScopedGet, aiScopedKey } from '@/modules/ai/ai-redis-namespace';
import { recordAiGate } from '@/modules/ai/ai-rate-limit';

/** OpenAI-compatible entry point for every Vercel AI Gateway model. */
export const VERCEL_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/** Monthly token ceiling shared by one organization across every Vercel AI Gateway model (free-tier single pool). */
export const VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET = 500_000;

/** Fixed model segment for the shared pool scope; every gateway model draws from one `${org}:vercel-gateway` pool. */
export const VERCEL_GATEWAY_BUDGET_POOL = 'vercel-gateway';

/**
 * Builds the shared monthly budget scope for one tenant.
 *
 * @param organizationId - Tenant owning the spend; nullish falls back to the global pool.
 * @returns Scope in `${org}:vercel-gateway` form, identical for every gateway model.
 */
export function vercelGatewayBudgetScope(organizationId: string | null | undefined): string {
  return `${organizationId ?? 'global'}:${VERCEL_GATEWAY_BUDGET_POOL}`;
}

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
 * Checks one organization pool against its monthly token budget.
 *
 * @param store - Shared Upstash client; null means unconfigured and allows the request.
 * @param credentialId - Budget scope from `vercelGatewayBudgetScope` (one pool per org, shared by all models).
 * @param now - Clock reference; defaults to the current time in production.
 * @param namespace - Derived Redis namespace; null reads the legacy global key.
 * @returns Verdict plus the remaining monthly token budget.
 * @remarks Fail-open: a Redis failure allows the request rather than blocking it.
 * Legacy fallback keeps the monthly pool continuous across the namespacing rollout.
 */
export async function checkVercelGatewayBudget(
  store: VercelGatewayBudgetStore | null,
  credentialId: string,
  now: Date = new Date(),
  namespace: string | null | undefined = null,
): Promise<VercelGatewayBudgetVerdict> {
  if (store === null) return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET };
  const started = Date.now();
  let commands = 0;
  const read = async (key: string): Promise<unknown> => {
    commands += 1;
    return store.get(key);
  };
  try {
    const spent = Number((await aiScopedGet(read, namespace, monthKey(credentialId, now))) ?? 0);
    recordAiGate('ai.gateway', started, commands, 200);
    if (spent >= VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET) {
      return { allowed: false, remainingBudget: Math.max(0, VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - spent) };
    }
    return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - spent };
  } catch {
    recordAiGate('ai.gateway', started, commands, 500);
    return { allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET };
  }
}

/**
 * Records token consumption against one organization pool's monthly budget.
 *
 * @param store - Shared Upstash client; null means unconfigured and records nothing.
 * @param credentialId - Budget scope from `vercelGatewayBudgetScope` (one pool per org, shared by all models).
 * @param tokensCount - Total tokens for this turn.
 * @param now - Clock reference; defaults to the current time in production.
 * @param namespace - Derived Redis namespace; writes always go namespaced when set.
 * @remarks Fail-open: telemetry failure never fails the answer.
 */
export async function recordVercelGatewayUsage(
  store: VercelGatewayBudgetStore | null,
  credentialId: string,
  tokensCount: number,
  now: Date = new Date(),
  namespace: string | null | undefined = null,
): Promise<void> {
  if (store === null) return;
  const started = Date.now();
  try {
    const key = aiScopedKey(namespace, monthKey(credentialId, now));
    await store.incrby(key, Math.max(1, Math.floor(tokensCount || 1)));
    await store.expire(key, secondsUntilMonthEnd(now));
    recordAiGate('ai.gateway', started, 2, 200);
  } catch {
    recordAiGate('ai.gateway', started, 0, 500);
    /* telemetry failure does not fail the answer */
  }
}

/**
 * Builds a monthly budget guard bound to the shared Upstash resource.
 *
 * @param config - Redis connection from the runtime config; no new environment variable.
 * @returns Check and record closures sharing one client.
 */
export function createVercelGatewayBudgetGuard(config: { readonly url: string; readonly token: string; readonly namespace?: string | null | undefined }): {
  check(credentialId: string, now?: Date): Promise<VercelGatewayBudgetVerdict>;
  record(credentialId: string, tokensCount: number, now?: Date): Promise<void>;
} {
  const redis = new Redis({ url: config.url, token: config.token });
  const namespace = config.namespace ?? null;
  return {
    check: (credentialId: string, now?: Date) => checkVercelGatewayBudget(redis, credentialId, now, namespace),
    record: (credentialId: string, tokensCount: number, now?: Date) => recordVercelGatewayUsage(redis, credentialId, tokensCount, now, namespace),
  };
}
