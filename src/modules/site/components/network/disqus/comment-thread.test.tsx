// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { CommentThread } from '@/modules/site/components/network/disqus/comment-thread';

vi.mock('disqus-react', () => ({
  DiscussionEmbed: ({ shortname }: { readonly shortname: string }) => (
    <div data-testid="disqus-embed" data-shortname={shortname} />
  ),
}));

type IntersectionCallback = (entries: ReadonlyArray<{ readonly isIntersecting: boolean }>) => void;

const observers: Array<{ readonly callback: IntersectionCallback }> = [];

class FakeIntersectionObserver {
  readonly callback: IntersectionCallback;

  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    observers.push(this);
  }

  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

const PROPS = {
  siteId: 'site-a',
  articleId: 'art-1',
  url: 'https://portal.example/artikel-1',
  title: 'Judul artikel',
  locale: 'id-ID',
} as const;

const SHORTNAME = 'indicate-1';
const previousShortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;

function intersect(index: number): void {
  act(() => {
    observers[index]?.callback([{ isIntersecting: true }]);
  });
}

beforeEach(() => {
  observers.length = 0;
  process.env.NEXT_PUBLIC_DISQUS_SHORTNAME = SHORTNAME;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  delete window.DISQUS;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (previousShortname === undefined) delete process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
  else process.env.NEXT_PUBLIC_DISQUS_SHORTNAME = previousShortname;
  delete window.DISQUS;
});

describe('CommentThread', () => {
  it('tidak merender apa pun tanpa shortname forum', () => {
    delete process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
    const { container } = render(<CommentThread {...PROPS} />);
    expect(container.textContent).toBe('');
  });

  it('menyembunyikan embed di balik tombol sampai pembaca meminta', () => {
    render(<CommentThread {...PROPS} />);
    expect(screen.getByRole('button', { name: /tampilkan komentar/i })).toBeDefined();
    expect(screen.queryByTestId('disqus-embed')).toBeNull();
    expect(screen.queryByText('Memuat komentar…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /tampilkan komentar/i }));
    intersect(0);
    expect(screen.getByTestId('disqus-embed').getAttribute('data-shortname')).toBe(SHORTNAME);
  });

  it('tetap meminta klik saat browser tanpa IntersectionObserver', () => {
    vi.unstubAllGlobals();
    delete (window as unknown as Record<string, unknown>).IntersectionObserver;
    render(<CommentThread {...PROPS} />);
    expect(screen.getByRole('button', { name: /tampilkan komentar/i })).toBeDefined();
    expect(screen.queryByTestId('disqus-embed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /tampilkan komentar/i }));
    expect(screen.getByTestId('disqus-embed')).toBeDefined();
  });

  it('menampilkan fallback saat thread pihak ketiga tidak kunjung siap', () => {
    vi.useFakeTimers();
    render(<CommentThread {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /tampilkan komentar/i }));
    intersect(0);
    expect(screen.getByTestId('disqus-embed')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByText(/Komentar tidak dapat dimuat/)).toBeDefined();
  });

  it('tetap memuat thread saat Disqus siap sebelum batas waktu', () => {
    vi.useFakeTimers();
    render(<CommentThread {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /tampilkan komentar/i }));
    intersect(0);
    window.DISQUS = {};
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByTestId('disqus-embed')).toBeDefined();
    expect(screen.queryByText(/Komentar tidak dapat dimuat/)).toBeNull();
  });

  it('memasang ulang embed saat pembaca mencoba lagi', () => {
    vi.useFakeTimers();
    render(<CommentThread {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /tampilkan komentar/i }));
    intersect(0);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(screen.getByTestId('disqus-embed')).toBeDefined();
    expect(screen.queryByText(/Komentar tidak dapat dimuat/)).toBeNull();
  });
});
