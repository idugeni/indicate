// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { BentoUtamaLoading, GaleriTelemetriLoading } from '@/modules/dashboard/components/analytics/bento-skeletons';

afterEach(() => {
  cleanup();
});

describe('Skeleton bento utama', () => {
  it('merender 20 kartu seukuran aslinya dalam grid bento yang sama', () => {
    const { container } = render(<BentoUtamaLoading />);
    const bento = screen.getByLabelText('Memuat dasbor utama');
    expect(bento.className).toContain('lg:grid-cols-12');
    expect(bento.className).toContain('col-span-full');
    const kartu = within(bento).getAllByRole('status');
    expect(kartu).toHaveLength(20);
    for (const sel of kartu) {
      expect(sel.getAttribute('aria-busy')).toBe('true');
      expect(sel.className).toContain('h-full');
    }
    expect(container.firstChild).toBe(bento);
  });
});

describe('Skeleton galeri telemetri', () => {
  it('merender 15 kartu mengikuti susunan galeri', () => {
    render(<GaleriTelemetriLoading />);
    const galeri = screen.getByLabelText('Memuat statistik');
    expect(within(galeri).getAllByRole('status')).toHaveLength(15);
  });
});
