// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { CommentCountBadge, CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { CommentTargetProvider } from '@/modules/site/components/network/disqus/comment-target';
import type { NetworkSiteData } from '@/modules/delivery/models';

const site = {
  context: { siteId: 's1', normalizedHostname: 'portal.contoh' },
  settings: { commentsEnabled: true },
} as unknown as NetworkSiteData;

function renderSlot(href = '/a') {
  return render(
    <CommentTargetProvider site={site}>
      <CommentCountSlot articleId="a1" href={href} className="slot" />
    </CommentTargetProvider>,
  );
}

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

describe('CommentCountSlot', () => {
  it('tersembunyi saat hitungan masih nol agar listing bersih', () => {
    const { container } = renderSlot();
    const slot = container.querySelector('.slot') as HTMLElement | null;
    if (slot === null) throw new Error('slot tidak dirender');
    expect(slot.style.display).toBe('none');
  });

  it('tetap tersembunyi saat Disqus melaporkan nol', async () => {
    const { container } = renderSlot();
    const slot = container.querySelector('.slot') as HTMLElement | null;
    const badge = container.querySelector('.disqus-comment-count');
    if (slot === null || badge === null) throw new Error('slot tidak dirender');
    act(() => {
      badge.textContent = '0 Comments';
    });
    await vi.waitFor(() => {
      expect(slot.style.display).toBe('none');
    });
  });

  it('muncul saat Disqus melaporkan hitungan positif', async () => {
    const { container } = renderSlot();
    const slot = container.querySelector('.slot') as HTMLElement | null;
    const badge = container.querySelector('.disqus-comment-count');
    if (slot === null || badge === null) throw new Error('slot tidak dirender');
    act(() => {
      badge.textContent = '5 Comments';
    });
    await vi.waitFor(() => {
      expect(slot.style.display).not.toBe('none');
      expect(screen.getByText('5 Comments')).toBeDefined();
    });
  });
});
