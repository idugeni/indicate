// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContentLibraryV2 } from '@/modules/dashboard/components/editorial/content-library-v2';

vi.mock('@/modules/dashboard/components/shared/use-dashboard-query', () => ({
  useDashboardPage: () => [1, vi.fn()],
}));

afterEach(() => cleanup());

const DATA = {
  articles: [
    {
      id: 'a-1',
      title: 'Banjir Wonosobo',
      slug: 'banjir-wonosobo',
      status: 'active',
      publishedAt: '2026-10-01T00:00:00Z',
      tags: ['bencana'],
      portalHostnames: ['fakta01.my.id'],
      version: 2,
    },
  ],
  total: 1,
  articlesNextCursor: null,
};

describe('ContentLibraryV2', () => {
  it('merenders inventory V2 dan filter server', async () => {
    const user = userEvent.setup();
    const onFilterApply = vi.fn();
    render(<ContentLibraryV2 data={DATA} onFilterApply={onFilterApply} />);

    expect(screen.getByRole('region', { name: 'Content Library' })).toBeDefined();
    expect(screen.getAllByText('Banjir Wonosobo').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Cari artikel'), 'apbd');
    await waitFor(
      () => expect(onFilterApply).toHaveBeenCalledWith('&sort=published-desc&search=apbd'),
      { timeout: 1500 },
    );
  });

  it('renders a compact mobile card alternative without relying on the wide table', () => {
    render(<ContentLibraryV2 data={DATA} />);
    expect(screen.getAllByText('Portal').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Ubah artikel Banjir Wonosobo' })).toHaveLength(2);
  });

  it('menggunakan hostname URL dan waktu tayang bridge ketika field utama kosong', () => {
    const data = {
      articles: [
        {
          id: 'bridge-1',
          organizationId: 'org-upt',
          orgName: 'RUTAN WONOSOBO',
          title: 'Berita Tayang dari Organisasi Lain',
          slug: 'berita-tayang',
          status: 'active',
          publishedAt: null,
          publishedAtMax: '2026-10-06T04:23:50.000Z',
          publishedUrls: [
            'https://portal-a.example/berita-tayang',
            'https://portal-b.example/berita-tayang',
          ],
          portalHostnames: [],
          version: 3,
        },
      ],
      total: 1,
      articlesNextCursor: null,
    };
    render(<ContentLibraryV2 data={data} crossOrg />);

    expect(screen.getByText('RUTAN WONOSOBO')).toBeDefined();
    expect(screen.getAllByText('Tayang').length).toBeGreaterThan(1);
    expect(screen.getByText('2 portal')).toBeDefined();
    expect(screen.queryByText('Belum tayang')).toBeNull();
  });

  it('membatasi navigasi pager pada halaman yang sudah dimuat oleh kursor', () => {
    const articles = Array.from({ length: 50 }, (_, index) => ({
      id: `a-${index}`,
      title: `Artikel ${index}`,
      slug: `artikel-${index}`,
      status: 'active',
      publishedAt: '2026-10-01T00:00:00Z',
      version: 1,
    }));
    render(
      <ContentLibraryV2
        data={{ articles, total: 100, articlesNextCursor: 'next-cursor' }}
        onLoadMoreArticles={vi.fn(async () => ({ loaded: 50, total: 100, nextCursor: null }))}
      />,
    );

    expect(screen.getByText('1 / 3')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Muat artikel lebih lama' })).toBeDefined();
  });

  it('mengalihkan edit ke Editorial Workspace dan mengarsipkan lewat command produksi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-1', version: 3 }));
    const onEditArticle = vi.fn();
    render(<ContentLibraryV2 data={DATA} command={command} onEditArticle={onEditArticle} />);

    await user.click(screen.getAllByRole('button', { name: 'Ubah artikel Banjir Wonosobo' })[0]!);
    expect(onEditArticle).toHaveBeenCalledWith('a-1');
    await user.click(screen.getAllByRole('button', { name: 'Arsipkan artikel Banjir Wonosobo' })[0]!);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'article.archive',
        { id: 'a-1', expectedVersion: 2 },
        { refresh: true },
      ),
    );
  });

  it('hanya me-refresh sekali setelah arsip massal', async () => {
    const command = vi.fn(async () => ({ ok: true }));
    const articles = [
      DATA.articles[0]!,
      {
        ...DATA.articles[0]!,
        id: 'a-2',
        title: 'Banjir Kendal',
        slug: 'banjir-kendal',
        version: 4,
      },
    ];
    render(<ContentLibraryV2 data={{ articles, total: 2 }} command={command} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih artikel halaman' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }));
    await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
    expect(command).toHaveBeenNthCalledWith(
      1,
      'article.archive',
      expect.objectContaining({ id: 'a-1' }),
      { refresh: false },
    );
    expect(command).toHaveBeenNthCalledWith(
      2,
      'article.archive',
      expect.objectContaining({ id: 'a-2' }),
      { refresh: true },
    );
  });

  it('mendukung pemilihan dan empty state', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ContentLibraryV2 data={DATA} />);

    await user.click(screen.getByRole('checkbox', { name: 'Pilih artikel halaman' }));
    expect(
      screen.getAllByRole('status').some((node) => node.textContent?.includes('1 terpilih')),
    ).toBe(true);
    unmount();
    render(<ContentLibraryV2 data={{ articles: [], total: 0 }} />);
    expect(screen.getByText('Tidak ada artikel yang cocok.')).toBeDefined();
  });
});
