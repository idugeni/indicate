// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { OrangeModernStatusLine } from '@/modules/site/components/network/templates/orange-modern/ui/status-line';

afterEach(() => {
  cleanup();
});

describe('OrangeModernStatusLine', () => {
  it('mengumumkan nol artikel', () => {
    render(<OrangeModernStatusLine count={0} title="Beranda" />);
    expect(screen.getByRole('status').textContent).toBe('Tidak ada artikel pada Beranda.');
  });

  it('mengumumkan jumlah artikel tampil', () => {
    render(<OrangeModernStatusLine count={12} title="Kanal Bisnis" />);
    expect(screen.getByRole('status').textContent).toBe('Menampilkan 12 artikel pada Kanal Bisnis.');
  });
});
