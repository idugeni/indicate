// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PurpleEditorialBackToTop } from '@/modules/site/components/network/templates/purple-editorial/chrome/back-to-top';
import { scrollToTop } from '@/ui/scroll';

vi.mock('@/ui/scroll', () => ({ scrollToTop: vi.fn() }));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  vi.mocked(scrollToTop).mockClear();
});

describe('PurpleEditorialBackToTop', () => {
  it('null sebelum menggulir jauh', () => {
    const { container } = render(<PurpleEditorialBackToTop />);
    expect(container.firstChild).toBe(null);
  });

  it('muncul setelah menggulir melewati ambang', () => {
    render(<PurpleEditorialBackToTop />);
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true, writable: true });
    fireEvent.scroll(window);
    expect(screen.getByRole('button', { name: 'Kembali ke atas' })).toBeDefined();
  });

  it('memanggil scrollToTop saat diklik', () => {
    render(<PurpleEditorialBackToTop />);
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true, writable: true });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke atas' }));
    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });
});
