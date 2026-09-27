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
    parseAsInteger: { withDefault: (fallback: unknown) => ({ withOptions: () => fallback }) },
    useQueryState: (key: string) => {
      const [value, setValue] = React.useState(key === 'page' ? 1 : initialView);
      if (key === 'view') setViewExternal = setValue;
      return [value, setValue];
    },
  };
});

const { unwrapSpy } = vi.hoisted(() => ({ unwrapSpy: vi.fn(async (task: Promise<unknown>) => task) }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    // Mirrors sonner 2.x: `promise` hands back `{ unwrap }`, never the resolved value.
    promise: vi.fn((task: Promise<unknown>) => ({ unwrap: () => unwrapSpy(task) })),
  },
}));

vi.mock('@/modules/dashboard/switch-organization-action', () => ({
  switchActiveOrganization: vi.fn(async () => ({ status: 'idle' })),
}));

const ORGANIZATIONS = [
  {
    id: 'org-1',
    name: 'Org Uji',
    records: ['domain.read', 'article.read'],
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
    expect(await screen.findByText('Ringkasan Ekosistem Redaksi')).toBeDefined();
    expect(screen.getByText('Akses: domain.read · article.read')).toBeDefined();
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
    await screen.findByText('Ringkasan Ekosistem Redaksi');
    fireEvent.click(screen.getByRole('button', { name: 'Tulis Berita' }));
    expect(await screen.findByText('Manajemen Artikel & Konten', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(await screen.findByText('Artikel baru', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('pins the footer to the bottom with the owner label', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('Ringkasan Ekosistem Redaksi');
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

  it('skips the analytics fetch when the snapshot already carries it', async () => {
    const fetchMock = vi.fn(async (_url: unknown) => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DashboardWorkspace
        displayName="Redaktur Uji"
        organizations={ORGANIZATIONS}
        initialDashboard={{ organizationId: 'org-1', data: { activeDomains: 1, analytics: { articlesByRegion: [] } } }}
      />,
    );
    await screen.findByText('Domain Utama');
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('view=analytics'))).toBe(false);
    expect(urls.some((url) => url.includes('view=dashboard'))).toBe(false);
  });

  it('fetches analytics when the snapshot does not carry it yet', async () => {
    const fetchMock = vi.fn(async (_url: unknown) => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DashboardWorkspace
        displayName="Redaktur Uji"
        organizations={ORGANIZATIONS}
        initialDashboard={{ organizationId: 'org-1', data: { activeDomains: 1 } }}
      />,
    );
    await screen.findByText('Domain Utama');
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('view=analytics'))).toBe(true);
    });
  });

  it('unwraps command responses instead of passing the toast object', async () => {
    unwrapSpy.mockClear();
    const posted: string[] = [];
    const fetchMock = vi.fn(async (_url: unknown, init?: { body?: string }) => {
      if (init?.body !== undefined) posted.push(init.body);
      return {
        ok: true,
        json: async () => (init?.body === undefined ? { publishers: [{ id: 'p-1', name: 'Humas Rutan', version: 1 }] } : { publisherId: 'p-2' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    initialView = 'publishers';
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Terapkan Keputusan/i }, { timeout: LAZY_MODULE_TIMEOUT_MS }));

    await waitFor(() => expect(unwrapSpy).toHaveBeenCalled(), { timeout: LAZY_MODULE_TIMEOUT_MS });
    expect(JSON.parse(posted.at(-1) ?? '{}')).toMatchObject({ action: 'publisher.submit' });
    await expect(unwrapSpy.mock.results.at(-1)?.value).resolves.toEqual({ publisherId: 'p-2' });
  });

  it('does not stack raw tables below the media panel', async () => {
    const fetchMock = vi.fn(async (url: unknown) => {
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
    expect(await screen.findByText('Gudang aset jaringan', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('invalidationIntents')).toBeNull();
    expect(screen.queryByText('reservations')).toBeNull();
    expect(screen.queryByText(/data, halaman/)).toBeNull();
  });
});
