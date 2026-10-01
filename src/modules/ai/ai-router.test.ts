import { beforeEach, describe, expect, it } from 'vitest';

import { AI_TASK_THINKING_BUDGET, BACKGROUND_MAX_RETRIES, INTERACTIVE_MAX_RETRIES, aiBreakerKey, classifyAiError, isModelBreakerTripped, recordModelInfraFailure, recordModelSuccess, resetAiRotationState, resolveAiModelChain, resolveMaxRetries, resolveTaskThinkingBudget, selectCredential, shouldAlertBreakerTrip } from '@/modules/ai/ai-router';
import type { AiCredentialRecord, AiRoutingPolicy } from '@/modules/ai/ai-types';

function makeCredential(overrides: Partial<AiCredentialRecord> & { id: string }): AiCredentialRecord {
  return {
    providerId: 'gemini',
    organizationId: null,
    label: 'test key',
    keyEncrypted: 'cipher',
    keyMasked: 'abcd...wxyz',
    status: 'active',
    priority: 1,
    weight: 100,
    cooldownUntil: null,
    lastUsedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorMessage: null,
    lastErrorClass: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitCount: 0,
    quotaExhaustedCount: 0,
    avgLatencyMs: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectCredential', () => {
  beforeEach(() => {
    resetAiRotationState();
  });

  it('mengembalikan null untuk kandidat kosong', () => {
    expect(selectCredential([], 'health_aware')).toBeNull();
  });

  it('round_robin memutar kandidat secara berurutan', () => {
    const candidates = [makeCredential({ id: 'a' }), makeCredential({ id: 'b' })];
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('a');
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('b');
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('a');
  });

  it('random memilih salah satu kandidat', () => {
    const candidates = [makeCredential({ id: 'a' }), makeCredential({ id: 'b' })];
    const picked = selectCredential(candidates, 'random');
    expect(['a', 'b']).toContain(picked?.id);
  });

  it('least_used memilih total_requests terkecil', () => {
    const candidates = [
      makeCredential({ id: 'busy', totalRequests: 50 }),
      makeCredential({ id: 'idle', totalRequests: 3 }),
    ];
    expect(selectCredential(candidates, 'least_used')?.id).toBe('idle');
  });

  it('lowest_error_rate memilih rasio gagal terendah', () => {
    const candidates = [
      makeCredential({ id: 'flaky', totalRequests: 10, failedRequests: 5 }),
      makeCredential({ id: 'steady', totalRequests: 10, failedRequests: 1 }),
    ];
    expect(selectCredential(candidates, 'lowest_error_rate')?.id).toBe('steady');
  });

  it('priority_based memilih angka prioritas terkecil', () => {
    const candidates = [
      makeCredential({ id: 'low', priority: 9 }),
      makeCredential({ id: 'high', priority: 1 }),
    ];
    expect(selectCredential(candidates, 'priority_based')?.id).toBe('high');
  });

  it('health_aware mengutamakan prioritas lalu rasio gagal', () => {
    const candidates = [
      makeCredential({ id: 'p2-clean', priority: 2, totalRequests: 10, failedRequests: 0 }),
      makeCredential({ id: 'p1-flaky', priority: 1, totalRequests: 10, failedRequests: 9 }),
      makeCredential({ id: 'p1-clean', priority: 1, totalRequests: 10, failedRequests: 0 }),
    ];
    expect(selectCredential(candidates, 'health_aware')?.id).toBe('p1-clean');
  });

  it('health_aware menurunkan kunci lambat dan memakai weight sebagai tie-break', () => {
    const slow = makeCredential({ id: 'slow', priority: 1, avgLatencyMs: 9000, weight: 100 });
    const fast = makeCredential({ id: 'fast', priority: 1, avgLatencyMs: 200, weight: 100 });
    expect(selectCredential([slow, fast], 'health_aware')?.id).toBe('fast');
    const light = makeCredential({ id: 'light', priority: 1, avgLatencyMs: 200, weight: 10 });
    const heavy = makeCredential({ id: 'heavy', priority: 1, avgLatencyMs: 200, weight: 90 });
    expect(selectCredential([light, heavy], 'health_aware')?.id).toBe('heavy');
  });

  it('health_aware tetap mengutamakan prioritas di atas latensi', () => {
    const candidates = [
      makeCredential({ id: 'p2-fast', priority: 2, avgLatencyMs: 50 }),
      makeCredential({ id: 'p1-slow', priority: 1, avgLatencyMs: 9000 }),
    ];
    expect(selectCredential(candidates, 'health_aware')?.id).toBe('p1-slow');
  });
});

describe('classifyAiError', () => {
  it('mengenali kunci tidak valid sebagai retryable', () => {
    const result = classifyAiError(new Error('API_KEY_INVALID: key not valid'));
    expect(result.errorClass).toBe('invalid_key');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali 401 sebagai invalid_key', () => {
    expect(classifyAiError('request failed with 401').errorClass).toBe('invalid_key');
  });

  it('mengenali 429 sebagai rate_limit', () => {
    const result = classifyAiError(new Error('429 resource_exhausted'));
    expect(result.errorClass).toBe('rate_limit');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali quota_exhausted eksplisit', () => {
    expect(classifyAiError('QUOTA_EXHAUSTED for project').errorClass).toBe('quota_exhausted');
  });

  it('mengenali timeout sebagai retryable', () => {
    const result = classifyAiError(new Error('deadline exceeded before response'));
    expect(result.errorClass).toBe('timeout');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali "timed out" sebagai timeout', () => {
    expect(classifyAiError('The operation timed out.').errorClass).toBe('timeout');
  });

  it('mengenali gangguan provider sebagai retryable', () => {
    expect(classifyAiError('fetch failed').errorClass).toBe('provider_unavailable');
    expect(classifyAiError('service 503').errorClass).toBe('provider_unavailable');
  });

  it('menandai blokir safety sebagai non-retryable', () => {
    const result = classifyAiError(new Error('response blocked by safety filters'));
    expect(result.errorClass).toBe('safety_blocked');
    expect(result.isRetryable).toBe(false);
  });

  it('menggolongkan error tak dikenal sebagai application_error', () => {
    const result = classifyAiError(new Error('something entirely unexpected'));
    expect(result.errorClass).toBe('application_error');
    expect(result.isRetryable).toBe(true);
    expect(result.message).toBe('something entirely unexpected');
  });
});

function makePolicy(overrides?: Partial<AiRoutingPolicy>): AiRoutingPolicy {
  return {
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
    updatedAt: '2026-09-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveAiModelChain', () => {
  it('fallback null dengan model berbeda memakai provider primary', () => {
    expect(resolveAiModelChain(makePolicy())).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
  });

  it('fallback identik menghasilkan satu entri', () => {
    const policy = makePolicy({ fallbackProviderId: null, fallbackModel: 'gemini-3.8-flash' });
    expect(resolveAiModelChain(policy)).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
    ]);
  });

  it('fallback lintas provider dipertahankan', () => {
    const policy = makePolicy({ fallbackProviderId: 'backup', fallbackModel: 'gemini-2.5-flash' });
    expect(resolveAiModelChain(policy)).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'backup', modelName: 'gemini-2.5-flash' },
    ]);
  });

  it('modelOverride mengabaikan fallback', () => {
    expect(resolveAiModelChain(makePolicy(), 'gemini-3.1-flash-image')).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.1-flash-image' },
    ]);
  });
});

function makeBreakerStore(counts = new Map<string, number>()) {
  const calls: string[] = [];
  return {
    calls,
    store: {
      get: async (key: string) => {
        calls.push(`get:${key}`);
        return counts.get(key) ?? null;
      },
      incrby: async (key: string, delta: number) => {
        calls.push(`incrby:${key}:${delta}`);
        const next = (counts.get(key) ?? 0) + delta;
        counts.set(key, next);
        return next;
      },
      expire: async (key: string, seconds: number) => {
        calls.push(`expire:${key}:${seconds}`);
      },
    },
  };
}

describe('model circuit breaker', () => {
  it('trip setelah lima gagal infra dalam jendela', async () => {
    const { store } = makeBreakerStore();
    expect(await isModelBreakerTripped(store, 'gemini', 'gemini-3.8-flash')).toBe(false);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordModelInfraFailure(store, 'gemini', 'gemini-3.8-flash');
    }
    expect(await isModelBreakerTripped(store, 'gemini', 'gemini-3.8-flash')).toBe(true);
    expect(await isModelBreakerTripped(store, 'gemini', 'gemini-3.6-flash')).toBe(false);
  });

  it('sukses mendinginkan counter', async () => {
    const counts = new Map([[aiBreakerKey('gemini', 'gemini-3.8-flash'), 5]]);
    const { store, calls } = makeBreakerStore(counts);
    await recordModelSuccess(store, 'gemini', 'gemini-3.8-flash');
    expect(calls).toContain('expire:ai:breaker:gemini:gemini-3.8-flash:1');
  });

  it('fail-open tanpa store dan saat redis mati', async () => {
    expect(await isModelBreakerTripped(undefined, 'gemini', 'gemini-3.8-flash')).toBe(false);
    await recordModelInfraFailure(undefined, 'gemini', 'gemini-3.8-flash');
    await recordModelSuccess(undefined, 'gemini', 'gemini-3.8-flash');
    const failing = {
      get: async (_key: string): Promise<number | null> => { throw new Error('redis down'); },
      incrby: async (_key: string, _delta: number): Promise<number> => { throw new Error('redis down'); },
      expire: async (_key: string, _seconds: number): Promise<void> => { throw new Error('redis down'); },
    };
    expect(await isModelBreakerTripped(failing, 'gemini', 'gemini-3.8-flash')).toBe(false);
    await recordModelInfraFailure(failing, 'gemini', 'gemini-3.8-flash');
  });
});

describe('resolveTaskThinkingBudget', () => {
  it('caption dan seo memakai anggaran kecil', () => {
    expect(resolveTaskThinkingBudget('caption')?.thinkingBudget).toBe(AI_TASK_THINKING_BUDGET.caption);
    expect(resolveTaskThinkingBudget('seo')?.thinkingBudget).toBe(AI_TASK_THINKING_BUDGET.seo);
    expect(AI_TASK_THINKING_BUDGET.caption).toBeLessThan(AI_TASK_THINKING_BUDGET.polish);
    expect(AI_TASK_THINKING_BUDGET.seo).toBeLessThan(AI_TASK_THINKING_BUDGET.summarize);
  });

  it('polish dan ringkas memakai anggaran besar', () => {
    expect(resolveTaskThinkingBudget('polish')?.thinkingBudget).toBe(AI_TASK_THINKING_BUDGET.polish);
    expect(resolveTaskThinkingBudget('summarize')?.thinkingBudget).toBe(AI_TASK_THINKING_BUDGET.summarize);
  });

  it('override pengguna menang atas anggaran tugas', () => {
    const override = { thinkingBudget: 1234, includeThoughts: false };
    expect(resolveTaskThinkingBudget('caption', override)).toEqual(override);
  });

  it('tugas tak dikenal memakai default kanal', () => {
    expect(resolveTaskThinkingBudget('tak-dikenal', undefined, 'api')).toEqual({
      thinkingBudget: 32768,
      includeThoughts: true,
    });
    expect(resolveTaskThinkingBudget('tak-dikenal', undefined, 'web')?.thinkingBudget).toBe(-1);
  });
});

describe('shouldAlertBreakerTrip', () => {
  it('benar hanya saat increment menyeberangi ambang', () => {
    expect(shouldAlertBreakerTrip(4, 5)).toBe(true);
    expect(shouldAlertBreakerTrip(3, 5)).toBe(false);
    expect(shouldAlertBreakerTrip(5, 5)).toBe(false);
  });

  it('mendukung ambang kustom', () => {
    expect(shouldAlertBreakerTrip(1, 2)).toBe(true);
    expect(shouldAlertBreakerTrip(0, 2)).toBe(false);
  });
});

describe('resolveMaxRetries', () => {
  it('interaktif memakai batas kecil dan background memakai batas besar', () => {
    expect(INTERACTIVE_MAX_RETRIES).toBe(2);
    expect(BACKGROUND_MAX_RETRIES).toBe(5);
    expect(resolveMaxRetries('interactive')).toBe(2);
    expect(resolveMaxRetries('background')).toBe(5);
  });
});
