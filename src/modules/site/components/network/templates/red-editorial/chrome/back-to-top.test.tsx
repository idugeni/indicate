// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { RedEditorialBackToTop } from '@/modules/site/components/network/templates/red-editorial/chrome/back-to-top';
import { scrollToTop } from '@/ui/scroll';

vi.mock('@/ui/scroll', () => ({ scrollToTop: vi.fn() }));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  vi.mocked(scrollToTop).mockClear();
});

describe('RedEditorialBackToTop', () => {
  it('null sebelum menggulir jauh', () => {
    const { container } = render(<RedEditorialBackToTop />);
    expect(container.firstChild).toBe(null);
  });

  it('muncul setelah menggulir melewati ambang', () => {
    render(<RedEditorialBackToTop />);
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true, writable: true });
    fireEvent.scroll(window);
    expect(screen.getByRole('button', { name: 'Kembali ke atas' })).toBeDefined();
  });

  it('memanggil scrollToTop saat diklik', () => {
    render(<RedEditorialBackToTop />);
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true, writable: true });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke atas' }));
    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });
});
