// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ArticleCategoryLabel } from '@/modules/site/components/network/ui/article-category-label';

afterEach(() => cleanup());

describe('ArticleCategoryLabel', () => {
  it('uses the single Berita fallback when category metadata is missing', () => {
    render(<ArticleCategoryLabel categoryName={null} categorySlug={null} />);
    expect(screen.getByText('Berita').tagName).toBe('SPAN');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links real global categories to their canonical archive', () => {
    render(<ArticleCategoryLabel categoryName="Hukum" categorySlug="hukum" />);
    expect(screen.getByRole('link', { name: 'Hukum' })).toHaveAttribute('href', '/categories/hukum');
  });

  it('uses the same fallback for blank category names', () => {
    render(<ArticleCategoryLabel categoryName="  " categorySlug={null} />);
    expect(screen.getByText('Berita')).toBeTruthy();
  });
});
