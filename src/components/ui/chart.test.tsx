// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ChartContainer } from '@/components/ui/chart';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => {
  cleanup();
});

describe('Wadah bagan', () => {
  it('merender slot bagan beserta wadah responsif', () => {
    const { container } = render(
      <ChartContainer config={{}}>
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    expect(container.querySelector('[data-slot="chart"]')).not.toBe(null);
    expect(
      container.querySelector('[data-slot="chart"]')?.getAttribute('data-chart'),
    ).not.toBe(null);
    expect(container.querySelector('.recharts-responsive-container')).not.toBe(null);
  });

  it('merender gaya saat konfigurasi berwarna', () => {
    const { container } = render(
      <ChartContainer config={{ kunjungan: { label: 'Kunjungan', color: '#123456' } }}>
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    expect(container.querySelector('style')).not.toBe(null);
  });

  it('membuang warna jahat dari blok gaya', () => {
    const { container } = render(
      <ChartContainer
        config={{ aman: { label: 'Aman', color: '#123456' }, jahat: { label: 'Jahat', color: 'red; } .x{color:blue' } }}
      >
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('--color-aman: #123456;');
    expect(css).not.toContain('--color-jahat');
    expect(css).not.toContain('.x{color:blue');
  });

  it('melewatkan blok gaya saat id tidak aman', () => {
    const { container } = render(
      <ChartContainer
        id={'a] [data-x'}
        config={{ kunjungan: { label: 'Kunjungan', color: '#123456' } }}
      >
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    expect(container.querySelector('style')).toBe(null);
  });
});
