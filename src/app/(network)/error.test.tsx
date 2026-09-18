// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import NetworkErrorPage from '@/app/(network)/error';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('Halaman galat jaringan', () => {
  it('menampilkan judul, ref digest, dan tombol coba lagi', () => {
    render(
      <NetworkErrorPage
        error={Object.assign(new Error('gagal'), { digest: 'jaringan-1' })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Halaman belum dapat dimuat')).toBeDefined();
    expect(screen.getByText('jaringan-1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined();
  });

  it('memanggil reset saat tombol coba lagi diklik', () => {
    const reset = vi.fn();
    render(
      <NetworkErrorPage
        error={Object.assign(new Error('gagal'), { digest: 'jaringan-2' })}
        reset={reset}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
