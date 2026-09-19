// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';

import { BlackLimeHeaderBar } from '@/modules/site/components/network/templates/black-lime/chrome/header-bar';

const dorong = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: dorong }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  dorong.mockClear();
  document.body.style.overflow = '';
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((tambat) => {
    tambat(0);
    return 0;
  });
});

function pasang() {
  return render(
    <BlackLimeHeaderBar
      brand={<span>Brand Uji</span>}
      nav={
        <nav aria-label="Nav uji">
          <Link href="/">Awal</Link>
        </nav>
      }
      sidebar={<Link href="/kanal">Kanal Uji</Link>}
    />,
  );
}

describe('BlackLimeHeaderBar', () => {
  it('menampilkan brand dan navigasi', () => {
    pasang();
    expect(screen.getByText('Brand Uji')).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Nav uji' })).toBeDefined();
  });

  it('membuka panel pencarian dan mengirim query', () => {
    pasang();
    fireEvent.click(screen.getByRole('button', { name: 'Cari berita' }));
    const masukan = screen.getByPlaceholderText('Ketik kata kunci…');
    fireEvent.change(masukan, { target: { value: 'banjir' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(dorong).toHaveBeenCalledWith('/search?q=banjir');
    const semuaTutup = screen.getAllByRole('button', { name: 'Tutup pencarian' });
    fireEvent.click(semuaTutup[semuaTutup.length - 1] as HTMLElement);
    expect(screen.queryByPlaceholderText('Ketik kata kunci…')).toBe(null);
  });

  it('membuka sidebar dan menutupnya', () => {
    pasang();
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
    expect(document.body.style.overflow).toBe('');
  });
});
