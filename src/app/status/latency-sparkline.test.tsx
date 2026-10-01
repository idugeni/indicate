// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { LatencySparkline } from '@/app/status/latency-sparkline';

describe('LatencySparkline', () => {
  it('mengembalikan null saat data kurang dari dua titik', () => {
    const { container } = render(
      <LatencySparkline points={[null, 12, null]} strokeClass="text-signal" label="Tren latensi Database" />,
    );
    expect(container.querySelector('svg')).toBe(null);
  });

  it('memutus garis pada hari tanpa data', () => {
    const { container } = render(
      <LatencySparkline points={[10, 20, null, 30, 40]} strokeClass="text-signal" label="Tren latensi Database" />,
    );
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('memberi nama aksesibel dan warna dari tone kartu', () => {
    const { container } = render(
      <LatencySparkline points={[10, 20, 30]} strokeClass="text-signal" label="Tren latensi Database" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Tren latensi Database');
    expect(svg?.getAttribute('class')).toContain('text-signal');
  });
});
