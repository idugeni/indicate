// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import RootLoading from '@/app/loading';

afterEach(() => {
  cleanup();
});

describe('Fallback pemuatan tanpa brand', () => {
  it('tetap-ddapat diakses pembaca layar', () => {
    const { container } = render(<RootLoading />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toBe('Memuat');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('menutup layar penuh dan menghormati safe area', () => {
    const { container } = render(<RootLoading />);
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('fixed');
    expect(overlay?.className).toContain('inset-0');
    expect(overlay?.className).toContain('env(safe-area-inset-top)');
    expect(overlay?.className).toContain('env(safe-area-inset-left)');
  });

  it('tidak lagi memuat palet krem dan kuning tembaga dashboard', () => {
    const { container } = render(<RootLoading />);
    const markup = container.innerHTML;
    expect(markup).not.toContain('f4f2ec');
    expect(markup).not.toContain('b88d3a');
    expect(markup).not.toContain('e8d5a8');
  });

  it('menurunkan cincin dari token cangkang, bukan hex tenant', () => {
    const { container } = render(<RootLoading />);
    expect(container.querySelector('.bg-bg')).not.toBeNull();
    expect(container.querySelector('.text-paper')).not.toBeNull();
    expect(container.querySelector('.bg-current')).not.toBeNull();
  });
});
