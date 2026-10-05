// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { CommentCountBadge } from '@/modules/site/components/network/disqus/comment-count-badge';

afterEach(() => {
  cleanup();
});

describe('CommentCountBadge', () => {
  it('mengganti placeholder nol dengan label Indonesia', () => {
    render(<CommentCountBadge siteId="s1" articleId="a1" url="https://portal.contoh/a">0</CommentCountBadge>);
    expect(screen.getByText('belum ada komentar')).toBeDefined();
  });

  it('membiarkan hitungan bukan nol dari Disqus', async () => {
    render(<CommentCountBadge siteId="s1" articleId="a1" url="https://portal.contoh/a">5 Comments</CommentCountBadge>);
    await vi.waitFor(() => {
      expect(screen.getByText('5 Comments')).toBeDefined();
    });
  });

  it('menormalkan tulisan nol dari count.js menjadi label Indonesia', async () => {
    const { container } = render(<CommentCountBadge siteId="s1" articleId="a1" url="https://portal.contoh/a">0</CommentCountBadge>);
    const badge = container.querySelector('span');
    if (badge === null) throw new Error('badge tidak dirender');
    act(() => {
      badge.textContent = '0 Comments';
    });
    await vi.waitFor(() => {
      expect(screen.getByText('belum ada komentar')).toBeDefined();
    });
  });
});
