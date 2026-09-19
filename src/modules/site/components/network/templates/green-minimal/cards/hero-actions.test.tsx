// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { GreenMinimalHeroActions } from '@/modules/site/components/network/templates/green-minimal/cards/hero-actions';

const tulis = vi.hoisted(() => vi.fn(async () => {}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  tulis.mockClear();
  window.localStorage.clear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: tulis },
    configurable: true,
  });
});

describe('GreenMinimalHeroActions', () => {
  it('menyimpan dan melepas simpanan lokal', () => {
    render(<GreenMinimalHeroActions slug="berita-x" title="Judul X" />);
    const simpan = screen.getByRole('button', { name: 'Simpan artikel' });
    fireEvent.click(simpan);
    expect(screen.getByRole('button', { name: 'Hapus dari simpanan' }).getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.getItem('green-minimal:bookmark:berita-x')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus dari simpanan' }));
    expect(screen.getByRole('button', { name: 'Simpan artikel' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('memulihkan status tersimpan dari localStorage', () => {
    window.localStorage.setItem('green-minimal:bookmark:berita-x', '1');
    render(<GreenMinimalHeroActions slug="berita-x" title="Judul X" />);
    expect(screen.getByRole('button', { name: 'Hapus dari simpanan' })).toBeDefined();
  });

  it('membagikan lewat clipboard dan menampilkan status tersalin', async () => {
    render(<GreenMinimalHeroActions slug="berita-x" title="Judul X" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    expect(tulis).toHaveBeenCalledWith(expect.stringContaining('berita-x'));
    expect(await screen.findByLabelText('Tautan tersalin')).toBeDefined();
  });
});
