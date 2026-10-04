// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { TemplateArchivePager, archivePageRange } from '@/modules/site/components/network/ui/archive-pager';

afterEach(() => {
  cleanup();
});

const articles = (count: number) =>
  Array.from({ length: count }, (slot, index) =>
    makeNetworkArticle({ id: `a-${index + 1}`, slug: `berita-${index + 1}`, title: `Berita ${index + 1}` }),
  );

const renderPager = (count: number) =>
  render(
    <TemplateArchivePager
      articles={articles(count)}
      label="Arsip Berita"
      header={<span>Arsip Berita</span>}
      renderCard={(article, index) => (
        <span key={article.id}>{`${index}. ${article.title}`}</span>
      )}
    />,
  );

describe('archivePageRange', () => {
  it('kosong tanpa halaman', () => {
    expect(archivePageRange(0, 9, 0)).toEqual({ page: 0, pageCount: 0, start: 0, end: 0 });
  });

  it('menjepit halaman basi ke halaman terakhir', () => {
    expect(archivePageRange(10, 9, 7)).toEqual({ page: 1, pageCount: 2, start: 10, end: 10 });
    expect(archivePageRange(10, 9, -3)).toEqual({ page: 0, pageCount: 2, start: 1, end: 9 });
  });

  it('halaman utuh tidak membuka halaman kosong', () => {
    expect(archivePageRange(18, 9, 5)).toEqual({ page: 1, pageCount: 2, start: 10, end: 18 });
  });

  it('ukuran halaman di bawah satu dianggap satu', () => {
    expect(archivePageRange(3, 0, 0)).toEqual({ page: 0, pageCount: 3, start: 1, end: 1 });
  });
});

describe('TemplateArchivePager', () => {
  it('null untuk daftar kosong', () => {
    const { container } = render(
      <TemplateArchivePager
        articles={[]}
        label="Arsip Berita"
        header={<span>Arsip Berita</span>}
        renderCard={(article) => <span key={article.id}>{article.title}</span>}
      />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('tanpa kendali bila kurang dari satu halaman', () => {
    renderPager(4);
    expect(screen.queryByRole('navigation')).toBe(null);
    expect(screen.getByRole('status')).toHaveTextContent('1–4/4');
  });

  it('berpindah halaman dan menomori kartu secara global', () => {
    renderPager(20);
    expect(screen.getByRole('status')).toHaveTextContent('1–9/20');
    expect(screen.getAllByText(/^\d+\. Berita \d+$/)).toHaveLength(9);
    expect(screen.getByText('1. Berita 1')).toBeDefined();
    expect(screen.queryByText('10. Berita 10')).toBe(null);

    fireEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
    expect(screen.getByRole('status')).toHaveTextContent('10–18/20');
    expect(screen.getAllByText(/^\d+\. Berita \d+$/)).toHaveLength(9);
    expect(screen.getByText('10. Berita 10')).toBeDefined();
    expect(screen.getByText('Halaman 2 dari 3')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
    expect(screen.getByRole('status')).toHaveTextContent('19–20/20');
    expect(screen.getAllByText(/^\d+\. Berita \d+$/)).toHaveLength(2);
    expect(screen.getByText('20. Berita 20')).toBeDefined();
    expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /sebelumnya/i }));
    expect(screen.getByRole('status')).toHaveTextContent('10–18/20');
  });

  it('menjepit halaman saat daftar menyusut', () => {
    const { rerender } = renderPager(20);
    fireEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
    expect(screen.getByRole('status')).toHaveTextContent('10–18/20');

    rerender(
      <TemplateArchivePager
        articles={articles(11)}
        label="Arsip Berita"
        header={<span>Arsip Berita</span>}
        renderCard={(article, index) => <span key={article.id}>{`${index}. ${article.title}`}</span>}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('10–11/11');
    expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled();
  });

  it('memindahkan fokus ke bagian arsip saat halaman berubah', () => {
    renderPager(20);
    const section = screen.getByRole('region', { name: 'Arsip Berita' });
    expect(section).not.toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
    expect(section).toHaveFocus();
  });
});
