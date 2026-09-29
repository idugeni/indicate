import { describe, expect, it } from 'vitest';

import { executeAiQuery, type AiRequestLogEntry, type AiServiceDeps } from '@/modules/ai/ai-service';
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

function setup(credentialSelects: Record<string, unknown>[][]): FakeDb {
  const adapterCalls: { readonly providerId: string; readonly modelName: string }[] = [];
  const logs: AiRequestLogEntry[] = [];
  let credentialSelect = 0;
  const db: AiDb = {
    execute: async (query: unknown) => {
      const text = sqlText(query);
      if (text.includes('ai_routing_policies')) return [{ ...POLICY_ROW }];
      if (text.includes('decrypt_ai_key')) return [{ plain: 'plain-test-key' }];
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

function depsFor(fake: FakeDb, extra?: Partial<AiServiceDeps>): AiServiceDeps {
  return {
    db: fake.db,
    budget: {
      checkAiBudgetSafeguard: async () => ({ allowed: true, remainingBudget: 1000 }),
      recordAiTokenUsage: async () => {},
    },
    resolveAdapter: (providerId: string) => ({
      execute: async (_apiKey: string, modelName: string) => {
        fake.adapterCalls.push({ providerId, modelName });
        return { text: 'Jawaban redaksi yang cukup panjang.', tokensUsage: { prompt: 10, completion: 20, total: 30 }, toolCallsExecuted: [] };
      },
    }),
    log: async (entry: AiRequestLogEntry) => {
      fake.logs.push(entry);
    },
    clock: () => new Date('2026-09-30T00:00:00.000Z'),
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
