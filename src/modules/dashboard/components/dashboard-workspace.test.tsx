// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DashboardWorkspace } from '@/modules/dashboard/components/dashboard-workspace';

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
    permissions: [],
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
  it('renders the brand, owner name, and initial summary', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    expect(screen.getByText('Indicate')).toBeDefined();
    expect(screen.getByText('Redaktur Uji')).toBeDefined();
    expect(await screen.findByText('INDICATE / COMMAND CENTER')).toBeDefined();
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
    await screen.findByText('INDICATE / COMMAND CENTER');
    fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
    expect(await screen.findByText('Editorial Workspace', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('pins the footer to the bottom with the owner label', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('INDICATE / COMMAND CENTER');
    const footer = screen.getByText(/PT Sanca Phena Cakra/).closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
    expect(screen.getByText('Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash')).toBeDefined();
  });

  it('hides stale page collections when switching modules', async () => {
    initialView = 'configuration';
    const pending = new Promise<void>((resolve) => { releasePublishers = resolve; });
    const fetchMock = vi.fn(async (url: unknown) => {
      const target = String(url);
      if (target.includes('view=publishers')) {
        await pending;
        return { ok: true, json: async () => ({ publishers: [{ id: 'pub-1', name: 'Humas Rutan', status: 'active', version: 1 }] }) };
      }
      return { ok: true, json: async () => ({ domains: [{ id: 'd-1', normalizedHostname: 'jabar.domainanda.id', status: 'active', version: 1 }] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);

    expect(await screen.findByText('jabar.domainanda.id', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    act(() => setViewExternal?.('publishers'));
    expect(screen.queryByText('jabar.domainanda.id')).toBeNull();
    releasePublishers();
    expect(await screen.findByText('Humas Rutan', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('jabar.domainanda.id')).toBeNull();
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
    await screen.findByText('INDICATE / COMMAND CENTER');
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
    await screen.findByText('INDICATE / COMMAND CENTER');
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
        json: async () => (init?.body === undefined ? { publishers: [{ id: 'p-1', name: 'Humas Rutan', version: 1 }] } : { publisherId: 'p-2' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'publishers';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    // Readiness has to be the resolved publisher card, not the name: the name
    // also renders inside the combobox once options arrive, so `findByText`
    // turns a timing race into "found multiple elements". The submit button is
    // no better - it stays enabled until data loads.
    await screen.findByText(/ID: p-1\.\.\. · Versi 1/, {}, { timeout: LAZY_MODULE_TIMEOUT_MS });
    gets.length = 0;
    fireEvent.click(await screen.findByRole('button', { name: /Terapkan Keputusan/i }, { timeout: LAZY_MODULE_TIMEOUT_MS }));

    await waitFor(() => expect(posted).toHaveLength(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(JSON.parse(posted[0] ?? '{}')).toMatchObject({ action: 'publisher.submit' });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(toastMock.success).toHaveBeenCalledWith('Keputusan tata kelola berhasil diterapkan.');
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
    expect(await screen.findByText('Pustaka Media & Repositori Aset', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('invalidationIntents')).toBeNull();
    expect(screen.queryByText('reservations')).toBeNull();
    expect(screen.queryByText(/data, halaman/)).toBeNull();
  });

  it('perintah baca tidak memicu toast maupun muat ulang', async () => {
    const calls: { readonly url: string; readonly init?: { readonly body?: string } | undefined }[] = [];
    const fetchMock = vi.fn(async (url: unknown, init?: { readonly body?: string }) => {
      calls.push({ url: String(url), init });
      if (init?.body !== undefined) {
        return {
          ok: true,
          json: async () => ({
            items: [{ id: 'm-1', objectKey: 'o/berkas.png', purpose: 'organization-asset', mediaType: 'image/png', sizeBytes: 1024, owner: { kind: 'organization' }, state: 'active', createdAt: '2026-09-24T00:00:00.000Z' }],
            nextCursor: 'kursor-1',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          media: [{ id: 'm-1', objectKey: 'o/berkas.png', purpose: 'organization-asset', mediaType: 'image/png', sizeBytes: 1024, owner: { kind: 'organization' }, state: 'active', createdAt: '2026-09-24T00:00:00.000Z' }],
          nextCursor: 'kursor-1',
          mediaCounts: [{ kind: 'organization', count: 1, bytes: 1024 }],
          articles: [],
          sites: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'media';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('Pustaka Media & Repositori Aset', {}, { timeout: LAZY_MODULE_TIMEOUT_MS });
    await screen.findByRole('button', { name: /Muat 24 lagi/ }, { timeout: LAZY_MODULE_TIMEOUT_MS });
    fireEvent.click(screen.getByRole('button', { name: /Muat 24 lagi/ }));
    await waitFor(() => expect(calls.filter((call) => call.init?.body !== undefined)).toHaveLength(1), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(calls.filter((call) => call.init?.body === undefined)).toHaveLength(1);
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
    await screen.findByText('log-1', {}, { timeout: LAZY_MODULE_TIMEOUT_MS });
    fireEvent.click(await screen.findByRole('button', { name: 'Muat riwayat lebih lama' }, { timeout: LAZY_MODULE_TIMEOUT_MS }));
    await waitFor(() => expect(calls.some((url) => url.includes('cursor=cursor-1'))).toBe(true), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(await screen.findByText('log-2', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Muat riwayat lebih lama' })).toBeNull();
  }, 20000);
});
