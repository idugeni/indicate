import { describe, expect, it } from 'vitest';

import { computeRetryDelayMs, executeAiQuery, normalizeCachePrompt, toToolsParam, type AiRequestLogEntry, type AiServiceDeps } from '@/modules/ai/ai-service';
import { aiRateLimitWindow, aiRpmKey } from '@/modules/ai/ai-rate-limit';
import type { AiDb } from '@/modules/ai/ai-types';

const POLICY_ROW = {
  id: 'default',
  rotation_strategy: 'health_aware',
  primary_provider_id: 'gemini',
  fallback_provider_id: 'backup',
  default_model: 'gemini-2.5-flash',
  fallback_model: 'gemini-2.5-flash',
  max_retries: 5,
  per_key_retry_limit: 2,
  cooldown_duration_sec: 60,
  request_timeout_ms: 60000,
  global_concurrency_limit: 100,
  updated_at: '2026-09-30T00:00:00.000Z',
};

function credentialRow(id: string, providerId: string): Record<string, unknown> {
  return {
    id,
    provider_id: providerId,
    organization_id: null,
    label: `Key ${id}`,
    key_encrypted: 'cipher',
    key_masked: 'abcd...wxyz',
    status: 'active',
    priority: 1,
    weight: 100,
    cooldown_until: null,
    last_used_at: null,
    last_success_at: null,
    last_failure_at: null,
    last_error_message: null,
    last_error_class: null,
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    rate_limit_count: 0,
    quota_exhausted_count: 0,
    avg_latency_ms: 0,
    created_at: '2026-09-30T00:00:00.000Z',
    updated_at: '2026-09-30T00:00:00.000Z',
  };
}

function sqlText(query: unknown): string {
  try {
    return JSON.stringify(query).toLowerCase();
  } catch {
    return '';
  }
}

interface FakeDb {
  readonly db: AiDb;
  readonly adapterCalls: { readonly providerId: string; readonly modelName: string }[];
  readonly logs: AiRequestLogEntry[];
}

function setup(credentialSelects: Record<string, unknown>[][], policyRow: Record<string, unknown> = POLICY_ROW, ownerProvider: string | null = null): FakeDb {
  const adapterCalls: { readonly providerId: string; readonly modelName: string }[] = [];
  const logs: AiRequestLogEntry[] = [];
  let credentialSelect = 0;
  const db: AiDb = {
    execute: async (query: unknown) => {
      const text = sqlText(query);
      if (text.includes('ai_routing_policies')) return [{ ...policyRow }];
      if (text.includes('decrypt_ai_key')) return [{ plain: 'plain-test-key' }];
      if (text.includes('provider_id') && text.includes('ai_models')) {
        return ownerProvider === null ? [] : [{ provider_id: ownerProvider }];
      }
      if (text.includes('key_encrypted')) {
        const rows = credentialSelects[Math.min(credentialSelect, credentialSelects.length - 1)] ?? [];
        credentialSelect += 1;
        return [...rows];
      }
      if (text.includes('avg_latency_ms') && text.includes('select')) {
        return [{ total_requests: 0, successful_requests: 0, avg_latency_ms: 10 }];
      }
      return [];
    },
  };
  return { db, adapterCalls, logs };
}

function depsFor(fake: FakeDb, extra?: Partial<AiServiceDeps>, failModels: readonly string[] = []): AiServiceDeps {
  const failing = new Set(failModels);
  return {
    db: fake.db,
    budget: {
      checkAiBudgetSafeguard: async () => ({ allowed: true, remainingBudget: 1000 }),
      recordAiTokenUsage: async () => {},
    },
    resolveAdapter: (providerId: string) => ({
      execute: async (_apiKey: string, modelName: string) => {
        fake.adapterCalls.push({ providerId, modelName });
        if (failing.has(modelName)) throw new Error('Gemini request failed (http 503: unavailable).');
        return { text: 'Jawaban redaksi yang cukup panjang.', tokensUsage: { prompt: 10, completion: 20, total: 30 }, toolCallsExecuted: [] };
      },
    }),
    log: async (entry: AiRequestLogEntry) => {
      fake.logs.push(entry);
    },
    clock: () => new Date('2026-09-30T00:00:00.000Z'),
    sleep: async () => {},
    ...extra,
  };
}

const PROMPT = {
  prompt: 'Tulis ringkasan berita hari ini untuk redaksi.',
  organizationId: 'org-9',
  channel: 'web' as const,
  callerRole: 'public' as const,
};

describe('executeAiQuery fallback terkonfigurasi', () => {
  it('memakai rantai fallback saat primary kehabisan kredensial', async () => {
    const fake = setup([[], [credentialRow('cred-fallback-1', 'backup')]]);
    const result = await executeAiQuery(depsFor(fake), PROMPT);
    expect(result.providerId).toBe('backup');
    expect(result.modelName).toBe('gemini-2.5-flash');
    expect(fake.adapterCalls).toEqual([{ providerId: 'backup', modelName: 'gemini-2.5-flash' }]);
  });

  it('meneruskan organizationId ke setiap log request', async () => {
    const fake = setup([[credentialRow('cred-primary-1', 'gemini')]]);
    const result = await executeAiQuery(depsFor(fake), PROMPT);
    expect(result.providerId).toBe('gemini');
    expect(fake.logs).toHaveLength(1);
    expect(fake.logs[0]?.organizationId).toBe('org-9');
    expect(fake.logs[0]?.status).toBe('success');
  });
});

describe('executeAiQuery fallback satu provider', () => {
describe('executeAiQuery strategi rantai', () => {
  function chainStore() {
    let cursor = 0;
    return {
      get: async () => null,
      incrby: async () => {
        cursor += 1;
        return cursor;
      },
      expire: async () => {},
    };
  }

  const ROUND_ROBIN_POLICY = {
    ...POLICY_ROW,
    chain_strategy: 'round_robin',
    primary_provider_id: 'gemini',
    fallback_provider_id: 'gemini',
    default_model: 'gemini-3.8-flash',
    fallback_model: 'gemini-3.6-flash',
  };

  it('fallback mencoba sesuai urutan saat primary gagal', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini')], [credentialRow('cred-1', 'gemini')]],
      { ...ROUND_ROBIN_POLICY, chain_strategy: 'fallback' },
    );
    const result = await executeAiQuery(depsFor(fake, undefined, ['gemini-3.8-flash']), PROMPT);
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(fake.adapterCalls.map((call) => call.modelName)).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash']);
  });

  it('round_robin memutar model awal tiap request untuk menyebar beban', async () => {
    const store = chainStore();
    const rows = [
      [credentialRow('cred-1', 'gemini')],
      [credentialRow('cred-1', 'gemini')],
      [credentialRow('cred-1', 'gemini')],
      [credentialRow('cred-1', 'gemini')],
    ];
    const fake = setup(rows, ROUND_ROBIN_POLICY);
    const deps = depsFor(fake, { rateLimit: { store } });
    const first = await executeAiQuery(deps, PROMPT);
    const second = await executeAiQuery(deps, PROMPT);
    expect(first.modelName).toBe('gemini-3.8-flash');
    expect(second.modelName).toBe('gemini-3.6-flash');
  });

  it('round_robin rantai tunggal tetap satu model', async () => {
    const store = chainStore();
    const singlePolicy = { ...ROUND_ROBIN_POLICY, fallback_model: 'gemini-3.8-flash' };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], singlePolicy);
    const result = await executeAiQuery(depsFor(fake, { rateLimit: { store } }), PROMPT);
    expect(result.modelName).toBe('gemini-3.8-flash');
    expect(fake.adapterCalls).toHaveLength(1);
  });

  it('modelOverride berjalan di provider pemilik katalog bukan primary', async () => {
    const openrouterPolicy = { ...POLICY_ROW, primary_provider_id: 'openrouter', default_model: 'openai/gpt-4o-mini' };
    const fake = setup([[credentialRow('cred-gemini-1', 'gemini')]], openrouterPolicy, 'gemini');
    const result = await executeAiQuery(
      depsFor(fake),
      { ...PROMPT, modelOverride: 'gemini-3.8-flash-tts' },
    );
    expect(result.providerId).toBe('gemini');
    expect(result.modelName).toBe('gemini-3.8-flash-tts');
    expect(fake.adapterCalls).toEqual([{ providerId: 'gemini', modelName: 'gemini-3.8-flash-tts' }]);
  });
});
  const SAME_PROVIDER_POLICY = {
    ...POLICY_ROW,
    primary_provider_id: 'gemini',
    fallback_provider_id: null,
    default_model: 'gemini-3.8-flash',
    fallback_model: 'gemini-3.6-flash',
  };

  it('mencoba fallback_model saat primary 503 di semua key', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini')], [credentialRow('cred-1', 'gemini')]],
      SAME_PROVIDER_POLICY,
    );
    const result = await executeAiQuery(depsFor(fake, undefined, ['gemini-3.8-flash']), PROMPT);
    expect(result.providerId).toBe('gemini');
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(result.error).toBeUndefined();
    expect(fake.adapterCalls).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
  });

  it('tidak mengulang model yang sama saat fallback identik', async () => {
    const samePolicy = { ...SAME_PROVIDER_POLICY, fallback_model: 'gemini-3.8-flash' };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], samePolicy);
    const result = await executeAiQuery(depsFor(fake), PROMPT);
    expect(result.providerId).toBe('gemini');
    expect(fake.adapterCalls).toHaveLength(1);
  });

  it('modelOverride tidak memakai fallback teks', async () => {
    const fake = setup([[credentialRow('cred-1', 'gemini')]], SAME_PROVIDER_POLICY);
    const result = await executeAiQuery(
      depsFor(fake, undefined, ['gemini-3.1-flash-image']),
      { ...PROMPT, modelOverride: 'gemini-3.1-flash-image' },
    );
    expect(result.error).toBe('ALL_RETRIES_EXHAUSTED');
    expect(fake.adapterCalls).toEqual([{ providerId: 'gemini', modelName: 'gemini-3.1-flash-image' }]);
  });

  it('mundur antar ronde dengan backoff lalu kehabisan upaya', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini'), credentialRow('cred-2', 'gemini')], [credentialRow('cred-2', 'gemini')]],
      SAME_PROVIDER_POLICY,
    );
    const delays: number[] = [];
    const result = await executeAiQuery(
      depsFor(fake, { sleep: async (ms: number) => { delays.push(ms); } }, ['gemini-3.8-flash', 'gemini-3.6-flash']),
      PROMPT,
    );
    expect(result.error).toBe('ALL_RETRIES_EXHAUSTED');
    expect(fake.adapterCalls).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
    ]);
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBeGreaterThanOrEqual(500);
    expect(delays[0]).toBeLessThanOrEqual(1000);
  });

  it('perKeyRetryLimit 1 memblokir pemakaian ulang key di fallback', async () => {
    const strictPolicy = { ...SAME_PROVIDER_POLICY, per_key_retry_limit: 1 };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], strictPolicy);
    const result = await executeAiQuery(depsFor(fake, undefined, ['gemini-3.8-flash']), PROMPT);
    expect(result.error).toBe('ALL_RETRIES_EXHAUSTED');
    expect(fake.adapterCalls).toEqual([{ providerId: 'gemini', modelName: 'gemini-3.8-flash' }]);
  });

  it('timeout adapter tercatat sebagai kegagalan retryable', async () => {
    const impatientPolicy = { ...SAME_PROVIDER_POLICY, fallback_model: 'gemini-3.8-flash', request_timeout_ms: 1000 };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], impatientPolicy);
    const result = await executeAiQuery(
      depsFor(fake, {
        resolveAdapter: () => ({
          execute: () => new Promise<never>(() => {}),
        }),
      }),
      PROMPT,
    );
    expect(result.error).toBe('ALL_RETRIES_EXHAUSTED');
    expect(fake.logs).toHaveLength(1);
    expect(fake.logs[0]?.errorClass).toBe('timeout');
    expect(fake.logs[0]?.status).toBe('failed');
  });

  it('breaker yang trip melewati model utama langsung ke fallback', async () => {
    const fake = setup([[credentialRow('cred-1', 'gemini')]], SAME_PROVIDER_POLICY);
    const calls: string[] = [];
    const store = {
      get: async (key: string) => {
        calls.push(`get:${key}`);
        return key.endsWith('gemini-3.8-flash') ? 5 : null;
      },
      incrby: async (key: string, delta: number) => {
        calls.push(`incrby:${key}:${delta}`);
        return delta;
      },
      expire: async (key: string, seconds: number) => {
        calls.push(`expire:${key}:${seconds}`);
      },
    };
    const result = await executeAiQuery(depsFor(fake, { rateLimit: { store } }), PROMPT);
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(fake.adapterCalls).toEqual([{ providerId: 'gemini', modelName: 'gemini-3.6-flash' }]);
    expect(calls).toContain('expire:ai:breaker:gemini:gemini-3.6-flash:1');
  });

  it('kegagalan infra menaikkan counter breaker model', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini')], [credentialRow('cred-1', 'gemini')]],
      SAME_PROVIDER_POLICY,
    );
    const bumped: string[] = [];
    const store = {
      get: async () => null,
      incrby: async (key: string, delta: number) => {
        bumped.push(`${key}:${delta}`);
        return delta;
      },
      expire: async () => {},
    };
    await executeAiQuery(depsFor(fake, { rateLimit: { store } }, ['gemini-3.8-flash']), PROMPT);
    expect(bumped).toContain('ai:breaker:gemini:gemini-3.8-flash:1');
  });
});

describe('executeAiQuery enforcement rpm/tpm', () => {
  const fixedNow = new Date('2026-09-30T00:01:30.000Z');

  function limitStore(counts: Map<string, number>, fail = false) {
    const incrCalls: string[] = [];
    return {
      incrCalls,
      store: {
        get: async (key: string) => {
          if (fail) throw new Error('redis down');
          return counts.get(key) ?? null;
        },
        incrby: async (key: string, delta: number) => {
          if (fail) throw new Error('redis down');
          incrCalls.push(key);
          const next = (counts.get(key) ?? 0) + delta;
          counts.set(key, next);
          return next;
        },
        expire: async () => {
          if (fail) throw new Error('redis down');
        },
      },
    };
  }

  it('batas terlampaui mengembalikan pesan sibuk tanpa memanggil provider', async () => {
    const window = aiRateLimitWindow(fixedNow);
    const counts = new Map([[aiRpmKey('gemini-2.5-flash', window), 15]]);
    const { store, incrCalls } = limitStore(counts);
    const fake = setup([[credentialRow('cred-primary-1', 'gemini')]]);
    const result = await executeAiQuery(
      depsFor(fake, {
        clock: () => fixedNow,
        rateLimit: { store, getLimits: async () => ({ rpmLimit: 15, tpmLimit: null }) },
      }),
      PROMPT,
    );
    expect(result.providerId).toBe('rate-limit-guardrail');
    expect(fake.adapterCalls).toHaveLength(0);
    expect(incrCalls).toHaveLength(0);
    expect(fake.logs).toHaveLength(1);
    expect(fake.logs[0]?.status).toBe('blocked');
    expect(fake.logs[0]?.organizationId).toBe('org-9');
  });

  it('redis mati berarti lolos (fail-open)', async () => {
    const { store } = limitStore(new Map(), true);
    const fake = setup([[credentialRow('cred-primary-1', 'gemini')]]);
    const result = await executeAiQuery(
      depsFor(fake, {
        clock: () => fixedNow,
        rateLimit: { store, getLimits: async () => ({ rpmLimit: 1, tpmLimit: 1 }) },
      }),
      PROMPT,
    );
    expect(result.providerId).toBe('gemini');
    expect(fake.adapterCalls).toHaveLength(1);
  });
});

describe('normalizeCachePrompt', () => {
  it('trim, gabung whitespace, dan lowercase', () => {
    expect(normalizeCachePrompt('  Tulis   RINGKASAN\nberita\tHARI ini  ')).toBe('tulis ringkasan berita hari ini');
  });

  it('murni dan stabil untuk varian spasi sama', () => {
    expect(normalizeCachePrompt('Berita  Hari Ini')).toBe(normalizeCachePrompt('  berita hari ini\n'));
  });
});

describe('executeAiQuery mode retry', () => {
  const LIMITED_POLICY = {
    ...POLICY_ROW,
    primary_provider_id: 'gemini',
    fallback_provider_id: null,
    default_model: 'gemini-3.8-flash',
    fallback_model: 'gemini-3.6-flash',
    max_retries: 1,
    per_key_retry_limit: 1,
  };

  it('interactive default fail-fast ke fallback setelah satu percobaan', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini'), credentialRow('cred-2', 'gemini')], [credentialRow('cred-2', 'gemini')]],
      LIMITED_POLICY,
    );
    const result = await executeAiQuery(depsFor(fake, undefined, ['gemini-3.8-flash']), PROMPT);
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(fake.adapterCalls).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
  });

  it('background tetap failover cepat ke fallback', async () => {
    const fake = setup(
      [[credentialRow('cred-1', 'gemini'), credentialRow('cred-2', 'gemini')], [credentialRow('cred-2', 'gemini')]],
      LIMITED_POLICY,
    );
    const result = await executeAiQuery(depsFor(fake, undefined, ['gemini-3.8-flash']), { ...PROMPT, mode: 'background' });
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(fake.adapterCalls).toEqual([
      { providerId: 'gemini', modelName: 'gemini-3.8-flash' },
      { providerId: 'gemini', modelName: 'gemini-3.6-flash' },
    ]);
  });
});

describe('executeAiQuery cache dan redactor', () => {
  it('lookup cache memakai prompt ternormalisasi', async () => {
    const fake = setup([[credentialRow('cred-1', 'gemini')]]);
    const seen: string[] = [];
    const stored: string[] = [];
    const result = await executeAiQuery(
      depsFor(fake, {
        cache: {
          lookup: async (prompt: string) => {
            seen.push(prompt);
            return null;
          },
          store: async (prompt: string) => {
            stored.push(prompt);
          },
        },
      }),
      { ...PROMPT, prompt: '  Tulis   RINGKASAN berita hari ini  ' },
    );
    expect(result.providerId).toBe('gemini');
    expect(seen).toEqual(['tulis ringkasan berita hari ini']);
    expect(stored).toEqual(['tulis ringkasan berita hari ini']);
  });

  it('menyajikan hit cache model fallback tanpa memanggil provider', async () => {
    const fallbackPolicy = {
      ...POLICY_ROW,
      primary_provider_id: 'gemini',
      fallback_provider_id: 'backup',
      default_model: 'gemini-3.8-flash',
      fallback_model: 'gemini-3.6-flash',
    };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], fallbackPolicy);
    const queried: string[] = [];
    const result = await executeAiQuery(
      depsFor(fake, {
        cache: {
          lookup: async (_prompt: string, modelName: string) => {
            queried.push(modelName);
            return modelName === 'gemini-3.6-flash'
              ? { responseText: 'Jawaban cache fallback yang cukup panjang.', modelName }
              : null;
          },
          store: async () => {},
        },
      }),
      PROMPT,
    );
    expect(result.providerId).toBe('semantic-cache');
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(queried).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash']);
    expect(fake.adapterCalls).toEqual([]);
  });

  it('redactor opsional membersihkan prompt sebelum kirim', async () => {
    const fake = setup([[credentialRow('cred-1', 'gemini')]]);
    const sent: string[] = [];
    const result = await executeAiQuery(
      depsFor(fake, {
        resolveAdapter: () => ({
          execute: async (_apiKey: string, _model: string, prompt: { readonly prompt: string }) => {
            sent.push(prompt.prompt);
            return { text: 'Jawaban redaksi yang cukup panjang.', tokensUsage: { prompt: 10, completion: 20, total: 30 }, toolCallsExecuted: [] as string[] };
          },
        }),
      }),
      { ...PROMPT, prompt: 'Hubungi 08123456789 segera.', redactor: (text: string) => text.replace(/08\d+/, '[redacted]') },
    );
    expect(result.providerId).toBe('gemini');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('[redacted]');
    expect(sent[0]).not.toContain('08123456789');
  });
});

describe('computeRetryDelayMs', () => {
  it('tumbuh eksponensial dengan random nol', () => {    expect(computeRetryDelayMs(1, () => 0)).toBe(500);
    expect(computeRetryDelayMs(2, () => 0)).toBe(1000);
    expect(computeRetryDelayMs(3, () => 0)).toBe(2000);
  });

  it('terbatas pada cap plus jitter satu base', () => {
    expect(computeRetryDelayMs(10, () => 0)).toBe(3000);
    expect(computeRetryDelayMs(10, () => 0.999)).toBeLessThanOrEqual(3500);
  });
});

describe('toToolsParam', () => {
  it('undefined dan array kosong menjadi null', () => {
    expect(toToolsParam(undefined)).toBeNull();
    expect(toToolsParam([])).toBeNull();
  });

  it('menyalin array terisi', () => {
    const source = ['cari_berita'];
    const result = toToolsParam(source);
    expect(result).toEqual(['cari_berita']);
    expect(result).not.toBe(source);
  });
});

describe('executeAiQuery teks kosong', () => {
  const SAME_PROVIDER_POLICY = {
    ...POLICY_ROW,
    primary_provider_id: 'gemini',
    fallback_provider_id: null,
    default_model: 'gemini-3.8-flash',
    fallback_model: 'gemini-3.6-flash',
  };

  it('teks kosong tanpa media dicoba ulang ke model berikut', async () => {
    const fake = setup([[credentialRow('cred-1', 'gemini')]], SAME_PROVIDER_POLICY);
    const calls: string[] = [];
    const result = await executeAiQuery(
      depsFor(fake, {
        resolveAdapter: () => ({
          execute: async (_apiKey: string, name: string) => {
            calls.push(name);
            if (name === 'gemini-3.8-flash') return { text: '', toolCallsExecuted: [] as string[] };
            return { text: 'Jawaban redaksi yang cukup panjang.', tokensUsage: { prompt: 10, completion: 20, total: 30 }, toolCallsExecuted: [] as string[] };
          },
        }),
      }),
      PROMPT,
    );
    expect(result.error).toBeUndefined();
    expect(result.modelName).toBe('gemini-3.6-flash');
    expect(calls).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash']);
    expect(fake.logs.some((entry) => entry.status === 'failed' && entry.errorClass === 'malformed_response')).toBe(true);
  });

  it('semua kosong berarti kehabisan retry', async () => {
    const samePolicy = { ...SAME_PROVIDER_POLICY, fallback_model: 'gemini-3.8-flash' };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], samePolicy);
    const calls: string[] = [];
    const result = await executeAiQuery(
      depsFor(fake, {
        resolveAdapter: () => ({
          execute: async (_apiKey: string, name: string) => {
            calls.push(name);
            return { text: '', toolCallsExecuted: [] as string[] };
          },
        }),
      }),
      PROMPT,
    );
    expect(result.error).toBe('ALL_RETRIES_EXHAUSTED');
    expect(calls).toEqual(['gemini-3.8-flash']);
    expect(fake.logs.some((entry) => entry.status === 'failed' && entry.errorClass === 'malformed_response')).toBe(true);
  });

  it('teks kosong berlampiran media tetap sukses', async () => {
    const samePolicy = { ...SAME_PROVIDER_POLICY, fallback_model: 'gemini-3.8-flash' };
    const fake = setup([[credentialRow('cred-1', 'gemini')]], samePolicy);
    const result = await executeAiQuery(
      depsFor(fake, {
        resolveAdapter: () => ({
          execute: async () => ({
            text: '',
            toolCallsExecuted: [] as string[],
            inlineData: [{ mimeType: 'image/png', base64: 'AAA' }],
          }),
        }),
      }),
      PROMPT,
    );
    expect(result.error).toBeUndefined();
    expect(result.inlineData).toHaveLength(1);
  });
});
