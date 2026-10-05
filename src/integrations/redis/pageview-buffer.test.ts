import { beforeEach, describe, expect, it, vi } from 'vitest';

const mget = vi.fn();
const recordOperation = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class {
    mget = mget;
  },
}));

vi.mock('@/core/observability/operation-metrics', () => ({
  recordOperation,
}));

const { readPageviewCounts } = await import('@/integrations/redis/pageview-buffer');

function input(keys: readonly string[]) {
  return { url: 'https://redis.test', token: 'token', keys };
}

function samples() {
  return recordOperation.mock.calls.map((call) => call[0] as Record<string, unknown>);
}

describe('semantik hit/miss pageview', () => {
  beforeEach(() => {
    mget.mockReset();
    recordOperation.mockReset();
  });

  it('kunci bernilai (termasuk nol) dihitung hit; null dihitung miss', async () => {
    mget.mockResolvedValue(['12', '0', null]);
    expect(await readPageviewCounts(input(['a', 'b', 'c']))).toEqual([12, 0, 0]);
    expect(samples()).toHaveLength(1);
    expect(samples()[0]).toMatchObject({ operation: 'redis.mget', cacheHit: 2, cacheMiss: 1 });
    expect(samples()[0]).not.toHaveProperty('status');
  });

  it('kegagalan Redis mencatat miss plus status 500, bukan hit', async () => {
    mget.mockRejectedValue(new Error('redis down'));
    expect(await readPageviewCounts(input(['a', 'b']))).toEqual([0, 0]);
    expect(samples()).toHaveLength(1);
    expect(samples()[0]).toMatchObject({ operation: 'redis.mget', cacheMiss: 2, status: 500 });
    expect(samples()[0]).not.toHaveProperty('cacheHit');
  });

  it('tidak ada kunci berarti tidak ada sampel', async () => {
    expect(await readPageviewCounts(input([]))).toEqual([]);
    expect(mget).not.toHaveBeenCalled();
    expect(samples()).toHaveLength(0);
  });
});
