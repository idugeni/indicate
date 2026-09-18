// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import ErrorPage from '@/app/error';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('Halaman galat aplikasi', () => {
  it('menampilkan judul, ref digest, dan tombol coba lagi', () => {
    render(
      <ErrorPage
        error={Object.assign(new Error('gagal'), { digest: 'aplikasi-1' })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Halaman belum dapat dimuat')).toBeDefined();
    expect(screen.getByText('aplikasi-1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined();
  });

  it('memanggil reset saat tombol coba lagi diklik', () => {
    const reset = vi.fn();
    render(
      <ErrorPage
        error={Object.assign(new Error('gagal'), { digest: 'aplikasi-2' })}
        reset={reset}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
