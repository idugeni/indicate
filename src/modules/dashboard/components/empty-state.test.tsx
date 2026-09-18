// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { EmptyState } from '@/modules/dashboard/components/empty-state';

afterEach(() => {
  cleanup();
});

describe('EmptyState bawaan', () => {
  it('merender judul dan deskripsi default dengan role status', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Tidak ada rekaman data')).toBeDefined();
    expect(screen.getByText(/Tidak ditemukan entitas/)).toBeDefined();
  });
});

describe('EmptyState kustom', () => {
  it('merender judul, deskripsi, dan aksi kustom', () => {
    render(<EmptyState title="Belum ada undangan" description="Buat undangan dulu." action={<button type="button">Undang</button>} />);
    expect(screen.getByText('Belum ada undangan')).toBeDefined();
    expect(screen.getByText('Buat undangan dulu.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Undang' })).toBeDefined();
  });

  it('tidak merender slot aksi saat kosong', () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector('button')).toBe(null);
  });
});
