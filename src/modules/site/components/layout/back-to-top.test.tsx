// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import { scrollToTop } from '@/ui/scroll';

vi.mock('@/ui/scroll', () => ({ scrollToTop: vi.fn() }));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  vi.mocked(scrollToTop).mockClear();
});

function gulirKe(bawah: number) {
  Object.defineProperty(window, 'scrollY', { value: bawah, configurable: true, writable: true });
  fireEvent.scroll(window);
}

describe('BackToTop', () => {
  it('tersembunyi saat di atas ambang', () => {
    render(<BackToTop />);
    expect(screen.getByRole('button', { name: /kembali ke atas/i }).className).toContain('opacity-0');
  });

  it('muncul setelah menggulir melewati ambang', async () => {
    render(<BackToTop />);
    gulirKe(500);
    const tombol = screen.getByRole('button', { name: /kembali ke atas/i });
    await waitFor(() => expect(tombol.className).toContain('opacity-100'));
    expect(tombol.getAttribute('aria-label')).toContain('halaman dibaca');
  });

  it('memanggil scrollToTop saat diklik', async () => {
    render(<BackToTop />);
    gulirKe(500);
    const tombol = screen.getByRole('button', { name: /kembali ke atas/i });
    await waitFor(() => expect(tombol.className).toContain('opacity-100'));
    fireEvent.click(tombol);
    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });
});
