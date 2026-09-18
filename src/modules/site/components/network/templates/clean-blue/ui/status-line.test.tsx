// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/ui/status-line';

afterEach(() => {
  cleanup();
});

describe('CleanBlueStatusLine', () => {
  it('mengumumkan nol artikel', () => {
    render(<CleanBlueStatusLine count={0} title="Beranda" />);
    expect(screen.getByRole('status').textContent).toBe('Tidak ada artikel pada Beranda.');
  });

  it('mengumumkan jumlah artikel tampil', () => {
    render(<CleanBlueStatusLine count={12} title="Kanal Bisnis" />);
    expect(screen.getByRole('status').textContent).toBe('Menampilkan 12 artikel pada Kanal Bisnis.');
  });
});
