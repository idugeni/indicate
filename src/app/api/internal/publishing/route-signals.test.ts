import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();

vi.mock('@/core/observability/logger', () => ({
  logEvent,
  logApiAccess: vi.fn(),
}));

const state = vi.hoisted(() => ({
  pending: false,
  due: 0,
  leased: 0,
  workThrows: false,
  summary: { claimed: 2, processed: 2, reconciled: 0, cleaned: 0, failed: 0 },
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    bootstrap: {},
    config: {
      security: { cronSecret: 's3cr3t' },
      publishing: { functionDeadlineSeconds: 60 },
    },
  }),
}));

vi.mock('@/modules/integrations', () => ({
  createPublicationWorkerComposition: () => ({
    queue: {
      hasPendingWork: async () => state.pending,
      peekDepth: async () => ({ due: state.due, leased: state.leased }),
    },
    worker: () => ({
      run: async () => {
        if (state.workThrows) throw new Error('worker down');
        return state.summary;
      },
      reconcile: async () => ({ claimed: 0, processed: 0, reconciled: 1, cleaned: 0, failed: 0 }),
    }),
  }),
}));

const { GET } = await import('@/app/api/internal/publishing/route');

function request() {
  return new Request('https://indicate.website/api/internal/publishing?mode=work', {
    headers: { authorization: 'Bearer s3cr3t' },
  });
}

function events(name: string) {
  return logEvent.mock.calls
    .map((call) => call[1] as { event: string; requestId?: string; context?: Record<string, unknown> })
    .filter((fields) => fields.event === name);
}

describe('sinyal run publishing', () => {
  beforeEach(() => {
    logEvent.mockReset();
    state.pending = false;
    state.due = 0;
    state.leased = 0;
    state.workThrows = false;
  });

  it('tick idle tidak memancarkan start/complete', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-06T10:03:00.000Z'));
      const response = await GET(request());
      expect(response.status).toBe(200);
      expect(events('publishing.run.started')).toHaveLength(0);
      expect(events('publishing.run.completed')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('run kerja memancarkan start berisi backlog dan complete berisi ringkasan', async () => {
    state.pending = true;
    state.due = 4;
    state.leased = 2;
    const response = await GET(request());
    expect(response.status).toBe(200);
    const started = events('publishing.run.started');
    const completed = events('publishing.run.completed');
    expect(started).toHaveLength(1);
    expect(completed).toHaveLength(1);
    expect(started[0]).toMatchObject({ context: { mode: 'work', pending: true, due: 4, leased: 2 } });
    expect(started[0]?.context?.runId).toBe(completed[0]?.context?.runId);
    expect(typeof started[0]?.context?.runId).toBe('string');
    expect(completed[0]?.context).toMatchObject({ mode: 'work', claimed: 2, processed: 2 });
  });

  it('kegagalan worker memancarkan failed dan tetap 503 tanpa melempar', async () => {
    state.pending = true;
    state.workThrows = true;
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(events('publishing.run.failed')).toHaveLength(1);
    expect(events('publishing.run.completed')).toHaveLength(0);
  });
});
