// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DocsNav } from '@/modules/docs/components/docs-nav';

const jalur = vi.hoisted(() => ({ saatIni: '/quickstart' }));

vi.mock('next/navigation', () => ({
  usePathname: () => jalur.saatIni,
}));

afterEach(() => {
  cleanup();
});

function masukanPencarian() {
  return screen.getAllByLabelText('Cari halaman dokumentasi')[0] as HTMLElement;
}

describe('DocsNav', () => {
  it('menampilkan halaman dan menandai yang aktif', () => {
    render(<DocsNav />);
    expect(screen.getByText('Mulai')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Mulai cepat' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Webhook generik' })).toBeDefined();
  });

  it('menyaring daftar sesuai kata kunci', () => {
    render(<DocsNav />);
    fireEvent.change(masukanPencarian(), { target: { value: 'webhook' } });
    expect(screen.getByRole('link', { name: 'Webhook generik' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Mulai cepat' })).toBe(null);
  });

  it('membuka dan menutup menu seluler', () => {
    render(<DocsNav />);
    const tombol = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(tombol);
    expect(screen.getByRole('button', { name: 'Tutup' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.getByRole('button', { name: 'Menu' })).toBeDefined();
  });
});
