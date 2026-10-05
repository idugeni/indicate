import { beforeEach, describe, expect, it, vi } from 'vitest';

const zcard = vi.fn();
const zrem = vi.fn();
const zadd = vi.fn();
const evalScript = vi.fn();
const set = vi.fn();
const ping = vi.fn();
const recordOperation = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class {
    zcard = zcard;
    zrem = zrem;
    zadd = zadd;
    eval = evalScript;
    set = set;
    ping = ping;
  },
}));

vi.mock('@/core/observability/operation-metrics', () => ({
  recordOperation,
}));

const { UpstashPublicationQueueAdapter } = await import('@/integrations/redis/upstash-publication-queue');

function adapter() {
  return new UpstashPublicationQueueAdapter({ url: 'https://redis.test', token: 'token', namespace: 'prod', resourceId: 'rid' });
}

describe('hasPendingWork', () => {
  beforeEach(() => {
    zcard.mockReset();
  });

  it('melihat kedua set, bukan hanya yang due', async () => {
    zcard.mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    expect(await adapter().hasPendingWork()).toBe(true);
    expect(zcard).toHaveBeenCalledTimes(2);
  });

  it('true saat ada pekerjaan yang due', async () => {
    zcard.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect(await adapter().hasPendingWork()).toBe(true);
  });

  it('hanya true bila salah satu set terisi', async () => {
    zcard.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    expect(await adapter().hasPendingWork()).toBe(false);
  });

  it('true saat keduanya terisi', async () => {
    zcard.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    expect(await adapter().hasPendingWork()).toBe(true);
  });
});

describe('instrumentasi antrean', () => {
  beforeEach(() => {
    zcard.mockReset();
    zadd.mockReset();
    zrem.mockReset();
    evalScript.mockReset();
    set.mockReset();
    ping.mockReset();
    recordOperation.mockReset();
  });

  function samples() {
    return recordOperation.mock.calls.map((call) => call[0] as Record<string, unknown>);
  }

  it('mencatat depth, claim, enqueue, dan ack tanpa kunci mentah', async () => {
    zcard.mockResolvedValue(0);
    zadd.mockResolvedValue(1);
    zrem.mockResolvedValue(1);
    evalScript.mockResolvedValue(['id-1', 'tok-1']);
    const queue = adapter();
    await queue.hasPendingWork();
    await queue.schedule('id-1', new Date());
    await queue.claimDue(new Date(), 10, 60);
    await queue.acknowledge({ logicalId: 'id-1', claimToken: 'tok-1', leaseExpiresAt: new Date() });
    const operations = samples().map((sample) => sample.operation);
    expect(operations).toEqual(['queue.depth', 'queue.enqueue', 'queue.claim', 'queue.ack']);
    for (const sample of samples()) {
      expect(sample.route).toBe('queue');
      expect(sample.provider).toBe('upstash-redis');
      expect(sample.status).toBe(200);
    }
    expect(samples()[0]?.redisCommands).toBe(2);
    expect(samples()[2]?.redisCommands).toBe(1);
    expect(JSON.stringify(samples())).not.toMatch(/id-1|tok-1/);
  });

  it('peekDepth mengembalikan hitungan backlog untuk sinyal start', async () => {
    zcard.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    await expect(adapter().peekDepth()).resolves.toEqual({ due: 4, leased: 2 });
    expect(samples()[0]).toMatchObject({ operation: 'queue.depth', redisCommands: 2, status: 200 });
  });

  it('mirrorState mencatat tulis status pekerjaan', async () => {
    await adapter().mirrorState('org-1', 'job-1', 'processing', 300);
    expect(set).toHaveBeenCalledTimes(1);
    expect(samples()[0]).toMatchObject({ operation: 'queue.mirror', redisCommands: 1, status: 200 });
  });

  it('kegagalan Redis tetap melempar setelah mencatat status 500', async () => {
    zcard.mockRejectedValue(new Error('redis down'));
    await expect(adapter().hasPendingWork()).rejects.toThrow('redis down');
    expect(samples()[0]).toMatchObject({ operation: 'queue.depth', status: 500 });
  });
});
