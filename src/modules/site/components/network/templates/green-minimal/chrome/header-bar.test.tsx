// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';

import { GreenMinimalHeaderBar } from '@/modules/site/components/network/templates/green-minimal/chrome/header-bar';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  pushMock.mockClear();
  document.body.style.overflow = '';
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
    frame(0);
    return 0;
  });
});

function mount() {
  return render(
    <GreenMinimalHeaderBar
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

describe('GreenMinimalHeaderBar', () => {
  it('menampilkan brand dan navigasi', () => {
    mount();
    expect(screen.getByText('Brand Uji')).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Nav uji' })).toBeDefined();
  });

  it('membuka panel pencarian dan mengirim query', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cari berita' }));
    const searchInput = screen.getByPlaceholderText('Ketik kata kunci…');
    fireEvent.change(searchInput, { target: { value: 'banjir' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(pushMock).toHaveBeenCalledWith('/search?q=banjir');
    const allCloseButtons = screen.getAllByRole('button', { name: 'Tutup pencarian' });
    fireEvent.click(allCloseButtons[allCloseButtons.length - 1] as HTMLElement);
    expect(screen.queryByPlaceholderText('Ketik kata kunci…')).toBe(null);
  });

  it('membuka sidebar dan menutupnya', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
    expect(document.body.style.overflow).toBe('');
  });
});
