// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { RedEditorialArchivePager } from '@/modules/site/components/network/templates/red-editorial/cards/archive-pager';

afterEach(() => {
  cleanup();
});

const articles = (count: number) =>
  Array.from({ length: count }, (slot, index) =>
    makeNetworkArticle({ id: `a-${index + 1}`, slug: `berita-${index + 1}`, title: `Berita ${index + 1}` }),
  );

describe('RedEditorialArchivePager', () => {
  it('null untuk daftar kosong', () => {
    const { container } = render(<RedEditorialArchivePager articles={[]} heading="Terkini" description="d" />);
    expect(container.firstChild).toBe(null);
  });

  it('satu halaman penuh tanpa navigasi', () => {
    render(<RedEditorialArchivePager articles={articles(12)} heading="Terkini" description="d" />);
    expect(screen.getByRole('status')).toHaveTextContent('1–12/12');
    expect(screen.getByText('Berita 12')).toBeDefined();
    expect(screen.queryByRole('navigation')).toBe(null);
  });

  it('tanpa kendali bila kurang dari satu halaman', () => {
    render(<RedEditorialArchivePager articles={articles(4)} heading="Terkini" description="d" />);
    expect(screen.queryByRole('navigation')).toBe(null);
    expect(screen.getByRole('status')).toHaveTextContent('1–4/4');
  });
});
