import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();
const scan = vi.fn();
const evalScript = vi.fn();
const pipelineExec = vi.fn();
const pipelineIncrby = vi.fn();
const pipelineExpire = vi.fn();

vi.mock('@/core/observability/logger', () => ({
  logEvent,
  logApiAccess: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    scan = scan;
    eval = evalScript;
    pipeline() {
      return { incrby: pipelineIncrby, expire: pipelineExpire, exec: pipelineExec };
    }
  },
}));

const state = vi.hoisted(() => ({
  transactionThrows: false,
  restoreThrows: false,
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    bootstrap: { environment: 'production' },
    config: {
      security: { cronSecret: 's3cr3t' },
      redis: { url: 'https://redis.test', token: 'token' },
    },
  }),
}));

vi.mock('@/data/client', () => ({
  getSharedRuntimeDatabase: () => ({
    db: {
      transaction: async (callback: (tx: unknown) => unknown) => {
        if (state.transactionThrows) throw new Error('db down');
        return callback({ execute: async () => [] });
      },
    },
  }),
}));

const { GET } = await import('@/app/api/internal/maintenance/view-flush/route');

const KEY = 'pv:production:org-1:site-1:rel-1';

function request() {
  return new Request('https://indicate.website/api/internal/maintenance/view-flush', {
    headers: { authorization: 'Bearer s3cr3t' },
  });
}

function events(name: string) {
  return logEvent.mock.calls
    .map((call) => call[1] as { event: string; requestId?: string; context?: Record<string, unknown> })
    .filter((fields) => fields.event === name);
}

describe('sinyal run view-flush', () => {
  beforeEach(() => {
    logEvent.mockReset();
    scan.mockReset();
    evalScript.mockReset();
    pipelineExec.mockReset();
    pipelineIncrby.mockReset();
    pipelineExpire.mockReset();
    state.transactionThrows = false;
    state.restoreThrows = false;
    pipelineExec.mockImplementation(async () => {
      if (state.restoreThrows) throw new Error('redis down');
    });
  });

  it('flush kosong memancarkan start dan completed bernol', async () => {
    scan.mockResolvedValue([0, []]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ keys: 0, applied: 0, truncated: false });
    expect(events('view-flush.run.started')).toHaveLength(1);
    expect(events('view-flush.run.completed')).toHaveLength(1);
    expect(events('view-flush.run.completed')[0]).toMatchObject({ context: { keys: 0, truncated: false, organizations: 0 } });
    expect(events('view-flush.run.started')[0]?.requestId).toBe(events('view-flush.run.completed')[0]?.requestId);
  });

  it('flush berisi memancarkan completed berisi hitungan', async () => {
    scan.mockResolvedValueOnce([0, [KEY]]).mockResolvedValue([0, []]);
    evalScript.mockResolvedValue([KEY, '5']);
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ keys: 1, truncated: false });
    expect(events('view-flush.run.completed')[0]).toMatchObject({ context: { keys: 1, truncated: false, organizations: 1 } });
  });

  it('cursor tak kunjung nol memancarkan truncated', async () => {
    scan.mockResolvedValue([1, []]);
    evalScript.mockResolvedValue([]);
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ truncated: true });
    expect(events('view-flush.scan.truncated')).toHaveLength(1);
    expect(events('view-flush.run.completed')[0]).toMatchObject({ context: { truncated: true } });
  });

  it('gagal commit memancarkan skipped dan restore lalu completed', async () => {
    state.transactionThrows = true;
    scan.mockResolvedValueOnce([0, [KEY]]).mockResolvedValue([0, []]);
    evalScript.mockResolvedValue([KEY, '5']);
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ skipped: 1 });
    expect(events('view-flush.org.skipped')).toHaveLength(1);
    expect(pipelineExec).toHaveBeenCalledTimes(1);
    expect(events('view-flush.run.completed')[0]).toMatchObject({ context: { skipped: 1 } });
  });

  it('gagal restore memancarkan restore-failed terstruktur', async () => {
    state.transactionThrows = true;
    state.restoreThrows = true;
    scan.mockResolvedValueOnce([0, [KEY]]).mockResolvedValue([0, []]);
    evalScript.mockResolvedValue([KEY, '5']);
    await GET(request());
    const failed = events('view-flush.org.restore-failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ context: { organizationId: 'org-1', rows: 1 } });
  });
});
