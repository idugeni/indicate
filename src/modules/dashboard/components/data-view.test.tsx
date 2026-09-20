// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DataView } from '@/modules/dashboard/components/data-view';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

afterEach(() => {
  cleanup();
});

const DASBOR = {
  activeDomains: 2,
  activeSites: 1,
  activeArticles: 4,
  archivedArticles: 1,
  activeMedia: 3,
  successfulSiteOutcomes: 0,
  failedSiteOutcomes: 0,
  jobsByState: { queued: 2, published: 1 },
  analytics: {
    articlesByRegion: [{ key: 'reg-1', count: 3 }],
    articlesBySite: [{ key: 'situs-1', count: 2 }],
    articlesByCategory: [{ key: 'kat-1', count: 4 }],
    articlesByPublisher: [{ key: 'pub-1', count: 4 }],
    jobsByState: [{ key: 'queued', count: 2 }],
    jobsBySiteRegionAndState: [],
    outcomesBySiteAndState: [],
    outcomesBySiteRegionAndState: [],
  },
};

describe('Tampilan data dasbor', () => {
  it('merender metrik, panduan, antrean, dan kesehatan', { timeout: 30000 }, async () => {
    const pilih = vi.fn();
    render(
      <DataView view="dashboard" data={DASBOR} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} onSelectView={pilih} />,
    );
    expect(screen.getByText('Domain Aktif')).toBeDefined();
    expect(screen.getByText('Subdomain Aktif')).toBeDefined();
    expect(screen.getByText('Total Tayangan')).toBeDefined();
    expect(screen.getByText('Panduan mulai cepat')).toBeDefined();
    expect(await screen.findByText('Distribusi antrean', undefined, { timeout: 30000 })).toBeDefined();
    expect(await screen.findByText('Corong konversi', undefined, { timeout: 30000 })).toBeDefined();
    expect(await screen.findByText('Top wilayah', undefined, { timeout: 30000 })).toBeDefined();
    expect(await screen.findByText('Top kategori', undefined, { timeout: 30000 })).toBeDefined();
    expect(await screen.findByText('Komposisi hasil', undefined, { timeout: 30000 })).toBeDefined();
    expect(await screen.findByText('Tren tayangan', undefined, { timeout: 30000 })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /tulis artikel/i }));
    expect(pilih).toHaveBeenCalledWith('editorial');
  });

  it('menampilkan panduan penuh saat data kosong', { timeout: 30000 }, async () => {
    render(<DataView view="dashboard" data={{}} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByText(/0 dari 4 selesai/)).toBeDefined();
    expect(await screen.findAllByText(/Belum ada hasil penyaluran/, undefined, { timeout: 30000 })).toHaveLength(2);
  });
});

describe('Tampilan data koleksi', () => {
  it('menampilkan status kosong dan memanggil muat ulang', () => {
    const muatUlang = vi.fn();
    render(
      <DataView view="configuration" data={{}} currentPage={1} onPageChange={vi.fn()} onRefresh={muatUlang} />,
    );
    expect(screen.getByText('Tidak ada rekaman data')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /muat ulang data/i }));
    expect(muatUlang).toHaveBeenCalledTimes(1);
  });

  it('merender tabel situs dengan penomoran halaman', () => {
    const gantiHalaman = vi.fn();
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={gantiHalaman}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('portal.example')).toBeDefined();
    expect(screen.getByText('1–1 dari 1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aksi untuk portal.example' })).toBeDefined();
  });

  it('berpindah halaman saat koleksi melebihi satu halaman', () => {
    const gantiHalaman = vi.fn();
    const banyak = Array.from({ length: 11 }, (_, i) => ({
      id: `s-${i + 1}`,
      normalizedHostname: `portal-${i + 1}.example`,
      status: 'active',
      version: 1,
    }));
    render(
      <DataView
        view="configuration"
        data={{ sites: banyak }}
        currentPage={1}
        onPageChange={gantiHalaman}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('1–10 dari 11')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(gantiHalaman).toHaveBeenCalledWith(2);
  });

  it('mengurutkan baris saat kepala nama diklik', () => {
    render(
      <DataView
        view="configuration"
        data={{
          sites: [
            { id: 's-b', normalizedHostname: 'portal-b.example', status: 'active', version: 1 },
            { id: 's-a', normalizedHostname: 'portal-a.example', status: 'active', version: 1 },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    const sebelum = screen.getAllByText(/portal-[ab]\.example/).map((el) => el.textContent);
    expect(sebelum).toEqual(['portal-b.example', 'portal-a.example']);
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Nama' }));
    const sesudah = screen.getAllByText(/portal-[ab]\.example/).map((el) => el.textContent);
    expect(sesudah).toEqual(['portal-a.example', 'portal-b.example']);
  });

  it('menampilkan bilah massal saat baris dipilih', async () => {
    const { toast } = await import('sonner');
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua baris halaman ini' }));
    expect(screen.getByText('1 baris terpilih')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Salin ID' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gagal menyalin ID terpilih.'));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByText('1 baris terpilih')).toBe(null);
  });

  it('menyembunyikan kolom status lewat pengalih kolom', () => {
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('active')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Alihkan kolom tabel' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Status' }));
    expect(screen.queryByText('active')).toBe(null);
    expect(screen.getByText('portal.example')).toBeDefined();
  });
});
