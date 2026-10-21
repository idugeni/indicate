import { describe, expect, it, vi } from 'vitest';

import {
  reconcileRuntimeConfigInvalidationIntents,
  type RuntimeConfigInvalidationRepository,
} from '@/modules/persisted-config/invalidation-reconciler';

const now = new Date('2026-10-21T04:30:00.000Z');

function claim(intentId: string, runtimeRevision: number) {
  return { intentId, runtimeRevision, claimToken: `claim-${intentId}` };
}

function repository(
  claims: ReturnType<typeof claim>[],
  overrides: Partial<RuntimeConfigInvalidationRepository> = {},
): RuntimeConfigInvalidationRepository {
  return {
    claimDue: vi.fn(async () => claims),
    complete: vi.fn(async () => undefined),
    fail: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('reconcileRuntimeConfigInvalidationIntents', () => {
  it('invalidates and completes claimed intents with their fencing tokens', async () => {
    const queue = repository([claim('older', 13), claim('current', 19)]);
    const invalidate = vi.fn();
    const result = await reconcileRuntimeConfigInvalidationIntents({
      repository: queue,
      invalidate,
      now,
    });

    expect(result).toEqual({ claimed: 2, completed: 2, failed: 0, stranded: 0 });
    expect(queue.claimDue).toHaveBeenCalledWith(20, new Date(now.getTime() + 120_000));
    expect(invalidate.mock.calls).toEqual([[13], [19]]);
    expect(queue.complete).toHaveBeenCalledTimes(2);
    expect(queue.fail).not.toHaveBeenCalled();
  });

  it('reschedules an intent when local invalidation fails', async () => {
    const queue = repository([claim('broken', 20)]);
    const invalidate = vi.fn(() => { throw new Error('snapshot read failed'); });
    const result = await reconcileRuntimeConfigInvalidationIntents({
      repository: queue,
      invalidate,
      now,
    });

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1, stranded: 0 });
    expect(queue.complete).not.toHaveBeenCalled();
    expect(queue.fail).toHaveBeenCalledWith(
      'broken',
      'claim-broken',
      'runtime_config_invalidation_failed',
      new Date(now.getTime() + 60_000),
    );
  });

  it('reports a stranded claim when the fenced retry write also fails', async () => {
    const queue = repository([claim('stranded', 20)], {
      fail: vi.fn(async () => { throw new Error('claim expired'); }),
    });
    const result = await reconcileRuntimeConfigInvalidationIntents({
      repository: queue,
      invalidate: () => { throw new Error('cache unavailable'); },
      now,
    });

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1, stranded: 1 });
  });

  it('rejects unbounded or malformed batch settings before claiming', async () => {
    const queue = repository([]);
    await expect(reconcileRuntimeConfigInvalidationIntents({
      repository: queue,
      invalidate: () => undefined,
      now,
      batchSize: 101,
    })).rejects.toThrow('runtime_config_invalidation_batch_size_out_of_range');
    expect(queue.claimDue).not.toHaveBeenCalled();
  });
});
