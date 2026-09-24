import { describe, expect, it } from 'vitest';

import { getControlHosts, getPageviewEndpoint, isProductionEdge, parseMvpRootHosts } from '@/core/config/edge-hosts';

describe('getControlHosts', () => {
  it('memakai default indicate saat env kosong', () => {
    expect(getControlHosts({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toEqual({
      dashboard: 'indicate.website',
      api: 'api.indicate.website',
      webhook: 'webhook.indicate.website',
    });
  });

  it('menormalkan override menjadi huruf kecil rapi', () => {
    const hosts = getControlHosts({ NODE_ENV: 'test', DASHBOARD_HOST: '  Dash.Example  ' } as NodeJS.ProcessEnv);
    expect(hosts.dashboard).toBe('dash.example');
    expect(Object.isFrozen(hosts)).toBe(true);
  });
});

describe('getPageviewEndpoint', () => {
  it('memakai endpoint https kustom', () => {
    expect(getPageviewEndpoint({ NODE_ENV: 'test', NEXT_PUBLIC_PAGEVIEW_ENDPOINT: 'https://pv.example/v' } as NodeJS.ProcessEnv)).toBe('https://pv.example/v');
  });

  it('jatuh ke default saat kosong atau bukan https', () => {
    expect(getPageviewEndpoint({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe('https://pv.indicate.website/v');
    expect(getPageviewEndpoint({ NODE_ENV: 'test', NEXT_PUBLIC_PAGEVIEW_ENDPOINT: 'http://pv.example/v' } as NodeJS.ProcessEnv)).toBe('https://pv.indicate.website/v');
  });
});

describe('parseMvpRootHosts', () => {
  it('mengurai daftar koma dan mengabaikan entri kosong', () => {
    expect(parseMvpRootHosts('A.Example, ,b.example')).toEqual(['a.example', 'b.example']);
  });

  it('mengembalikan daftar kosong saat tak diisi', () => {
    expect(parseMvpRootHosts(undefined)).toEqual([]);
    expect(parseMvpRootHosts('')).toEqual([]);
  });
});

describe('isProductionEdge', () => {
  it('benar hanya di production', () => {
    expect(isProductionEdge({ NODE_ENV: 'production' })).toBe(true);
    expect(isProductionEdge({ NODE_ENV: 'development' })).toBe(false);
  });
});
