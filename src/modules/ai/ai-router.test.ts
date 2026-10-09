import { beforeEach, describe, expect, it } from 'vitest';

import { AI_BREAKER_ERROR_CLASSES, AI_BREAKER_WINDOW_SECONDS, AI_MAX_CHAIN_ENTRIES, AI_TASK_THINKING_BUDGET, BACKGROUND_MAX_RETRIES, INTERACTIVE_MAX_RETRIES, aiBreakerKey, classifyAiError, expandChainWithCascade, getActiveRoutingPolicy, getCascadeModels, getModelOwnerProvider, getRoundRobinCursor, isModelBreakerTripped, nextChainStartIndex, recordKeyFailure, recordKeySuccess, recordModelInfraFailure, recordModelSuccess, resetAiRotationState, resolveAiModelChain, resolveCascadeChain, resolveMaxRetries, resolveOrderedAiModelChain, resolveTaskThinkingBudget, selectCredential, shouldAlertBreakerTrip } from '@/modules/ai/ai-router';
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
    chainStrategy: 'fallback',
    costMode: 'throughput',
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

  it('modelOverride memakai provider pemilik katalog', () => {
    expect(resolveAiModelChain(makePolicy({ primaryProviderId: 'openrouter' }), 'gemini-3.8-flash-tts', 'gemini')).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash-tts' },
    ]);
  });

  it('primary null menghasilkan rantai kosong tanpa menebak provider', () => {
    expect(resolveAiModelChain(makePolicy({ primaryProviderId: null }))).toEqual([]);
  });
});

describe('getActiveRoutingPolicy', () => {
  it('null saat baris default belum ada atau db gagal', async () => {
    expect(await getActiveRoutingPolicy({ execute: async () => [] })).toBeNull();
    expect(await getActiveRoutingPolicy({ execute: async () => { throw new Error('down'); } })).toBeNull();
  });
});

describe('getModelOwnerProvider', () => {
  it('mengembalikan provider pemilik dari katalog', async () => {
    const db = { execute: async () => [{ provider_id: 'gemini' }] };
    expect(await getModelOwnerProvider(db, 'gemini-3.8-flash-tts')).toBe('gemini');
  });

  it('null saat katalog tidak mengenal model atau db gagal', async () => {
    expect(await getModelOwnerProvider({ execute: async () => [] }, 'openai/gpt-9-future')).toBeNull();
    expect(await getModelOwnerProvider({ execute: async () => { throw new Error('down'); } }, 'm')).toBeNull();
  });
});

describe('resolveOrderedAiModelChain', () => {
  it('fallback memakai urutan tetap apa pun startIndex', () => {
    const policy = makePolicy({ chainStrategy: 'fallback', fallbackProviderId: 'backup', fallbackModel: 'gemini-2.5-flash' });
    expect(resolveOrderedAiModelChain(policy, 1)).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'backup', modelName: 'gemini-2.5-flash' },
    ]);
  });

  it('round_robin memutar titik awal rantai', () => {
    const policy = makePolicy({ chainStrategy: 'round_robin', fallbackProviderId: 'backup', fallbackModel: 'gemini-2.5-flash' });
    expect(resolveOrderedAiModelChain(policy, 0).map((entry) => entry.modelName)).toEqual(['gemini-3.8-flash', 'gemini-2.5-flash']);
    expect(resolveOrderedAiModelChain(policy, 1).map((entry) => entry.modelName)).toEqual(['gemini-2.5-flash', 'gemini-3.8-flash']);
    expect(resolveOrderedAiModelChain(policy, 2).map((entry) => entry.modelName)).toEqual(['gemini-3.8-flash', 'gemini-2.5-flash']);
  });

  it('round_robin rantai tunggal tetap satu entri', () => {
    const policy = makePolicy({ chainStrategy: 'round_robin', fallbackProviderId: null, fallbackModel: 'gemini-3.8-flash' });
    expect(resolveOrderedAiModelChain(policy, 1)).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
    ]);
  });

  it('modelOverride menonaktifkan putaran', () => {
    const policy = makePolicy({ chainStrategy: 'round_robin' });
    expect(resolveOrderedAiModelChain(policy, 1, 'gemini-3.1-flash-image')).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.1-flash-image' },
    ]);
  });
});

describe('nextChainStartIndex', () => {
  it('memajukan cursor redis per request', async () => {
    const { store } = makeBreakerStore();
    expect(await nextChainStartIndex(store)).toBe(0);
    expect(await nextChainStartIndex(store)).toBe(1);
    expect(await nextChainStartIndex(store)).toBe(2);
  });

  it('fail-open ke 0 tanpa store atau saat redis gagal', async () => {
    expect(await nextChainStartIndex(undefined)).toBe(0);
    const failing = { get: async () => null, incrby: async () => { throw new Error('down'); }, expire: async () => {} };
    expect(await nextChainStartIndex(failing)).toBe(0);
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

  it('400 dan respons kosong beruntun ikut men-trip model', async () => {
    expect(AI_BREAKER_ERROR_CLASSES).toContain('application_error');
    expect(AI_BREAKER_ERROR_CLASSES).toContain('malformed_response');
    const { store } = makeBreakerStore();
    expect(await isModelBreakerTripped(store, 'openrouter', 'dots-studio/dots-3-note-preview:free')).toBe(false);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordModelInfraFailure(store, 'openrouter', 'dots-studio/dots-3-note-preview:free');
    }
    expect(await isModelBreakerTripped(store, 'openrouter', 'dots-studio/dots-3-note-preview:free')).toBe(true);
  });

  it('fail-open tanpa store dan saat redis mati', async () => {
    expect(await isModelBreakerTripped(undefined, 'gemini', 'gemini-3.8-flash')).toBe(false);
    await recordModelInfraFailure(undefined, 'gemini', 'gemini-3.8-flash');
    await recordModelSuccess(undefined, 'gemini', 'gemini-3.8-flash');
    const failing = {
      get: async (): Promise<number | null> => { throw new Error('redis down'); },
      incrby: async (): Promise<number> => { throw new Error('redis down'); },
      expire: async (): Promise<void> => { throw new Error('redis down'); },
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

describe('model cascade sekatalog', () => {
  const rows = [
    { model_name: 'gemini-3.8-flash', task_recommendation: 'default chat' },
    { model_name: 'gemini-3.8-flash-tts', task_recommendation: 'speech synthesis' },
    { model_name: 'gemini-3.6-flash', task_recommendation: 'general chat' },
    { model_name: 'gemini-embedding-2', task_recommendation: 'embeddings' },
    { model_name: 'google/gemini-3.5-flash-lite', task_recommendation: 'seo descriptions and taxonomy tags' },
  ];
  const db = { execute: async () => rows };

  it('melewati modalitas non-chat dan model terkonfigurasi', async () => {
    expect(await getCascadeModels(db, 'gemini', ['gemini-3.8-flash'], 4)).toEqual(['gemini-3.6-flash']);
  });

  it('fail-open tanpa kaskade saat db gagal', async () => {
    const broken = { execute: async () => { throw new Error('down'); } };
    expect(await getCascadeModels(broken, 'gemini', [], 4)).toEqual([]);
  });

  it('menempelkan tanpa duplikat sampai batas', () => {
    const expanded = expandChainWithCascade(
      [{ providerId: 'gemini', modelName: 'gemini-3.8-flash' }],
      new Map([['gemini', ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.7-flash']]]),
      2,
    );
    expect(expanded).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
    expect(AI_MAX_CHAIN_ENTRIES).toBe(4);
  });

  it('melewati kaskade untuk override modalitas', async () => {
    const chain = [{ providerId: 'gemini', modelName: 'gemini-3.8-flash-tts' }];
    await expect(resolveCascadeChain(db, chain, 'gemini-3.8-flash-tts')).resolves.toEqual(chain);
  });

  it('menurunkan model dalam pool key yang sama', async () => {
    const expanded = await resolveCascadeChain(
      db,
      [{ providerId: 'gemini', modelName: 'gemini-3.8-flash' }],
      undefined,
    );
    expect(expanded).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
  });

  it('kaskade tidak menyalip fallback terkonfigurasi', () => {
    const expanded = expandChainWithCascade(
      [
        { providerId: 'openrouter', modelName: 'nvidia/nemotron-3-super-120b-a12b:free' },
        { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      ],
      new Map([
        ['openrouter', ['dots-studio/dots-3-note-preview:free']],
        ['gemini', ['gemini-3.6-flash']],
      ]),
      4,
    );
    expect(expanded.map((entry) => entry.modelName)).toEqual([
      'nvidia/nemotron-3-super-120b-a12b:free',
      'gemini-3.8-flash',
      'dots-studio/dots-3-note-preview:free',
      'gemini-3.6-flash',
    ]);
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

function captureDb() {
  const queries: unknown[] = [];
  const db = {
    execute: async (query: unknown): Promise<unknown[]> => {
      queries.push(query);
      return [];
    },
  };
  return { db, queries };
}

function queryText(query: unknown): string {
  try {
    return JSON.stringify(query).toLowerCase();
  } catch {
    return '';
  }
}

describe('recordKeySuccess single-statement', () => {
  it('satu UPDATE aritmetik tanpa SELECT', async () => {
    const { db, queries } = captureDb();
    await recordKeySuccess(db, 'cred-1', 120);
    expect(queries).toHaveLength(1);
    const text = queryText(queries[0]);
    expect(text).toContain('update');
    expect(text).toContain('successful_requests + 1');
    expect(text).not.toContain('select');
  });

  it('tidak pernah melempar saat db gagal', async () => {
    const broken = { execute: async (): Promise<unknown[]> => { throw new Error('down'); } };
    await expect(recordKeySuccess(broken, 'cred-1', 50)).resolves.toBeUndefined();
  });
});

describe('recordKeyFailure single-statement', () => {
  it('satu UPDATE aritmetik tanpa SELECT', async () => {
    const { db, queries } = captureDb();
    await recordKeyFailure(db, 'cred-1', 'rate_limit', 'slow down', 60);
    expect(queries).toHaveLength(1);
    const text = queryText(queries[0]);
    expect(text).toContain('update');
    expect(text).toContain('failed_requests + 1');
    expect(text).not.toContain('select');
  });

  it('default cooldown 60 detik selaras policy', async () => {
    const { db, queries } = captureDb();
    const before = Date.now();
    await recordKeyFailure(db, 'cred-1', 'rate_limit', 'slow down');
    const text = queryText(queries[0]);
    const instants = [...text.matchAll(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}\.\d{3}z/g)].map((match) =>
      Date.parse(match[0]),
    );
    const diffs = instants.map((instant) => (instant - before) / 1000);
    expect(diffs.some((diff) => diff >= 55 && diff <= 65)).toBe(true);
  });

  it('cooldown eksplisit dihormati dan kelas non-cooling tanpa cooldown', async () => {
    const explicit = captureDb();
    const before = Date.now();
    await recordKeyFailure(explicit.db, 'cred-1', 'quota_exhausted', 'empty', 120);
    const explicitDiffs = [...queryText(explicit.queries[0]).matchAll(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}\.\d{3}z/g)].map(
      (match) => (Date.parse(match[0]) - before) / 1000,
    );
    expect(explicitDiffs.some((diff) => diff >= 115 && diff <= 125)).toBe(true);

    const plain = captureDb();
    const plainBefore = Date.now();
    await recordKeyFailure(plain.db, 'cred-1', 'application_error', 'boom', 60);
    const plainDiffs = [...queryText(plain.queries[0]).matchAll(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}\.\d{3}z/g)].map(
      (match) => (Date.parse(match[0]) - plainBefore) / 1000,
    );
    expect(plainDiffs.every((diff) => diff < 5)).toBe(true);
  });
});

describe('classifyAiError http-first', () => {
  it('pola http didahulukan untuk status', () => {
    expect(classifyAiError('request failed http 429: slow down').errorClass).toBe('rate_limit');
    expect(classifyAiError('fetch failed http 401 unauthorized').errorClass).toBe('invalid_key');
    expect(classifyAiError('fetch failed http 403 forbidden').errorClass).toBe('invalid_key');
    expect(classifyAiError('gateway http 500 exploded').errorClass).toBe('provider_unavailable');
    expect(classifyAiError('HTTP 503 Service Unavailable').errorClass).toBe('provider_unavailable');
  });

  it('kata timeout dikenali walau ada angka', () => {
    expect(classifyAiError('Connection timeout after 30000ms').errorClass).toBe('timeout');
  });

  it('marker retry_after diparsing', () => {
    const result = classifyAiError('rate_limited, retry_after:45, slow down');
    expect(result.errorClass).toBe('rate_limit');
    expect(result.retryAfterSec).toBe(45);
  });

  it('angka bebas tanpa konteks error bukan error provider', () => {
    expect(classifyAiError('Order 429 coffees confirmed, thank you').errorClass).toBe(
      'application_error',
    );
  });

  it('quota-specific menang atas sinyal generik', () => {
    expect(classifyAiError('QUOTA_EXHAUSTED with rate limit details').errorClass).toBe(
      'quota_exhausted',
    );
  });
});

describe('round_robin per-provider', () => {
  it('cursor terisolasi per provider', () => {
    resetAiRotationState();
    const first = [makeCredential({ id: 'a1', providerId: 'p1' }), makeCredential({ id: 'a2', providerId: 'p1' })];
    const second = [makeCredential({ id: 'b1', providerId: 'p2' }), makeCredential({ id: 'b2', providerId: 'p2' })];
    expect(selectCredential(first, 'round_robin')?.id).toBe('a1');
    expect(selectCredential(second, 'round_robin')?.id).toBe('b1');
    expect(selectCredential(first, 'round_robin')?.id).toBe('a2');
    expect(selectCredential(second, 'round_robin')?.id).toBe('b2');
    expect(getRoundRobinCursor('p1')).toBe(2);
    expect(getRoundRobinCursor('p2')).toBe(2);
    expect(getRoundRobinCursor('unknown-scope')).toBe(0);
  });
});

describe('model circuit breaker half-open', () => {
  function timestampStore() {
    const values = new Map<string, string>();
    return {
      store: {
        get: async (key: string): Promise<string | null> => values.get(key) ?? null,
        incrby: async (key: string, delta: number): Promise<number> => delta,
        expire: async (): Promise<void> => {},
        set: async (key: string, value: string): Promise<void> => {
          values.set(key, value);
        },
      },
    };
  }

  it('trip bertimestamp mengizinkan satu probe setelah jendela kedaluwarsa', async () => {
    const { store } = timestampStore();
    const tripAt = 1_000_000;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordModelInfraFailure(store, 'gemini', 'gemini-3.8-flash', tripAt);
    }
    expect(await isModelBreakerTripped(store, 'gemini', 'gemini-3.8-flash', tripAt)).toBe(true);
    expect(
      await isModelBreakerTripped(
        store,
        'gemini',
        'gemini-3.8-flash',
        tripAt + AI_BREAKER_WINDOW_SECONDS * 1000 + 1,
      ),
    ).toBe(false);
  });
});
