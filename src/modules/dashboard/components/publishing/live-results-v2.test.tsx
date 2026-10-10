// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LiveResultsV2 } from '@/modules/dashboard/components/publishing/live-results-v2';

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
      publishedUrls: ['https://portal-a.example/berita-pertama'],
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
    render(<LiveResultsV2 data={DATA} />);
    expect(screen.getByText('Live Results Control Tower')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Live Results', level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Berita Pertama' }).length).toBeGreaterThan(0);
    expect(screen.getByText('https://portal-a.example/berita-pertama')).toBeTruthy();
  });

  it('menghapus fitur preview dan tidak memanggil endpoint readiness', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LiveResultsV2 data={DATA} />);
    expect(screen.queryByRole('button', { name: /preview/i })).toBeNull();
    expect(screen.queryByText(/preview siap|belum siap|perlu perhatian/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menyalin semua URL dalam urutan hasil tanpa judul artikel', async () => {
    const writeText = mockClipboard();
    render(<LiveResultsV2 data={DATA} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salin berurutan' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '1. https://portal-a.example/berita-pertama\n2. https://portal-b.example/berita-kedua',
      ),
    );
    expect(screen.getByRole('status').textContent).toContain('siap ditempel ke WhatsApp');
  });

  it('mengacak URL tetapi tetap menomori daftar untuk WhatsApp', async () => {
    const writeText = mockClipboard();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<LiveResultsV2 data={DATA} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salin acak' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '1. https://portal-b.example/berita-kedua\n2. https://portal-a.example/berita-pertama',
      ),
    );
    const copied = writeText.mock.calls[0]?.[0] ?? '';
    expect(copied).not.toContain('Berita Pertama');
    expect(copied).not.toContain('Berita Kedua');
  });

  it('memuat seluruh halaman server sebelum menyalin semua URL', async () => {
    const writeText = mockClipboard();
    const onLoadMoreArticles = vi.fn(async (cursor?: string | null) => {
      expect(cursor).toBe('cursor-1');
      return {
        loaded: 3,
        total: 3,
        nextCursor: null,
        articles: [
          ...DATA.articles,
          {
            id: 'a-3',
            title: 'Berita Ketiga',
            slug: 'berita-ketiga',
            publishedAt: '2026-10-08T08:00:00Z',
            publishedUrls: ['https://portal-c.example/berita-ketiga'],
          },
        ],
        articleSites: [],
        bridgePublished: [],
      };
    });
    render(
      <LiveResultsV2
        data={{ ...DATA, articlesNextCursor: 'cursor-1' }}
        articlesTotal={3}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salin berurutan' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '1. https://portal-a.example/berita-pertama\n2. https://portal-b.example/berita-kedua\n3. https://portal-c.example/berita-ketiga',
      ),
    );
    expect(onLoadMoreArticles).toHaveBeenCalledTimes(1);
  });

  it('menyalin hanya URL dari hasil yang cocok dengan pencarian', async () => {
    const writeText = mockClipboard();
    render(<LiveResultsV2 data={DATA} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Cari hasil distribusi' }), {
      target: { value: 'Berita Kedua' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salin berurutan' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('1. https://portal-b.example/berita-kedua'),
    );
  });
});
