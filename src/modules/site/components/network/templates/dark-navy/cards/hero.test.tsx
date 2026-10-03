// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { DarkNavyHero } from '@/modules/site/components/network/templates/dark-navy/cards/hero';

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

const artikel = makeNetworkArticle({
  id: 'a-1',
  slug: 'utama',
  title: 'Judul berita utama yang sengaja dibuat panjang untuk menguji Whether judul terpotong di layar sempit',
  description: 'Ringkasan artikel.',
  categoryName: 'Politik',
});

/** Container gambar = <section> pembungkus; stack teks adalah anaknya. */
function stackTeks(): HTMLElement {
  const section = screen.getByLabelText('Sorotan utama');
  const h1 = screen.getByRole('heading', { level: 1 });
  const stack = h1.closest('div');
  if (stack === null || stack.parentElement !== section) throw new Error('stack bukan anak langsung section');
  return stack;
}

describe('DarkNavyHero', () => {
  it('stack teks in-flow, bukan absolute — supaya section ikut tumbuh', () => {
    render(<DarkNavyHero articles={[artikel]} />);
    const kelas = stackTeks().getAttribute('class') ?? '';
    expect(kelas).toMatch(/\brelative\b/);
    // `absolute` di sini yang membuat konten terdorong ke atas keluar kotak dan
    // dipotong `overflow-hidden`; itu persis bug yang dilaporkan.
    expect(kelas).not.toMatch(/^\s*absolute|[\s"]absolute[\s"]/);
    expect(kelas).not.toMatch(/inset-x-0/);
  });

  it('container punya tinggi minimum agar gambar tetap utuh', () => {
    render(<DarkNavyHero articles={[artikel]} />);
    expect(stackTeks().getAttribute('class') ?? '').toMatch(/min-h-\[24rem\]/);
  });

  it('judul dibatasi supaya tidak tumbuh tanpa batas', () => {
    render(<DarkNavyHero articles={[artikel]} />);
    expect(screen.getByRole('heading', { level: 1 }).getAttribute('class') ?? '').toMatch(/line-clamp/);
  });

  it('gambar jadi fill, bukan penentu tinggi section', () => {
    const { container } = render(<DarkNavyHero articles={[artikel]} />);
    expect(container.querySelector('img')?.className ?? '').not.toMatch(/aspect-/);
  });
});