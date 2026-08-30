import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudflareAuthorityAdapter } from '@/infrastructure/cloudflare/cloudflare-authority';
import { VercelExactDomainAdapter } from '@/infrastructure/vercel/exact-domain-adapter';

const json = (result: unknown, status = 200) => new Response(JSON.stringify({ success: status < 400, result }), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('Stage 5 deterministic provider contracts', () => {
  it('requires explicit Vercel verified state even when the returned hostname matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/verify')) return new Response(JSON.stringify({ name: 'alpha.example.web.id', verified: false }), { status: 200 });
      return new Response(JSON.stringify({ name: 'alpha.example.web.id', verified: false }), { status: 200 });
    }));
    const adapter = new VercelExactDomainAdapter('project', 'team', 'token');
    await expect(adapter.associateExactDomain('alpha.example.web.id')).resolves.toMatchObject({ associated: true, verified: false });
    await expect(adapter.verifyExactDomain('alpha.example.web.id')).resolves.toBe(false);
    await expect(adapter.associateExactDomain('*.example.web.id')).rejects.toThrow('non_exact_domain_prohibited');
  });

  it('verifies public DNS delegation and partitions exact URL purges by owning zone', async () => {
    const purges: { zone: string; files: string[] }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const zoneId = url.pathname.split('/')[4];
      if (/\/zones\/z[12]$/u.test(url.pathname)) return json(zoneId === 'z1' ? { id: 'z1', name: 'alpha.web.id', name_servers: ['Ada.NS.Cloudflare.com', 'Bob.NS.Cloudflare.com'] } : { id: 'z2', name: 'beta.web.id', name_servers: ['Cyd.NS.Cloudflare.com', 'Dan.NS.Cloudflare.com'] });
      if (url.pathname.endsWith('/dns_records')) { const root = zoneId === 'z1' ? 'alpha.web.id' : 'beta.web.id'; return json([{ name: root, type: 'CNAME', content: 'target.vercel-dns.com', proxied: true }, { name: `*.${root}`, type: 'CNAME', content: 'target.vercel-dns.com', proxied: true }]); }
      if (url.pathname.endsWith('/settings/ssl')) return json({ value: 'strict' });
      if (url.pathname.endsWith('/purge_cache')) { purges.push({ zone: zoneId!, files: (JSON.parse(String(init?.body)) as { files: string[] }).files }); return json({ id: 'purge' }); }
      return json({});
    }));
    const resolver = async (hostname: string) => hostname === 'alpha.web.id' ? ['bob.ns.cloudflare.com.', 'ada.ns.cloudflare.com.'] : ['dan.ns.cloudflare.com.', 'cyd.ns.cloudflare.com.'];
    const adapter = new CloudflareAuthorityAdapter('account', 'token-token', ['z1', 'z2'], ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com', 'cyd.ns.cloudflare.com', 'dan.ns.cloudflare.com'], 'target.vercel-dns.com', resolver);
    await expect(adapter.verifyZone('news.alpha.web.id')).resolves.toMatchObject({ nameserversAuthoritative: true, publicDelegationAuthoritative: true });
    await adapter.purgeExactUrls(['https://news.alpha.web.id/articles/one', 'https://news.beta.web.id/articles/two']);
    expect(purges).toEqual([{ zone: 'z1', files: ['https://news.alpha.web.id/articles/one'] }, { zone: 'z2', files: ['https://news.beta.web.id/articles/two'] }]);
  });
});
