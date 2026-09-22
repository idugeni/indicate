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
    { id: 's-1', normalizedHostname: 'wonosobo.fakta01.my.id', domainId: 'd-1' },
    { id: 's-2', normalizedHostname: 'semarang.fakta01.my.id', domainId: 'd-1' },
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

  it('menyalurkan ke seluruh situs domain setelah artikel dipilih', async () => {
    const { assign, container } = setup({});
    await selectArticle();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-1', 's-2'] }),
    );
  });

  it('mengecualikan situs saat domain tidak dicentang', async () => {
    const { assign, container } = setup({});
    await selectArticle();
    fireEvent.click(screen.getByRole('checkbox', { name: 'fakta01.my.id' }));
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: [] }),
    );
  });

  it('mengunci ke artikel prop tanpa pemilih', async () => {
    const { assign, container } = setup({ articleId: 'art-1' });
    expect(screen.queryByLabelText('Pilih Artikel Target')).toBeNull();
    expect(screen.getByText('Artikel Uji')).toBeDefined();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-1', 's-2'] }),
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
