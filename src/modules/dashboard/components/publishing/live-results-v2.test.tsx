// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LiveResultsV2 } from '@/modules/dashboard/components/publishing/live-results-v2';

vi.mock('@/modules/dashboard/components/shared/use-dashboard-query', () => ({
  useDashboardPage: () => [1, vi.fn()],
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DATA = {
  total: 2,
  articles: [
    {
      id: 'a-1',
      title: 'Berita Pertama',
      slug: 'berita-pertama',
      publishedAt: '2026-10-08T10:00:00Z',
      publishedUrls: [
        'https://portal-a.example/berita-pertama',
        'https://portal-a2.example/berita-pertama',
      ],
      orgName: 'RUTAN WONOSOBO',
    },
    {
      id: 'a-2',
      title: 'Berita Kedua',
      slug: 'berita-kedua',
      publishedAt: '2026-10-08T09:00:00Z',
      publishedUrls: ['https://portal-b.example/berita-kedua'],
    },
  ],
};

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  return writeText;
}

describe('LiveResultsV2', () => {
  it('menampilkan control tower dan hasil terbaru', () => {
    render(<LiveResultsV2 data={DATA} crossOrg />);
    expect(screen.getByText('Live Results Control Tower')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Live Results', level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Berita Pertama' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('https://portal-a.example/berita-pertama')).toBeNull();
    expect(screen.getByText('Organisasi pemilik: RUTAN WONOSOBO')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salin berurutan Berita Pertama' })).toBeTruthy();
  });

  it('menghapus fitur preview dan tidak memanggil endpoint readiness', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LiveResultsV2 data={DATA} />);
    expect(screen.queryByRole('button', { name: /preview/i })).toBeNull();
    expect(screen.queryByText(/preview siap|belum siap|perlu perhatian/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menyalin hanya seluruh URL milik satu artikel secara berurutan tanpa judul artikel', async () => {
    const writeText = mockClipboard();
    render(<LiveResultsV2 data={DATA} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salin berurutan Berita Pertama' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '1. https://portal-a.example/berita-pertama\n2. https://portal-a2.example/berita-pertama',
      ),
    );
    expect(writeText.mock.calls[0]?.[0]).not.toContain('portal-b.example');
    expect(
      screen
        .getAllByRole('status')
        .some((node) => node.textContent?.includes('URL artikel ini disalin berurutan')),
    ).toBe(true);
  });
  it('mengacak URL tetapi tetap menomori daftar untuk WhatsApp', async () => {
    const writeText = mockClipboard();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<LiveResultsV2 data={DATA} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salin acak Berita Pertama' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '1. https://portal-a2.example/berita-pertama\n2. https://portal-a.example/berita-pertama',
      ),
    );
    const copied = writeText.mock.calls[0]?.[0] ?? '';
    expect(copied).not.toContain('Berita Pertama');
    expect(copied).not.toContain('Berita Kedua');
    expect(copied).not.toContain('portal-b.example');
  });

  it('menampilkan kontrol copy pada tiap artikel tanpa menampilkan daftar URL panjang', () => {
    render(<LiveResultsV2 data={DATA} />);
    expect(screen.getByRole('button', { name: 'Salin berurutan Berita Pertama' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salin acak Berita Kedua' })).toBeTruthy();
    expect(screen.queryByText('https://portal-a.example/berita-pertama')).toBeNull();
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });

  it('membatasi daftar Live Results menjadi 20 artikel per halaman', () => {
    const articles = Array.from({ length: 25 }, (_, index) => ({
      id: `article-${index}`,
      title: `Artikel ${index}`,
      slug: `artikel-${index}`,
      publishedAt: '2026-10-08T10:00:00Z',
      publishedUrls: [`https://portal.example/artikel-${index}`],
    }));
    render(<LiveResultsV2 data={{ articles, total: 25 }} />);
    expect(screen.getAllByRole('button', { name: /^Salin berurutan Artikel / })).toHaveLength(20);
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });
  it('menyalin hanya URL dari hasil yang cocok dengan pencarian', async () => {
    const writeText = mockClipboard();
    render(<LiveResultsV2 data={DATA} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Cari hasil distribusi' }), {
      target: { value: 'Berita Kedua' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salin berurutan Berita Kedua' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('1. https://portal-b.example/berita-kedua'),
    );
  });
});
