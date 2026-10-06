// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import PublicLoading from '@/app/(network)/loading';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

afterEach(() => {
  cleanup();
});

describe('Fallback pemuatan jaringan', () => {
  it('menutup layar penuh dengan canvas terang, bukan null', async () => {
    render(await PublicLoading());
    const overlay = screen.getByRole('status');
    expect(overlay.getAttribute('aria-busy')).toBe('true');
    expect(overlay.getAttribute('aria-label')).toBe('Memuat');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
    expect(overlay.style.backgroundColor).toBe('rgb(245, 248, 253)');
  });

  it('tidak memakai token gelap cangkang utama', async () => {
    const { container } = render(await PublicLoading());
    const markup = container.innerHTML;
    expect(markup).not.toContain('0e1320');
    expect(markup).not.toContain('bg-bg');
    expect(markup).not.toContain('text-paper');
  });
});
