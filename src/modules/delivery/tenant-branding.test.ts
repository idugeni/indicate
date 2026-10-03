import { describe, expect, it, vi } from 'vitest';

const { cacheCalls, repoCalls, state } = vi.hoisted(() => ({
  cacheCalls: [] as { keys: string[]; tags: string[]; revalidate: number | false | undefined }[],
  repoCalls: [] as unknown[],
  state: {
    host: 'portal.example',
    classification: null as unknown,
    templateId: 'warm-editorial' as string | null,
    throws: false,
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: (
    jalan: () => Promise<unknown>,
    keys: string[],
    options: { tags: string[]; revalidate: number | false | undefined },
  ) => {
    cacheCalls.push({ keys, tags: options.tags, revalidate: options.revalidate });
    return jalan;
  },
}));
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => (name === 'x-forwarded-host' ? state.host : 'proxy.internal') }),
}));
vi.mock('@/modules/delivery/network-runtime', () => ({
  classifyTenantHost: async () => state.classification,
}));
vi.mock('@/modules/delivery/delivery-composition', () => ({
  deliveryComposition: async () => ({
    repository: {
      loadSiteTemplateId: async (context: unknown) => {
        repoCalls.push(context);
        if (state.throws) throw new Error('pool exhausting connections');
        return state.templateId;
      },
    },
  }),
}));

import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'org-1',
  domainId: 'dom-1',
  siteId: 'site-1',
  regionId: null,
  routingVersion: 4,
  contentVersion: 9,
};

function onTenantHost(overrides: Partial<typeof CONTEXT> = {}) {
  state.host = 'portal.example';
  state.classification = { kind: 'site', context: { ...CONTEXT, ...overrides } };
  state.templateId = 'warm-editorial';
  state.throws = false;
  repoCalls.length = 0;
  cacheCalls.length = 0;
}

function onControlPlane(surface: 'dashboard' | 'api' | 'webhook') {
  state.host = 'kontrol.example';
  state.classification = { kind: 'control', hostname: 'kontrol.example', surface };
  state.templateId = 'warm-editorial';
  state.throws = false;
  repoCalls.length = 0;
  cacheCalls.length = 0;
}

describe('resolveTenantBranding', () => {
  it('memberikan templateId dan logo absolut untuk host tenant', async () => {
    onTenantHost();

    await expect(resolveTenantBranding()).resolves.toEqual({
      hostname: 'portal.example',
      templateId: 'warm-editorial',
      logoUrl: 'https://portal.example/logo.png',
    });
    expect(repoCalls).toEqual([CONTEXT]);
  });

  it('membaca satu kolom template lewat tag host, site, dan org', async () => {
    onTenantHost();

    await resolveTenantBranding();

    expect(cacheCalls).toHaveLength(1);
    expect(cacheCalls[0]?.tags).toEqual(['host:portal.example', 'site:site-1', 'org:org-1']);
    expect(cacheCalls[0]?.revalidate).toBe(86400);
    expect(cacheCalls[0]?.keys[0]).toContain('portal.example');
    expect(cacheCalls[0]?.keys[0]).toContain('site-1');
  });

  it('mengembalikan null untuk host control-plane tanpa membaca repositori', async () => {
    for (const surface of ['dashboard', 'api', 'webhook'] as const) {
      onControlPlane(surface);

      await expect(resolveTenantBranding()).resolves.toBeNull();
      expect(repoCalls).toEqual([]);
      expect(cacheCalls).toEqual([]);
    }
  });

  it('mengembalikan null saat host tidak dikenal', async () => {
    onControlPlane('dashboard');
    state.classification = { kind: 'unknown', hostname: 'asing.example', status: 404, robots: 'noindex, nofollow' };

    await expect(resolveTenantBranding()).resolves.toBeNull();
    expect(repoCalls).toEqual([]);
  });

  it('mengembalikan null saat repositori melempar agar cat tidak ikut gagal', async () => {
    onTenantHost();
    state.throws = true;

    await expect(resolveTenantBranding()).resolves.toBeNull();
  });

  it('menormalkan id template tak dikenal, tidak meneruskannya mentah', async () => {
    onTenantHost();
    state.templateId = 'tidak-terdaftar-999';

    const branding = await resolveTenantBranding();

    expect(branding?.templateId).toBe('clean-blue');
  });

  it('menormalkan id template dengan huruf kapital dan spasi', async () => {
    onTenantHost();
    state.templateId = ' Warm-Editorial ';

    const branding = await resolveTenantBranding();

    expect(branding?.templateId).toBe('clean-blue');
  });

  it('memakai template tunggal saat baris pengaturan belum ada', async () => {
    onTenantHost();
    state.templateId = null;

    await expect(resolveTenantBranding()).resolves.toEqual({
      hostname: 'portal.example',
      templateId: 'clean-blue',
      logoUrl: 'https://portal.example/logo.png',
    });
  });

  it('mengenamak logo ke hostname tenant yang ter-resolve', async () => {
    onTenantHost({ normalizedHostname: 'kota.jabarprov.example' });

    const branding = await resolveTenantBranding();

    expect(branding?.logoUrl).toBe('https://kota.jabarprov.example/logo.png');
  });
});