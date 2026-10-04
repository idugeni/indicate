// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { CleanBlueListing } from '@/modules/site/components/network/templates/clean-blue/pages/listing-page';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// Cangkang memuat header async Server Component yang tidak bisa dirender di jsdom;
// yang diuji hanya urutan blok di dalam <main>.
vi.mock('@/modules/site/components/network/templates/clean-blue/chrome/shell', () => ({
  CleanBlueShell: ({ children }: { readonly children: React.ReactNode }) => <main>{children}</main>,
}));

afterEach(() => {
  cleanup();
});

// `useTickerRotation` di ticker berputar membaca ini lewat useSyncExternalStore.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
    writable: true,
  });
});

function artikel(n: number) {
  return Array.from({ length: n }, (slot, i) =>
    makeNetworkArticle({
      id: `a-${i}`,
      slug: `berita-${i}`,
      title: `Berita utama nomor ${i}`,
      attribution: 'Redaksi',
      imageUrl: null,
      categorySlug: 'politik',
      categoryName: 'Politik',
    }),
  );
}

const newsletter = () => screen.getByRole('region', { name: 'Berlangganan newsletter' });
const sebelum = (a: Element, b: Element) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('CleanBlueListing urutan blok', () => {
  it('menaruh newsletter SETELAH konten berita, bukan di atas hero dan picks', () => {
    render(<CleanBlueListing site={makeNetworkSite(artikel(5))} title="Beranda" description="Portal" />);
    // Dipakai heading, bukan link: link pertama di <main> milik ticker dan
    // selalu berada di atas newsletter, jadi selector link tidak mengukur apa pun.
    const pilihan = screen.getByRole('heading', { name: /Berita Pilihan/ });
    expect(sebelum(newsletter(), pilihan)).toBe(false);
  });

  it('menaruh newsletter SEBELUM arsip, jadi bukan blok terakhir', () => {
    render(<CleanBlueListing site={makeNetworkSite(artikel(5))} title="Beranda" description="Portal" />);
    const arsip = screen.getByRole('heading', { name: /Jelajahi Liputan/ });
    expect(sebelum(newsletter(), arsip)).toBe(true);
  });

  it('sembunyi saat tenant belum punya artikel', () => {
    render(<CleanBlueListing site={makeNetworkSite([])} title="Beranda" description="Portal" />);
    expect(screen.queryByRole('region', { name: 'Berlangganan newsletter' })).toBeNull();
  });
});