import 'server-only';

import { aiBreakerKey, readModelBreakerState, resolveAiModelChain } from '@/modules/ai/ai-router';
import type { AiRoutingPolicy } from '@/modules/ai/ai-types';

/** One chain entry with live health for the control-plane panel. */
export interface AiChainHealthEntry {
  readonly providerId: string;
  readonly modelName: string;
  readonly role: 'primary' | 'fallback';
  readonly hasCredential: boolean;
  readonly tripped: boolean;
  readonly failCount: number;
}

/**
 * Build chain health for the armed policy without touching providers.
 *
 * @param policy - Active routing policy, or null when unconfigured.
 * @param breakerValues - Raw breaker counters keyed by `ai:breaker:{provider}:{model}`.
 * @param activeProviders - Provider ids holding at least one active credential.
 * @param nowMs - Clock in epoch ms for half-open evaluation.
 * @returns Ordered primary → fallback entries; empty when routing is unconfigured.
 */
export function buildChainHealth(
  policy: AiRoutingPolicy | null,
  breakerValues: ReadonlyMap<string, unknown>,
  activeProviders: ReadonlySet<string>,
  nowMs: number = Date.now(),
): readonly AiChainHealthEntry[] {
  if (policy === null) return [];
  return resolveAiModelChain(policy).map((entry, index) => {
    const state = readModelBreakerState(breakerValues.get(aiBreakerKey(entry.providerId, entry.modelName)), nowMs);
    return {
      providerId: entry.providerId,
      modelName: entry.modelName,
      role: index === 0 ? 'primary' : 'fallback',
      hasCredential: activeProviders.has(entry.providerId),
      tripped: state.tripped,
      failCount: state.failCount,
    };
  });
}
