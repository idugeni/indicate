import { describe, expect, it, vi } from 'vitest';

import { CloudflareAuthorityAdapter } from '@/integrations/cloudflare/cloudflare-authority';

interface Call {
  readonly url: string;
  readonly init?: RequestInit | undefined;
}

function jsonResponse(result: unknown): Response {
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => ({ success: true, result }),
  } as unknown as Response;
}

function zone(id: string, name: string) {
  return { id, name, name_servers: ['joan.ns.cloudflare.com', 'kanye.ns.cloudflare.com'] };
}

function harness(exact: readonly { id: string; name: string }[], pages: readonly (readonly { id: string; name: string }[])[], failPurgeIndexes: readonly number[] = []) {
  const calls: Call[] = [];
  let purgeCount = 0;
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('/purge_cache')) {
      purgeCount += 1;
      if (failPurgeIndexes.includes(purgeCount)) throw new Error('purge_chunk_failed');
      return jsonResponse({});
    }
    if (url.includes('/zones?name=')) return jsonResponse(exact);
    const page = Number(new URL(url, 'https://api.cloudflare.com').searchParams.get('page') ?? '1');
    return jsonResponse(pages[page - 1] ?? []);
  });
  const adapter = new CloudflareAuthorityAdapter('acct', 'token', 'target.example', async () => [], fetcher as unknown as typeof fetch);
  return { adapter, calls, fetcher };
}

describe('zoneForHostname pagination', () => {
  it('memakai hasil exact-name tanpa memindai halaman', async () => {
    const { adapter, calls } = harness([zone('z1', 'fakta01.my.id')], []);
    await adapter.purgeHostname('fakta01.my.id');
    expect(calls.filter((call) => !call.url.includes('/purge_cache'))).toHaveLength(1);
    expect(calls.some((call) => call.url === 'https://api.cloudflare.com/client/v4/zones/z1/purge_cache')).toBe(true);
  });

  it('menemukan zone induk di halaman berikutnya untuk subdomain', async () => {
    const page1 = Array.from({ length: 50 }, (_, index) => zone(`old-${index}`, `a${index}.example`));
    const { adapter, calls } = harness([], [page1, [zone('z9', 'fakta01.my.id')]]);
    await adapter.purgeHostname('wonosobo.fakta01.my.id');
    expect(calls.some((call) => call.url === 'https://api.cloudflare.com/client/v4/zones/z9/purge_cache')).toBe(true);
  });

  it('gagal tertutup bila seluruh halaman habis tanpa kecocokan', async () => {
    const { adapter } = harness([], [[zone('z1', 'other.example')]]);
    await expect(adapter.purgeHostname('unknown.example')).rejects.toThrow('cloudflare_zone_unavailable');
  });

  it('memoizes zone dalam satu instance', async () => {
    const { adapter, calls } = harness([zone('z1', 'fakta01.my.id')], []);
    await adapter.purgeHostname('fakta01.my.id');
    await adapter.purgeHostname('fakta01.my.id');
    expect(calls.filter((call) => !call.url.includes('/purge_cache'))).toHaveLength(1);
  });
});

describe('ensureCrawlerSkipRule', () => {
  const challenge = {
    id: 'rule-2',
    action: 'managed_challenge',
    description: 'Challenge WP/env/git probes',
    enabled: true,
    expression: '(http.request.uri.path contains "wp-login.php")',
  };

  function rulesetHarness(rules: readonly Record<string, unknown>[]) {
    const calls: Call[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ description: 'tenant probes', rules });
    });
    const adapter = new CloudflareAuthorityAdapter('acct', 'token', 'target.example', async () => [], fetcher as unknown as typeof fetch);
    return { adapter, calls };
  }

  it('lewati bila skip sudah pertama', async () => {
    const skip = { id: 'rule-1', action: 'skip', description: 'Allow social preview crawlers', enabled: true, expression: 'x' };
    const { adapter, calls } = rulesetHarness([skip, challenge]);
    await adapter.ensureCrawlerSkipRule('z1');
    expect(calls.filter((call) => call.init?.method === 'PUT')).toHaveLength(0);
  });

  it('sisipkan skip di depan tanpa menghapus challenge', async () => {
    const { adapter, calls } = rulesetHarness([challenge]);
    await adapter.ensureCrawlerSkipRule('z1');
    const puts = calls.filter((call) => call.init?.method === 'PUT');
    expect(puts).toHaveLength(1);
    const body = JSON.parse(String(puts[0]?.init?.body)) as { rules: { action: string; description: string }[] };
    expect(body.rules.map((rule) => rule.action)).toEqual(['skip', 'managed_challenge']);
    expect(body.rules[0]?.description).toBe('Allow social preview crawlers');
  });
});

describe('purgeExactUrls batching', () => {
  it('memecah file per 30 URL dan tidak pernah memakai purge_everything', async () => {
    const { adapter, calls } = harness([zone('z1', 'fakta01.my.id')], []);
    const urls = Array.from({ length: 65 }, (_, index) => `https://fakta01.my.id/page-${index}`);
    await adapter.purgeExactUrls(urls);
    const purges = calls.filter((call) => call.url.includes('/purge_cache'));
    expect(purges).toHaveLength(3);
    const sizes = purges.map((call) => (JSON.parse(String(call.init?.body)) as { files: unknown[] }).files.length);
    expect(sizes).toEqual([30, 30, 5]);
    for (const call of purges) {
      expect(String(call.init?.body)).not.toContain('purge_everything');
    }
  });

  it('melanjutkan chunk lain saat satu chunk gagal lalu melaporkan parsial', async () => {
    const { adapter, calls } = harness([zone('z1', 'fakta01.my.id')], [], [2]);
    const urls = Array.from({ length: 65 }, (_, index) => `https://fakta01.my.id/page-${index}`);
    await expect(adapter.purgeExactUrls(urls)).rejects.toThrow('cloudflare_partial_purge:30');
    expect(calls.filter((call) => call.url.includes('/purge_cache'))).toHaveLength(3);
  });
});
