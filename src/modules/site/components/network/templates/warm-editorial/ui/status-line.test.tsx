// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { WarmEditorialStatusLine } from '@/modules/site/components/network/templates/warm-editorial/ui/status-line';

afterEach(() => {
  cleanup();
});

describe('WarmEditorialStatusLine', () => {
  it('mengumumkan nol artikel', () => {
    render(<WarmEditorialStatusLine count={0} title="Beranda" />);
    expect(screen.getByRole('status').textContent).toBe('Tidak ada artikel pada Beranda.');
  });

  it('mengumumkan jumlah artikel tampil', () => {
    render(<WarmEditorialStatusLine count={12} title="Kanal Bisnis" />);
    expect(screen.getByRole('status').textContent).toBe('Menampilkan 12 artikel pada Kanal Bisnis.');
  });
});
