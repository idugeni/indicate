// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { WarmEditorialLoadMore } from '@/modules/site/components/network/templates/warm-editorial/cards/load-more';

afterEach(() => {
  cleanup();
});

const articles = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeNetworkArticle({ id: `a-${index + 1}`, slug: `berita-${index + 1}`, title: `Berita ${index + 1}` }),
  );

describe('WarmEditorialLoadMore', () => {
  it('null untuk daftar kosong', () => {
    const { container } = render(<WarmEditorialLoadMore articles={[]} heading="Terkini" description="d" />);
    expect(container.firstChild).toBe(null);
  });

  it('membuka halaman 9 pertama lalu memuat sisanya', () => {
    render(<WarmEditorialLoadMore articles={articles(12)} heading="Terkini" description="d" />);
    expect(screen.getByRole('status')).toHaveTextContent('9/12');
    fireEvent.click(screen.getByRole('button', { name: /muat lebih banyak \(3 lagi\)/i }));
    expect(screen.getByRole('status')).toHaveTextContent('12/12');
    expect(screen.getByText(/anda telah melihat seluruh 12 liputan/i)).toBeDefined();
  });

  it('langsung tuntas bila kurang dari satu halaman', () => {
    render(<WarmEditorialLoadMore articles={articles(4)} heading="Terkini" description="d" />);
    expect(screen.queryByRole('button', { name: /muat lebih banyak/i })).toBe(null);
    expect(screen.getByText(/seluruh 4 liputan/i)).toBeDefined();
  });
});
