// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { createRef } from 'react';

import { OrangeModernMobileSidebar } from '@/modules/site/components/network/templates/orange-modern/chrome/mobile-sidebar';

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
});

function mount(isOpen: boolean, handleClose = vi.fn()) {
  const buttonRef = createRef<HTMLButtonElement>();
  render(
    <OrangeModernMobileSidebar open={isOpen} onClose={handleClose} onFocusReturn={vi.fn()} closeRef={buttonRef}>
      <Link href="/kanal">Kanal Uji</Link>
    </OrangeModernMobileSidebar>,
  );
  return handleClose;
}

describe('OrangeModernMobileSidebar', () => {
  it('menyembunyikan konten saat tertutup', () => {
    mount(false);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('menampilkan anak dan menutup lewat tombol tutup', () => {
    const handleClose = mount(true);
    expect(screen.getByRole('link', { name: 'Kanal Uji' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('mengirim pencarian dan menavigasi', () => {
    const handleClose = mount(true);
    fireEvent.change(screen.getByLabelText('Cari berita'), { target: { value: 'banjir' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(pushMock).toHaveBeenCalledWith('/search?q=banjir');
    expect(handleClose).toHaveBeenCalled();
  });

  it('menutup lewat Escape', () => {
    const handleClose = mount(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
