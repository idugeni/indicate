// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ChartContainer } from '@/components/ui/chart';

function mockDimensions(width: number, height: number) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

beforeEach(() => {
  mockDimensions(320, 200);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    expect(container.querySelector('[data-slot="chart-placeholder"]')).toBe(null);
  });

  it('menunda wadah responsif saat dimensi nol', () => {
    mockDimensions(0, 0);
    const { container } = render(
      <ChartContainer config={{}}>
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    expect(container.querySelector('[data-slot="chart-placeholder"]')).not.toBe(null);
    expect(container.querySelector('.recharts-responsive-container')).toBe(null);
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
