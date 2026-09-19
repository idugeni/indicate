// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { createRef } from 'react';

import { SoftBlueMobileSidebar } from '@/modules/site/components/network/templates/soft-blue/chrome/mobile-sidebar';

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
});

function pasang(terbuka: boolean, tutup = vi.fn()) {
  const rujukan = createRef<HTMLButtonElement>();
  render(
    <SoftBlueMobileSidebar open={terbuka} onClose={tutup} onFocusReturn={vi.fn()} closeRef={rujukan}>
      <Link href="/kanal">Kanal Uji</Link>
    </SoftBlueMobileSidebar>,
  );
  return tutup;
}

describe('SoftBlueMobileSidebar', () => {
  it('menyembunyikan konten saat tertutup', () => {
    pasang(false);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('menampilkan anak dan menutup lewat tombol tutup', () => {
    const tutup = pasang(true);
    expect(screen.getByRole('link', { name: 'Kanal Uji' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
    expect(tutup).toHaveBeenCalledTimes(1);
  });

  it('mengirim pencarian dan menavigasi', () => {
    const tutup = pasang(true);
    fireEvent.change(screen.getByLabelText('Cari berita'), { target: { value: 'banjir' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(dorong).toHaveBeenCalledWith('/search?q=banjir');
    expect(tutup).toHaveBeenCalled();
  });

  it('menutup lewat Escape', () => {
    const tutup = pasang(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(tutup).toHaveBeenCalledTimes(1);
  });
});
