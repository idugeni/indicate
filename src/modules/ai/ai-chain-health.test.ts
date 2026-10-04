import { describe, expect, it } from 'vitest';

import { buildChainHealth } from '@/modules/ai/ai-chain-health';
import type { AiRoutingPolicy } from '@/modules/ai/ai-types';

function makePolicy(overrides?: Partial<AiRoutingPolicy>): AiRoutingPolicy {
  return {
    id: 'default',
    rotationStrategy: 'health_aware',
    chainStrategy: 'fallback',
    costMode: 'throughput',
    primaryProviderId: 'openrouter',
    fallbackProviderId: 'vercel-gateway',
    defaultModel: 'dots-studio/dots-3-note-preview:free',
    fallbackModel: 'inclusionai/ling-3.1-flash-free',
    maxRetries: 5,
    perKeyRetryLimit: 2,
    cooldownDurationSec: 60,
    requestTimeoutMs: 60000,
    globalConcurrencyLimit: 100,
    updatedAt: '2026-10-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildChainHealth', () => {
  it('kosong saat routing belum dikonfigurasi', () => {
    expect(buildChainHealth(null, new Map(), new Set())).toEqual([]);
    expect(buildChainHealth(makePolicy({ primaryProviderId: null }), new Map(), new Set())).toEqual([]);
  });

  it('sehat saat tidak ada counter dan kredensial tersedia', () => {
    const entries = buildChainHealth(makePolicy(), new Map(), new Set(['openrouter', 'vercel-gateway']));
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ providerId: 'openrouter', role: 'primary', hasCredential: true, tripped: false, failCount: 0 });
    expect(entries[1]).toMatchObject({ providerId: 'vercel-gateway', role: 'fallback', hasCredential: true, tripped: false, failCount: 0 });
  });

  it('menandai trip dan kredensial hilang', () => {
    const entries = buildChainHealth(
      makePolicy(),
      new Map([['ai:breaker:openrouter:dots-studio/dots-3-note-preview:free', '5:1000']]),
      new Set(['vercel-gateway']),
      1000 + 10_000,
    );
    expect(entries[0]).toMatchObject({ tripped: true, failCount: 5, hasCredential: false });
    expect(entries[1]).toMatchObject({ tripped: false, failCount: 0, hasCredential: true });
  });

  it('half-open setelah jendela trip berlalu', () => {
    const entries = buildChainHealth(
      makePolicy(),
      new Map([['ai:breaker:openrouter:dots-studio/dots-3-note-preview:free', '5:1000']]),
      new Set(['openrouter']),
      1000 + 121_000,
    );
    expect(entries[0]).toMatchObject({ tripped: false, failCount: 5 });
  });
});
