// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import GlobalError from '@/app/global-error';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('Halaman galat global', () => {
  it('menampilkan judul, ref digest, dan tombol coba lagi', () => {
    render(
      <GlobalError
        error={Object.assign(new Error('gagal'), { digest: 'global-1' })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Layanan tidak tersedia')).toBeDefined();
    expect(screen.getByText('global-1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined();
  });

  it('memanggil reset saat tombol coba lagi diklik', () => {
    const reset = vi.fn();
    render(
      <GlobalError
        error={Object.assign(new Error('gagal'), { digest: 'global-2' })}
        reset={reset}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
