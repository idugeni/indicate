// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { GlassyBlueStatusLine } from '@/modules/site/components/network/templates/glassy-blue/ui/status-line';

afterEach(() => {
  cleanup();
});

describe('GlassyBlueStatusLine', () => {
  it('mengumumkan nol artikel', () => {
    render(<GlassyBlueStatusLine count={0} title="Beranda" />);
    expect(screen.getByRole('status').textContent).toBe('Tidak ada artikel pada Beranda.');
  });

  it('mengumumkan jumlah artikel tampil', () => {
    render(<GlassyBlueStatusLine count={12} title="Kanal Bisnis" />);
    expect(screen.getByRole('status').textContent).toBe('Menampilkan 12 artikel pada Kanal Bisnis.');
  });
});
