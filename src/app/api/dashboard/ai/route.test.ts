import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));

vi.mock('@/core/observability/api-access', () => ({
  withApiAccess: (operation: string, handler: unknown) => handler,
}));

const ORG = '11111111-1111-4111-8111-111111111111';

const budgetState = { allowed: true };

vi.mock('@/modules/ai/ai-security', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createAiBudgetGuard: () => ({
      checkAiBudgetSafeguard: async () => ({
        allowed: budgetState.allowed,
        remainingBudget: budgetState.allowed ? 1000 : 0,
      }),
      recordAiTokenUsage: async () => {},
    }),
  };
});

type StoreCounts = Map<string, number | string>;

const storeState: { readonly counts: StoreCounts; fillReads: boolean } = {
  counts: new Map<string, number | string>(),
  fillReads: false,
};

vi.mock('@/modules/ai/ai-rate-limit', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createAiModelRateLimitStore: () => ({
      namespace: 'test',
      get: async (key: string) => (storeState.fillReads ? 99 : (storeState.counts.get(key) ?? null)),
      incrby: async (key: string, delta: number) => {
        const next = Number(storeState.counts.get(key) ?? 0) + delta;
        storeState.counts.set(key, next);
        return next;
      },
      expire: async () => {},
      set: async (key: string, value: string) => {
        storeState.counts.set(key, value);
      },
    }),
  };
});

interface FakeDbState {
  quotaRow: Record<string, unknown> | null;
  cacheRows: Record<string, unknown>[];
  inserts: unknown[][];
}

const dbState: FakeDbState = { quotaRow: null, cacheRows: [], inserts: [] };

function sqlText(query: unknown): string {
  const chunks = (query as { readonly queryChunks?: readonly unknown[] }).queryChunks ?? [];
  const out: string[] = [];
  const visit = (items: readonly unknown[]): void => {
    for (const chunk of items) {
      if (typeof chunk === 'string') {
        out.push(chunk);
        continue;
      }
      if (typeof chunk !== 'object' || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      const name = (chunk.constructor as { readonly name?: unknown } | undefined)?.name;
      if (name === 'StringChunk' && Array.isArray(record.value)) {
        out.push((record.value as readonly unknown[]).map((part) => String(part)).join(''));
      }
    }
  };
  visit(chunks);
  return out.join(' ').toLowerCase();
}

function sqlParams(query: unknown): unknown[] {
  const chunks = (query as { readonly queryChunks?: readonly unknown[] }).queryChunks ?? [];
  const out: unknown[] = [];
  const visit = (items: readonly unknown[]): void => {
    for (const chunk of items) {
      if (typeof chunk === 'string' || typeof chunk === 'number' || typeof chunk === 'boolean') {
        out.push(chunk);
        continue;
      }
      if (typeof chunk !== 'object' || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      const name = (chunk.constructor as { readonly name?: unknown } | undefined)?.name;
      if (name === 'Param' && 'value' in record) out.push(record.value);
    }
  };
  visit(chunks);
  return out;
}

const POLICY_ROW = {
  id: 'default',
  rotation_strategy: 'health_aware',
  chain_strategy: 'fallback',
  cost_mode: 'throughput',
  primary_provider_id: 'gemini',
  fallback_provider_id: null,
  default_model: 'gemini-2.5-flash',
  fallback_model: 'gemini-2.5-flash',
  max_retries: 5,
  per_key_retry_limit: 2,
  cooldown_duration_sec: 60,
  request_timeout_ms: 60000,
  global_concurrency_limit: 100,
  updated_at: '2026-10-05T00:00:00.000Z',
};

vi.mock('@/data/client', () => ({
  getSharedRuntimeDatabase: () => ({
    db: {
      execute: async (query: unknown): Promise<unknown> => {
        const text = sqlText(query);
        if (text.includes('insert into ai_request_logs')) {
          dbState.inserts.push(sqlParams(query));
          return [];
        }
        if (text.includes('update ai_semantic_cache')) return [];
        if (text.includes('from ai_semantic_cache')) return [...dbState.cacheRows];
        if (text.includes('from ai_routing_policies')) return [{ ...POLICY_ROW }];
        if (text.includes('from ai_models')) return [];
        if (text.includes('from organizations')) return dbState.quotaRow === null ? [] : [{ ...dbState.quotaRow }];
        return [];
      },
    },
  }),
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    bootstrap: {},
    config: {
      redis: { url: 'http://localhost:1', token: 't', namespace: 'test' },
      cloudflare: {
        accountId: '',
        aiGatewaySlug: null,
        aiGatewayCacheTtlSeconds: null,
        aiEmbeddingModel: null,
        apiToken: '',
      },
    },
  }),
}));

vi.mock('@/modules/ai/operator-planner', () => ({
  planOperatorActions: async () => ({
    ok: true,
    plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] },
    executionEnabled: false,
  }),
}));

vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: async () => ({ id: 'user-1' }),
  authorizeDashboardOrganization: async () => ({
    actorId: 'user-1',
    organizationId: ORG,
    actorType: 'user',
    permissionSet: new Set<string>(),
    entryPoint: 'dashboard',
    requestId: 'req-test',
  }),
}));

import { POST, asStreamCapableAdapter } from '@/app/api/dashboard/ai/route';

function streamRequest(): Request {
  return new Request('http://localhost/api/dashboard/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: JSON.stringify({
      organizationId: ORG,
      action: 'draft-article-stream',
      payload: { topic: 'Panen raya tiba di desa', points: 'Hujan merata sepanjang pekan' },
    }),
  });
}

describe('asStreamCapableAdapter', () => {
  it('returns the adapter view when executeStream exists', () => {
    const adapter = {
      execute: async () => ({ text: '', toolCallsExecuted: [] }),
      executeStream: async () => ({ text: '', toolCallsExecuted: [] }),
    };
    expect(asStreamCapableAdapter(adapter)).not.toBeNull();
  });

  it('returns null for single-shot adapters without network', () => {
    expect(asStreamCapableAdapter({ execute: async () => ({ text: '' }) })).toBeNull();
    expect(asStreamCapableAdapter({ execute: 'bukan-fungsi' })).toBeNull();
  });
});

describe('POST draft-article-stream pre-flight parity', () => {
  beforeEach(() => {
    budgetState.allowed = true;
    storeState.fillReads = false;
    storeState.counts.clear();
    dbState.quotaRow = null;
    dbState.cacheRows = [];
    dbState.inserts = [];
    vi.restoreAllMocks();
  });

  it('memblokir stream saat kuota org habis dan mencatat baris blocked', async () => {
    dbState.quotaRow = { daily_request_limit: 1, daily_token_limit: null };
    storeState.fillReads = true;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const response = await POST(streamRequest());
      expect(response.status).toBe(503);
      const body = (await response.json()) as { readonly error?: { readonly code?: string } };
      expect(body.error?.code).toBe('DEPENDENCY_UNAVAILABLE');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(dbState.inserts).toHaveLength(1);
      const params = dbState.inserts[0]?.map((param) => String(param)) ?? [];
      expect(params).toContain('org-quota-guardrail');
      expect(params).toContain('blocked');
      expect(params).toContain(ORG);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('memblokir stream saat budget global habis dan mencatat baris blocked', async () => {
    budgetState.allowed = false;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const response = await POST(streamRequest());
      expect(response.status).toBe(503);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(dbState.inserts).toHaveLength(1);
      const params = dbState.inserts[0]?.map((param) => String(param)) ?? [];
      expect(params).toContain('budget-guardrail');
      expect(params).toContain('blocked');
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('menyajikan cache-hit tanpa provider dan mencatat baris sukses', async () => {
    dbState.quotaRow = { daily_request_limit: 100, daily_token_limit: null };
    dbState.cacheRows = [
      { id: 'cache-1', response_text: '{"title":"Tembolok"}', model_name: 'gemini-2.5-flash' },
    ];
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const response = await POST(streamRequest());
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(fetchSpy).not.toHaveBeenCalled();
      const text = await response.text();
      expect(text).toContain('event: done');
      expect(dbState.inserts).toHaveLength(1);
      const params = dbState.inserts[0]?.map((param) => String(param)) ?? [];
      expect(params).toContain('semantic-cache');
      expect(params).toContain('success');
      expect(params).toContain(ORG);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});


describe('POST operator-plan', () => {
  it('returns a validated read-only plan without executing it', async () => {
    const response = await POST(new Request('http://localhost/api/dashboard/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: JSON.stringify({ organizationId: ORG, action: 'operator-plan', payload: { request: 'Ringkas kondisi dashboard' } }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      executionEnabled: false,
      plan: { steps: [{ capabilityId: 'command-center.overview.read' }] },
    });
  });
});
