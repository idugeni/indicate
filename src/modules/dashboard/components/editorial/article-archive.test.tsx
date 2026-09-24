// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleArchive } from '@/modules/dashboard/components/editorial/article-archive';

afterEach(() => {
  cleanup();
});

const DATA = {
  articles: [
    { id: 'a-1', title: 'Banjir Wonosobo', slug: 'banjir-wonosobo', status: 'active', publishedAt: '2026-09-20T00:00:00.000Z', tags: ['bencana', 'wonosobo'], categoryIds: ['c-1'], regionId: 'r-1' },
    { id: 'a-2', title: 'APBD Jateng', slug: 'apbd-jateng', status: 'draft', publishedAt: null, tags: ['ekonomi'], categoryIds: [], regionId: 'r-1' },
  ],
  categories: [{ id: 'c-1', name: 'Bencana' }],
  sites: [{ id: 's-1', normalizedHostname: 'fakta01.my.id' }],
  articleSites: [{ articleId: 'a-1', siteId: 's-1', active: true }],
};

describe('ArticleArchive', () => {
  it('menampilkan semua artikel lintas portal', () => {
    render(<ArticleArchive data={DATA} />);
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    expect(screen.getAllByText('fakta01.my.id')).toHaveLength(1);
    expect(screen.getByText('1–2 dari 2')).toBeDefined();
  });

  it('menyaring lewat cari dan kategori', async () => {
    const user = userEvent.setup();
    render(<ArticleArchive data={DATA} />);
    await user.type(screen.getByLabelText('Cari judul/slug'), 'apbd');
    expect(screen.queryByText('Banjir Wonosobo')).toBeNull();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    await user.clear(screen.getByLabelText('Cari judul/slug'));
    await user.click(screen.getByLabelText('Kategori'));
    await user.click(await screen.findByRole('option', { name: 'Bencana' }));
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.queryByText('APBD Jateng')).toBeNull();
  });

  it('menampilkan status kosong yang ramah', () => {
    render(<ArticleArchive data={{ articles: [], categories: [], sites: [], articleSites: [] }} />);
    expect(screen.getByText(/Tidak ada artikel yang cocok/)).toBeDefined();
  });
});
