// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { BlackLimeTicker } from '@/modules/site/components/network/templates/black-lime/cards/ticker';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
    writable: true,
  });
});

function buat(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeNetworkArticle({ id: `a-${i + 1}`, slug: `berita-${i + 1}`, title: `Judul ${i + 1}` }),
  );
}

describe('BlackLimeTicker', () => {
  it('null untuk daftar kosong', () => {
    const { container } = render(<BlackLimeTicker articles={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('menampilkan headline pertama dan lencana terkini', () => {
    render(<BlackLimeTicker articles={buat(3)} />);
    expect(screen.getByText('TERKINI')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Judul 1' }).getAttribute('href')).toBe('/berita-1');
  });

  it('berpindah headline lewat tombol berikutnya', () => {
    render(<BlackLimeTicker articles={buat(3)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Headline berikutnya' }));
    expect(screen.getByRole('link', { name: 'Judul 2' })).toBeDefined();
    expect(document.querySelector('[data-ticker-index]')?.getAttribute('data-ticker-index')).toBe('1');
  });

  it('satu artikel menyembunyikan kontrol navigasi', () => {
    render(<BlackLimeTicker articles={buat(1)} />);
    expect(screen.getByRole('link', { name: 'Judul 1' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Headline berikutnya' })).toBe(null);
    expect(screen.queryByLabelText('Pilih headline')).toBe(null);
  });
});
