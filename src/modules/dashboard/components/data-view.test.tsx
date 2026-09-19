// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DataView } from '@/modules/dashboard/components/data-view';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

const DASBOR = {
  activeDomains: 2,
  activeSites: 1,
  activeArticles: 0,
  archivedArticles: 0,
  activeMedia: 0,
  successfulSiteOutcomes: 1,
  failedSiteOutcomes: 1,
  jobsByState: { queued: 2, published: 1 },
};

describe('Tampilan data dasbor', () => {
  it('merender metrik, panduan, antrean, dan kesehatan', () => {
    const pilih = vi.fn();
    render(
      <DataView view="dashboard" data={DASBOR} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} onSelectView={pilih} />,
    );
    expect(screen.getByText('Domain Aktif')).toBeDefined();
    expect(screen.getByText('Panduan mulai cepat')).toBeDefined();
    expect(screen.getByText('Antrean penerbitan per status')).toBeDefined();
    expect(screen.getByText('Kesehatan penyaluran')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /tulis artikel/i }));
    expect(pilih).toHaveBeenCalledWith('editorial');
  });

  it('menampilkan panduan penuh saat data kosong', () => {
    render(<DataView view="dashboard" data={{}} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByText(/0 dari 4 selesai/)).toBeDefined();
    expect(screen.getByText(/Belum ada hasil penyaluran/)).toBeDefined();
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
});
