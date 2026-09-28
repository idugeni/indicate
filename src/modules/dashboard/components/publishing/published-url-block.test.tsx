// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PublishedUrlBlock, formatPublishedUrlBlock } from '@/modules/dashboard/components/publishing/published-url-block';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard() {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('formatPublishedUrlBlock', () => {
  it('bernomor urut mengikuti urutan tampil dan tidak memakai code fence', () => {
    expect(formatPublishedUrlBlock({ title: 'Judul Berita', urls: ['https://a.example/slug', 'https://b.example/slug'] })).toBe(
      'Judul Berita\n\n1. https://a.example/slug\n2. https://b.example/slug',
    );
  });

  it('lewatkan judul kosong tanpa baris kosong di depan', () => {
    expect(formatPublishedUrlBlock({ title: '   ', urls: ['https://a.example/slug'] })).toBe('1. https://a.example/slug');
  });
});

describe('PublishedUrlBlock', () => {
  it('tidak merender apa pun saat belum ada URL tayang', () => {
    const { container } = render(<PublishedUrlBlock title="Judul" urls={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('menampilkan nomor urut sesuai isi blok', () => {
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug', 'https://b.example/slug']} />);
    const block = screen.getByLabelText('Daftar URL untuk Judul Berita').textContent;
    expect(block).toBe('Judul Berita\n\n1. https://a.example/slug\n2. https://b.example/slug');
    expect(screen.getByText('2 URL tayang')).toBeDefined();
  });

  it('menyalin blok lengkap ke clipboard', async () => {
    const writeText = stubClipboard();
    const urls = Array.from({ length: 500 }, (_, index) => `https://portal-${index}.example/slug`);
    render(<PublishedUrlBlock title="Judul Berita" urls={urls} />);
    fireEvent.click(screen.getByRole('button', { name: /salin untuk whatsapp/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0]![0];
    expect(copied.split('\n')).toHaveLength(502);
    expect(copied).toContain('500. https://portal-499.example/slug');
  });

  it('memberi tahu saat clipboard ditolak browser', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async (_text: string) => { throw new Error('ditolak'); }) },
      configurable: true,
    });
    const { toast } = await import('sonner');
    render(<PublishedUrlBlock title="Judul Berita" urls={['https://a.example/slug']} />);
    fireEvent.click(screen.getByRole('button', { name: /salin untuk whatsapp/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
