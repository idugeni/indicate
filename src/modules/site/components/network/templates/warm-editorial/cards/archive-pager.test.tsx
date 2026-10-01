// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { WarmEditorialArchivePager } from '@/modules/site/components/network/templates/warm-editorial/cards/archive-pager';

afterEach(() => {
  cleanup();
});

const articles = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeNetworkArticle({ id: `a-${index + 1}`, slug: `berita-${index + 1}`, title: `Berita ${index + 1}` }),
  );

describe('WarmEditorialArchivePager', () => {
  it('null untuk daftar kosong', () => {
    const { container } = render(<WarmEditorialArchivePager articles={[]} heading="Terkini" description="d" />);
    expect(container.firstChild).toBe(null);
  });

  it('satu halaman penuh tanpa navigasi', () => {
    render(<WarmEditorialArchivePager articles={articles(12)} heading="Terkini" description="d" />);
    expect(screen.getByRole('status')).toHaveTextContent('1–12/12');
    expect(screen.getByText('Berita 12')).toBeDefined();
    expect(screen.queryByRole('navigation')).toBe(null);
  });

  it('tanpa kendali bila kurang dari satu halaman', () => {
    render(<WarmEditorialArchivePager articles={articles(4)} heading="Terkini" description="d" />);
    expect(screen.queryByRole('navigation')).toBe(null);
    expect(screen.getByRole('status')).toHaveTextContent('1–4/4');
  });
});
