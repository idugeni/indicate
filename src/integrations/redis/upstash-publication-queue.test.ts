import { beforeEach, describe, expect, it, vi } from 'vitest';

const zcard = vi.fn();
const zrem = vi.fn();
const zadd = vi.fn();
const evalScript = vi.fn();
const set = vi.fn();
const ping = vi.fn();

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
