// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

import { ChartContainer } from '@/components/ui/chart';

const RESIZE_DEBOUNCE_MS = 50;

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
  vi.useFakeTimers();
  mockDimensions(320, 200);
});

afterEach(() => {
  cleanup();
  // recharts throttles the ResizeObserver callback with `leading: false`, so each
  // render leaves a timer pending. Draining it after unmount but before vitest tears
  // the jsdom environment down keeps the trailing call from touching a deleted
  // `window`, which surfaces as an unhandled ReferenceError and fails the shard.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
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

  it('menyerap timer throttle bagan sebelum lingkungan dibongkar', () => {
    render(
      <ChartContainer config={{}}>
        <p>Isi bagan</p>
      </ChartContainer>,
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS + 10);
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
