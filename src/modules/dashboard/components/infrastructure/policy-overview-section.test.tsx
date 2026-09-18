// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PolicyOverviewSection } from '@/modules/dashboard/components/infrastructure/policy-overview-section';

const RINGKASAN = {
  policies: {
    deployment: {
      supabaseProjectRef: 'ref-uji',
      cloudflareAccountId: 'akun-uji',
      vercelProjectId: 'proyek-uji',
      vercelTeamId: 'tim-uji',
      vercelProductionTargetHostname: 'indicate.example',
      r2AccountId: 'r2-uji',
      r2BucketName: 'ember-uji',
      upstashRedisResourceId: 'redis-uji',
      version: 1,
    },
    publication: {
      maxAttempts: 5,
      retryDelaysSeconds: [60, 300],
      leaseSeconds: 120,
      batchSize: 10,
      functionDeadlineSeconds: 60,
      version: 2,
    },
    webhook: { freshnessSeconds: 300, replayRetentionSeconds: 86400, version: 1 },
    cache: { publicCacheSeconds: 60, cacheVersion: 7, version: 4 },
    rateLimits: [{ endpointClass: 'auth', allowance: 100, windowSeconds: 60, version: 2 }],
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Seksi ringkasan kebijakan', () => {
  it('menampilkan pesan grant saat API menolak', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 404, ok: false, json: async () => ({}) })));
    render(<PolicyOverviewSection />);
    expect(
      await screen.findByText('Panel ini membutuhkan grant platform.runtime_config.manage.'),
    ).toBeDefined();
  });

  it('merender ringkasan deployment, publikasi, dan rate limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => RINGKASAN })));
    render(<PolicyOverviewSection />);
    expect(await screen.findByText('Deployment · v1')).toBeDefined();
    expect(screen.getByText('Publikasi · v2')).toBeDefined();
    expect(screen.getByText('Webhook · v1')).toBeDefined();
    expect(screen.getByText('Cache · v4')).toBeDefined();
    expect(screen.getByText('auth · v2')).toBeDefined();
    expect(screen.getByText('100 / 60s')).toBeDefined();
    expect(await screen.findByRole('button', { name: 'Muat ulang' })).toBeDefined();
  });

  it('menampilkan galat saat API gagal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('jaringan putus');
      }),
    );
    render(<PolicyOverviewSection />);
    expect(await screen.findByText('Gagal memuat ringkasan kebijakan platform.')).toBeDefined();
  });
});
