import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<object>()), cache: (fn: unknown) => fn }));

import { HostnameResolver, hasReservedHostnameConflict } from '@/modules/delivery/hostname-resolver';
import type { ResolvedSiteContext } from '@/modules/delivery/models';

const HOSTS = { dashboard: 'dash.example', api: 'api.example', webhook: 'hook.example', docs: 'docs.example' };

function resolverWith(matches: readonly ResolvedSiteContext[]) {
  return new HostnameResolver({ findActiveSitesByExactHostname: async () => matches }, HOSTS);
}

const SITE = {
  organizationId: 'org-1',
  siteId: 'site-1',
  domainId: 'dom-1',
  normalizedHostname: 'berita.example',
  regionId: null,
  routingVersion: 1,
} as unknown as ResolvedSiteContext;

describe('HostnameResolver tanpa DB', () => {
  it('menolak host invalid dan memetakan control surface', async () => {
    const resolver = resolverWith([]);
    expect(await resolver.classify('bukan host!!')).toEqual({ kind: 'invalid', status: 400, robots: 'noindex, nofollow' });
    expect(await resolver.classify('api.example')).toEqual({ kind: 'control', hostname: 'api.example', surface: 'api' });
  });

  it('memetakan localhost ke dashboard', async () => {
    expect(await resolverWith([]).classify('localhost')).toEqual({ kind: 'control', hostname: 'dash.example', surface: 'dashboard' });
  });

  it('memetakan unknown, situs tunggal, dan ambigu', async () => {
    expect(await resolverWith([]).classify('asing.example')).toEqual({
      kind: 'unknown',
      hostname: 'asing.example',
      status: 404,
      robots: 'noindex, nofollow',
    });
    expect(await resolverWith([SITE]).classify('berita.example')).toEqual({ kind: 'site', context: SITE });
    expect(await resolverWith([SITE, SITE]).classify('berita.example')).toEqual({
      kind: 'ambiguous',
      hostname: 'berita.example',
      status: 500,
      robots: 'noindex, nofollow',
    });
  });
});

describe('hasReservedHostnameConflict', () => {
  it('mendeteksi hostname yang sudah dicadangkan', () => {
    expect(hasReservedHostnameConflict('dash.example', new Set(['dash.example']))).toBe(true);
    expect(hasReservedHostnameConflict('bebas.example', new Set(['dash.example']))).toBe(false);
  });
});
