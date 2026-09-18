// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import DashboardError from '@/app/(dashboard)/error';

afterEach(() => {
  cleanup();
});

describe('Batas galat dashboard', () => {
  it('menampilkan pesan aman dengan ref digest tanpa detail internal', () => {
    const reset = vi.fn();
    render(<DashboardError error={Object.assign(new Error('rahasia-dapur'), { digest: 'd-1' })} reset={reset} />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Ruang redaksi belum dapat dimuat')).toBeDefined();
    expect(screen.getByText('d-1')).toBeDefined();
    expect(screen.queryByText('rahasia-dapur')).toBe(null);
  });

  it('memanggil reset saat tombol coba lagi diklik', () => {
    const reset = vi.fn();
    render(<DashboardError reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
