// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleDistributeForm } from '@/modules/dashboard/components/editorial/article-distribute-form';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

afterEach(() => {
  cleanup();
});

const DATA = {
  domains: [{ id: 'd-1', normalizedHostname: 'fakta01.my.id' }],
  sites: [
    { id: 's-0', normalizedHostname: 'fakta01.my.id', domainId: 'd-1' },
    { id: 's-1', normalizedHostname: 'wonosobo.fakta01.my.id', domainId: 'd-1', regionId: 'r-1' },
    { id: 's-2', normalizedHostname: 'semarang.fakta01.my.id', domainId: 'd-1', regionId: 'r-1' },
  ],
  articles: [{ id: 'art-1', title: 'Artikel Uji' }],
  articleSites: [{ articleId: 'art-1', siteId: 's-1' }],
};

function setup(overrides: {
  assign?: (payload: unknown) => Promise<unknown>;
  articleId?: string;
}) {
  const assign = vi.fn(async (payload: unknown) => (overrides.assign ? overrides.assign(payload) : null));
  const cmd = vi.fn(async () => ({}));
  const { container } = render(
    <ArticleDistributeForm data={DATA} onAssign={assign} command={cmd} articleId={overrides.articleId} />,
  );
  return { assign, cmd, container };
}

async function selectArticle() {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Pilih Artikel Target'));
  await user.click(await screen.findByRole('option', { name: 'Artikel Uji' }));
}

describe('Formulir penyaluran artikel', () => {
  it('merender panel penyaluran tanpa pilihan diam-diam', () => {
    setup({});
    expect(screen.getByText('Penyaluran Artikel')).toBeDefined();
    expect((screen.getByLabelText('Pilih Artikel Target') as HTMLInputElement).value).toBe('');
  });

  it('menolak menyalurkan sebelum artikel dipilih eksplisit', async () => {
    const { assign, container } = setup({});
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(assign).not.toHaveBeenCalled());
  });

  it('menyalurkan hanya ke portal apex domain setelah artikel dipilih', async () => {
    const { assign, container } = setup({});
    await selectArticle();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-0'] }),
    );
  });

  it('menyatakan portal turunan diwarisi, bukan dipilih', () => {
    setup({});
    fireEvent.click(screen.getByRole('button', { name: /lihat 3 portal/i }));
    expect(screen.getAllByText('fakta01.my.id').length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => content.includes('portal region')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => content.includes('menampilkan artikel ini otomatis')).length).toBeGreaterThan(0);
  });

  it('mengecualikan situs saat domain tidak dicentang', async () => {
    const { assign, container } = setup({});
    await selectArticle();
    fireEvent.click(screen.getByRole('checkbox', { name: 'fakta01.my.id' }));
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(assign).not.toHaveBeenCalled());
  });

  it('mengunci ke artikel prop tanpa pemilih', async () => {
    const { assign, container } = setup({ articleId: 'art-1' });
    expect(screen.queryByLabelText('Pilih Artikel Target')).toBeNull();
    expect(screen.getByText('Artikel Uji')).toBeDefined();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-0'] }),
    );
  });

  it('menyimpan jumlah tayang ke situs tersalurkan saja', async () => {
    const { cmd, container } = setup({});
    await selectArticle();
    fireEvent.change(screen.getByLabelText(/Jumlah tayang/), { target: { value: '250' } });
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('article.sites.views.set', { articleId: 'art-1', siteId: 's-1', viewCount: 250 }),
    );
    expect(cmd).toHaveBeenCalledTimes(1);
  });
});

describe('Penyaluran artikel pada jaringan besar', () => {
  const BIG = {
    domains: [
      { id: 'd-1', normalizedHostname: 'fakta01.my.id' },
      { id: 'd-2', normalizedHostname: 'fakta02.my.id' },
    ],
    sites: [
      { id: 's-apex-1', normalizedHostname: 'fakta01.my.id', domainId: 'd-1' },
      { id: 's-apex-2', normalizedHostname: 'fakta02.my.id', domainId: 'd-2' },
      ...Array.from({ length: 198 }, (_, index) => ({
        id: `s-${index}`,
        normalizedHostname: `kota-${index}.${index < 99 ? 'fakta01' : 'fakta02'}.my.id`,
        domainId: index < 99 ? 'd-1' : 'd-2',
        regionId: 'r-1',
      })),
    ],
    articles: [{ id: 'art-1', title: 'Artikel Uji' }],
    articleSites: [],
  };

  function renderBig() {
    const assign = vi.fn(async () => null);
    const { container } = render(<ArticleDistributeForm data={BIG} onAssign={assign} command={vi.fn(async () => ({}))} articleId="art-1" />);
    return { assign, form: container.querySelectorAll('form')[0] as HTMLFormElement };
  }

  it('tidak memasang daftar portal per domain sampai barisnya dibuka', () => {
    renderBig();
    expect(document.querySelectorAll('li')).toHaveLength(0);
    expect(document.querySelectorAll('input[name="siteIds"]')).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('button', { name: /lihat 100 portal/i })[0]!);
    expect(document.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /sembunyikan/i }).getAttribute('aria-expanded')).toBe('true');
  });

  it('menyaring domain dan hanya menyalurkan yang cocok', async () => {
    const { assign, form } = renderBig();
    expect(screen.getByText('2 dari 2 domain · 2 situs terpilih')).toBeDefined();
    fireEvent.change(screen.getByLabelText(/cari domain tujuan/i), { target: { value: 'fakta02' } });
    fireEvent.click(screen.getByRole('button', { name: /pilih semua yang cocok/i }));
    expect(screen.getByText('1 dari 2 domain · 1 situs terpilih')).toBeDefined();
    fireEvent.submit(form);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-apex-2'] }),
    );
  });

  it('mengembalikan seluruh domain lewat tombol pilih semuanya', async () => {
    const { assign, form } = renderBig();
    fireEvent.click(screen.getByRole('checkbox', { name: 'fakta01.my.id' }));
    expect(screen.getByText('2 dari 2 domain · 1 situs terpilih')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /pilih semuanya/i }));
    fireEvent.submit(form);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-apex-1', 's-apex-2'] }),
    );
  });
});
