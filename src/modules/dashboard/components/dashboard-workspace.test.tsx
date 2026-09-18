// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DashboardWorkspace } from '@/modules/dashboard/components/dashboard-workspace';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/modules/dashboard/switch-organization-action', () => ({
  switchActiveOrganization: vi.fn(async () => ({ status: 'idle' })),
}));

const ORGANISASI = [
  {
    id: 'org-1',
    name: 'Org Uji',
    records: ['domain.read', 'article.read'],
    role: 'admin',
    permissions: [],
  },
] as never;

function pasang(): void {
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
  pasang();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Ruang kerja dashboard', () => {
  it('merender merek, nama pengguna, dan ringkasan awal', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANISASI} />);
    expect(screen.getByText('Indicate')).toBeDefined();
    expect(screen.getByText('Redaktur Uji')).toBeDefined();
    expect(await screen.findByText('Ringkasan Ekosistem Redaksi')).toBeDefined();
    expect(screen.getByText('Akses: domain.read · article.read')).toBeDefined();
  });

  it('menciut dan membentangkan sidebar', () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANISASI} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ciutkan sidebar' }));
    expect(screen.getByRole('button', { name: 'Bentangkan sidebar' })).toBeDefined();
  });

  it('berganti judul saat modul redaksi dipilih', async () => {
    render(<DashboardWorkspace displayName="Redaktur Uji" organizations={ORGANISASI} />);
    await screen.findByText('Ringkasan Ekosistem Redaksi');
    fireEvent.click(screen.getByRole('button', { name: 'Artikel & Naskah' }));
    expect(await screen.findByText('Manajemen Artikel & Konten')).toBeDefined();
    expect(await screen.findByText('Tidak ada rekaman data')).toBeDefined();
  });
});
