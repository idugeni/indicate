// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { CountUp } from '@/app/status/count-up';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMatchMedia(reduced: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('CountUp', () => {
  it('menampilkan final langsung saat reduced motion', async () => {
    stubMatchMedia(true);
    render(<CountUp value={99.9} decimals={2} suffix="%" />);
    await waitFor(() => expect(screen.getByText('99.90%')).toBeDefined());
  });

  it('mulai dari nol lalu butuh frame untuk tiba', () => {
    stubMatchMedia(false);
    render(<CountUp value={219} decimals={0} suffix=" ms" />);
    expect(screen.getByText('0 ms')).toBeDefined();
  });
});
