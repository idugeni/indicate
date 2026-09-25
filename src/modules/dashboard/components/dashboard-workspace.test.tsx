// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DashboardWorkspace } from '@/modules/dashboard/components/dashboard-workspace';

/** The workspace loads eighteen panels through `next/dynamic`, so a lazy panel needs more than the 1s default. */
const LAZY_MODULE_TIMEOUT_MS = 8000;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('nuqs', async () => {
  const React = await import('react');
  return {
    parseAsStringEnum: () => ({ withDefault: (fallback: unknown) => ({ withOptions: () => fallback }) }),
    parseAsInteger: { withDefault: (fallback: unknown) => ({ withOptions: () => fallback }) },
    useQueryState: (key: string) => React.useState(key === 'page' ? 1 : 'dashboard'),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
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
  setup();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Ruang kerja dashboard', () => {
  it('merender merek, nama pengguna, dan ringkasan awal', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    expect(screen.getByText('Indicate')).toBeDefined();
    expect(screen.getByText('Redaktur Uji')).toBeDefined();
    expect(await screen.findByText('Ringkasan Ekosistem Redaksi')).toBeDefined();
    expect(screen.getByText('Akses: domain.read · article.read')).toBeDefined();
  });

  it('menciut dan membentangkan sidebar', () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ciutkan sidebar' }));
    expect(screen.getByRole('button', { name: 'Bentangkan sidebar' })).toBeDefined();
  });

  it('berganti judul saat modul redaksi dipilih', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('Ringkasan Ekosistem Redaksi');
    fireEvent.click(screen.getByRole('button', { name: 'Tulis Berita' }));
    expect(await screen.findByText('Manajemen Artikel & Konten', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(await screen.findByText('Artikel baru', {}, { timeout: LAZY_MODULE_TIMEOUT_MS })).toBeDefined();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('menempelkan footer di bawah dengan label pengelola', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANIZATIONS} />);
    await screen.findByText('Ringkasan Ekosistem Redaksi');
    const footer = screen.getByText(/PT Sanca Phena Cakra/).closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
    expect(screen.getByText('Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash')).toBeDefined();
  });

  it('melewatkan fetch analitik saat snapshot sudah memuatnya', async () => {
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

  it('mengambil analitik saat snapshot belum memuatnya', async () => {
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
});
