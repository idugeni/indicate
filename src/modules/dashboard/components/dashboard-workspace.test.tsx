// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DashboardWorkspace } from '@/modules/dashboard/components/dashboard-workspace';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';

/** The workspace loads eighteen panels through `next/dynamic`, so a lazy panel needs more than the 1s default. */
const LAZY_MODULE_TIMEOUT_MS = 8000;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

let initialView = 'dashboard';
let setViewExternal: ((next: string) => void) | null = null;
let releasePublishers: () => void = () => undefined;

vi.mock('nuqs', async () => {
  const React = await import('react');
  return {
    parseAsStringEnum: () => ({ withDefault: (fallback: unknown) => ({ withOptions: () => fallback }) }),
    parseAsString: { withOptions: () => null },
    parseAsInteger: { withDefault: (fallback: unknown) => ({ withOptions: () => fallback }) },
    useQueryState: (key: string) => {
      const [value, setValue] = React.useState(key === 'page' ? 1 : key === 'editArticle' ? null : initialView);
      if (key === 'view') setViewExternal = setValue;
      return [value, setValue];
    },
  };
});

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-1'),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('@/modules/dashboard/switch-organization-action', () => ({
  switchActiveOrganization: vi.fn(async () => ({ status: 'idle' })),
}));

const ORGANIZATIONS = [
  {
    id: 'org-1',
    name: 'Org Uji',
    role: 'admin',
    permissions: [DASHBOARD_PERMISSIONS.auditRead],
  },
] as never;

function setup(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({}) })),
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: window.matchMedia,
  });
}

beforeEach(() => {
  initialView = 'dashboard';
  setViewExternal = null;
  releasePublishers = () => undefined;
  for (const spy of Object.values(toastMock)) vi.mocked(spy).mockClear();
  setup();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Dashboard workspace', () => {
  it('blocks direct URL access to a restricted V2 view before mounting its data-owning panel', async () => {
    initialView = 'customers';
    const fetchMock = vi.fn(async (url: unknown) => { void url; return { ok: true, json: async () => [] }; });
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);

    expect(await screen.findByRole('heading', { name: 'Akses tidak tersedia' })).toBeDefined();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('view=customers'))).toBe(false);
    expect(screen.getByRole('button', { name: 'Kembali ke Command Center' })).toBeDefined();
  });

  it('renders the brand, owner name, and initial summary', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    expect(screen.getByText('Indicate')).toBeDefined();
    expect(screen.getByText('Redaktur Uji')).toBeDefined();
    expect(await screen.findByText('INDICATE / EXECUTIVE OVERVIEW')).toBeDefined();
  });

  it('collapses and expands the sidebar through the edge rail', () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    const rail = screen.getByRole('separator', { name: 'Ciutkan sidebar' });
    fireEvent.pointerDown(rail, { button: 0, clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(rail, { clientX: 0, pointerId: 1 });
    expect(screen.getByRole('separator', { name: 'Bentangkan sidebar' })).toBeDefined();
  });

  it('switches the title when an editorial module is selected', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('INDICATE / EXECUTIVE OVERVIEW');
    fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
    expect(await screen.findByText('Artikel baru', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('pins the footer to the bottom with the owner label', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('INDICATE / EXECUTIVE OVERVIEW');
    const footer = screen.getByText(/PT Sanca Phena Cakra/).closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
    expect(screen.getByText('Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash')).toBeDefined();
  });

  it('hides stale infrastructure content when switching modules', async () => {
    initialView = 'configuration';
    const pending = new Promise<void>((resolve) => { releasePublishers = resolve; });
    const fetchMock = vi.fn(async (url: unknown) => {
      const target = String(url);
      if (target.includes('view=publishers')) {
        await pending;
        return { ok: true, json: async () => ({ publishers: [{ id: 'pub-1', name: 'Humas Rutan', status: 'active', version: 1 }] }) };
      }
      if (target.includes('/api/dashboard/runtime-config')) {
        return {
          ok: true,
          json: async () => ({
            policy: {
              allowedMimeTypes: ['image/jpeg'],
              maxObjectBytes: 10485760,
              uploadAuthorizationSeconds: 300,
              readAuthorizationSeconds: 300,
              version: 1,
            },
            policies: {
              deployment: null,
              publication: null,
              webhook: null,
              cache: null,
              rateLimits: [],
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);

    expect(await screen.findByRole('heading', { name: 'Network Infrastructure', level: 1 }, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    act(() => setViewExternal?.('publishers'));
    expect(screen.queryByRole('heading', { name: 'Network Infrastructure', level: 1 })).toBeNull();
    expect(await screen.findByRole('status', { name: 'Memuat data modul' })).toBeDefined();
    expect(screen.queryByText(/Belum ada penerbit/i)).toBeNull();
    releasePublishers();
    expect((await screen.findAllByText('Humas Rutan', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Network Infrastructure', level: 1 })).toBeNull();
  });

  it('hydrates analytics from a snapshot that carries embedded analytics', async () => {
    const fetchMock = vi.fn(async (url: unknown) => {
      void url;
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DashboardWorkspace
        displayName="Redaktur Uji"
        organizations={ORGANIZATIONS}
        initialDashboard={{ organizationId: 'org-1', data: { activeDomains: 1, analytics: { articlesByRegion: [] } } }}
      />,
    );
    await screen.findByText('INDICATE / EXECUTIVE OVERVIEW');
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('view=analytics'))).toBe(true);
      expect(urls.some((url) => url.includes('view=dashboard'))).toBe(false);
    });
  });

  it('fetches analytics when the snapshot does not carry it yet', async () => {
    const fetchMock = vi.fn(async (url: unknown) => {
      void url;
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DashboardWorkspace
        displayName="Redaktur Uji"
        organizations={ORGANIZATIONS}
        initialDashboard={{ organizationId: 'org-1', data: { activeDomains: 1 } }}
      />,
    );
    await screen.findByText('INDICATE / EXECUTIVE OVERVIEW');
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('view=analytics'))).toBe(true);
    });
  });

  it('reports one human toast per user action instead of one per command', async () => {
    const posted: string[] = [];
    const gets: string[] = [];
    const fetchMock = vi.fn(async (url: unknown, init?: { body?: string }) => {
      if (init?.body !== undefined) posted.push(init.body);
      else gets.push(String(url));
      return {
        ok: true,
        json: async () => (init?.body === undefined ? { publishers: [{ id: 'p-1', name: 'Humas Rutan', version: 1, verificationStatus: 'unverified', status: 'active' }] } : { publisherId: 'p-2' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'publishers';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText(/v1/, {}, { timeout: LAZY_MODULE_TIMEOUT_MS });
    await waitFor(() => expect(gets.filter((url) => url.includes('view=publishers'))).toHaveLength(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    gets.length = 0;
    fireEvent.click(await screen.findByRole('button', { name: /Kirim verifikasi/i }, { timeout: LAZY_MODULE_TIMEOUT_MS }));

    await waitFor(() => expect(posted).toHaveLength(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(JSON.parse(posted[0] ?? '{}')).toMatchObject({ action: 'publisher.submit' });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(toastMock.success).toHaveBeenCalledWith('Status penerbit diperbarui.');
    // The V2 action surface owns the human-facing copy.
    for (const spy of [toastMock.success, toastMock.error, toastMock.info, toastMock.loading]) {
      for (const call of vi.mocked(spy).mock.calls) {
        expect(String(call[0])).not.toMatch(/Perintah .* berhasil dijalankan/);
      }
    }
    // Let the refetch settle before counting, otherwise the assertion races it.
    await waitFor(() => expect(gets.some((url) => url.includes('view=publishers'))).toBe(true), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(gets.filter((url) => url.includes('view=publishers'))).toHaveLength(1);
  }, 20000);

  it('does not stack raw tables below the media panel', async () => {    const fetchMock = vi.fn(async (url: unknown) => {
      const target = String(url);
      if (!target.includes('view=media')) return { ok: true, json: async () => ({}) };
      return {
        ok: true,
        json: async () => ({
          media: [{ id: 'm-1', objectKey: 'o/org/p/organization-asset/logo.png', purpose: 'organization-asset', mediaType: 'image/png', sizeBytes: 1024, owner: { kind: 'organization' }, state: 'active', createdAt: '2026-09-24T00:00:00.000Z' }],
          reservations: [{ id: 'r-1', objectKey: 'o/org/p/organization-asset/pending.png', status: 'used' }],
          cleanupTasks: [],
          articles: [],
          sites: [{ id: 's-1', normalizedHostname: 'fakta01.my.id' }],
          invalidationIntents: [{ id: 'i-1', status: 'completed' }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'media';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    expect(await screen.findByRole('heading', { name: 'Media Library', level: 1 }, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('invalidationIntents')).toBeNull();
    expect(screen.queryByText('reservations')).toBeNull();
    expect(screen.queryByText(/data, halaman/)).toBeNull();
  }, 20000);

  it('perintah baca tidak memicu toast maupun muat ulang', async () => {
    const calls: { readonly url: string; readonly init?: { readonly body?: string } | undefined }[] = [];
    const fetchMock = vi.fn(async (url: unknown, init?: { readonly body?: string }) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        json: async () => ({
          media: [{ id: 'm-1', objectKey: 'o/berkas.png', purpose: 'organization-asset', mediaType: 'image/png', sizeBytes: 1024, owner: { kind: 'organization' }, state: 'active', createdAt: '2026-09-24T00:00:00.000Z' }],
          mediaCounts: [{ kind: 'organization', count: 1, bytes: 1024 }],
          articles: [],
          sites: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'media';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByRole('heading', { name: 'Media Library', level: 1 }, { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(screen.queryByText('invalidationIntents')).toBeNull();
    expect(screen.queryByText('reservations')).toBeNull();
    expect(calls.filter((call) => call.init?.body !== undefined)).toHaveLength(0);
  }, 20000);

  it('menumbuhkan riwayat audit halaman demi halaman lewat kursor', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: unknown) => {
      const target = String(url);
      calls.push(target);
      const second = target.includes('cursor=');
      return {
        ok: true,
        json: async () => ({
          auditLogs: [
            { id: second ? 'log-2' : 'log-1', action: second ? 'article.update' : 'article.create', outcome: 'succeeded', actorType: 'user', actorId: 'u-1', entryPoint: 'dashboard', targetType: 'article', targetId: 'a-1', changedFields: [], before: null, after: null, requestId: 'r-1', occurredAt: '2026-09-18T14:00:00.000Z' },
          ],
          auditNextCursor: second ? null : 'cursor-1',
          retentionRuns: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'audit';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('article.create', {}, { timeout: LAZY_MODULE_TIMEOUT_MS });
    fireEvent.click(await screen.findByRole('button', { name: 'Muat riwayat lebih lama' }, { timeout: LAZY_MODULE_TIMEOUT_MS }));
    await waitFor(() => expect(calls.some((url) => url.includes('cursor=cursor-1'))).toBe(true), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(await screen.findByText('article.update', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Muat riwayat lebih lama' })).toBeNull();
  }, 20000);
});
