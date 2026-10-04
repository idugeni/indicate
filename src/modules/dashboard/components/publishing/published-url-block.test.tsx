// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PublishedUrlBlock, formatPublishedUrlBlock } from '@/modules/dashboard/components/publishing/published-url-block';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard() {
  const writeText = vi.fn(async (text: string) => {
    void text;
  });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('formatPublishedUrlBlock', () => {
  it('bernomor urut mengikuti urutan tampil dan tidak memakai code fence', () => {
    expect(formatPublishedUrlBlock({ urls: ['https://a.example/slug', 'https://b.example/slug'] })).toBe(
      '1. https://a.example/slug\n2. https://b.example/slug',
    );
  });

  it('tanpa judul agar salinan WA bersih', () => {
    expect(formatPublishedUrlBlock({ title: 'Judul Berita', urls: ['https://a.example/slug'] })).toBe(
      '1. https://a.example/slug',
    );
  });

  it('menyertakan judul saat diminta', () => {
    expect(
      formatPublishedUrlBlock({ title: 'Judul Berita', urls: ['https://a.example/slug'], includeTitle: true }),
    ).toBe('Judul Berita\n\n1. https://a.example/slug');
  });
});

describe('PublishedUrlBlock', () => {
  it('tidak merender apa pun saat belum ada URL tayang', () => {
    const { container } = render(<PublishedUrlBlock title="Judul" urls={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('menyembunyikan daftar URL secara default dan menampilkannya saat dibuka', () => {
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug', 'https://b.example/slug']} />);
    expect(screen.queryByText('https://a.example/slug')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /buka detail/i }));
    expect(screen.getByText('https://a.example/slug')).toBeDefined();
    expect(screen.getByText('https://b.example/slug')).toBeDefined();
    expect(screen.getByText('2 URL Tayang')).toBeDefined();
  });

  it('menyalin blok lengkap ke clipboard', async () => {
    const writeText = stubClipboard();
    const urls = Array.from({ length: 500 }, (slot, index) => {
      void slot;
      return `https://portal-${index}.example/slug`;
    });
    render(<PublishedUrlBlock title="Judul Berita" urls={urls} />);
    fireEvent.click(screen.getByRole('button', { name: /salin siaran/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0]![0];
    expect(copied.split('\n')).toHaveLength(502);
    expect(copied).toContain('500. https://portal-499.example/slug');
  });

  it('memberi tahu saat clipboard ditolak browser', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => { throw new Error('ditolak'); }) },
      configurable: true,
    });
    const { toast } = await import('sonner');
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug']} />);
    fireEvent.click(screen.getByRole('button', { name: /salin siaran/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('menonaktifkan WA sampai kesiapan siap dan menampilkannya setelah cek', async () => {
    stubClipboard();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ready: true, reason: 'ready' }) }) as unknown as Response));
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug']} organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: /cek kesiapan/i }));
    await waitFor(() => expect(screen.getByText(/pratinjau gambar siap/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /kirim ke whatsapp/i })).toBeDefined();
  });

  it('memblokir WA saat pratinjau belum siap', async () => {
    stubClipboard();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ready: false, reason: 'social_tags_incomplete' }) }) as unknown as Response));
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug']} organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: /cek kesiapan/i }));
    await waitFor(() => expect(screen.getByText(/pratinjau belum siap/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /kirim ke whatsapp/i }).hasAttribute('disabled')).toBe(true);
  });
});
