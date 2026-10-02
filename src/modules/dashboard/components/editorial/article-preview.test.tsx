// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ArticlePreview } from '@/modules/dashboard/components/editorial/article-preview';
import type { TipTapDoc } from '@/modules/site/tiptap-document';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MEDIA_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_MEDIA_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

function docWithImage(id: string): TipTapDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Paragraf naskah' }],
      },
      {
        type: 'image',
        attrs: { src: `/api/network/media/${id}`, alt: 'Gambar' },
      },
    ],
  } as TipTapDoc;
}

describe('Pratinjau artikel', () => {
  it('menampilkan kondisi kosong tanpa dokumen', () => {
    render(<ArticlePreview title="Judul" description="" doc={null} command={vi.fn()} />);
    expect(screen.getByText('Belum ada isi')).toBeDefined();
  });

  it('memakai ulang judul dan membatalkan deskripsi kosong', () => {
    render(<ArticlePreview title="   " description="   " doc={docWithImage(MEDIA_ID)} command={vi.fn(async () => null)} />);
    expect(screen.getByText('Tanpa judul')).toBeDefined();
    expect(screen.queryByText('Paragraf naskah')).toBeDefined();
  });

  it('menampilkan deskripsi dan gambar sampul saat tersedia', () => {
    render(
      <ArticlePreview
        title="Kabar Hari Ini"
        description="Ringkasan singkat berita."
        coverImageUrl="https://cdn.contoh.id/sampul.png"
        doc={docWithImage(MEDIA_ID)}
        command={vi.fn(async () => null)}
      />,
    );
    expect(screen.getByText('Kabar Hari Ini')).toBeDefined();
    expect(screen.getByText('Ringkasan singkat berita.')).toBeDefined();
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('lewat tanpa gambar sampul saat url kosong', () => {
    render(<ArticlePreview title="Kabar" description="" coverImageUrl="" doc={docWithImage(MEDIA_ID)} command={vi.fn(async () => null)} />);
    expect(document.querySelector('img[alt=""]')).toBeNull();
  });

  it('meminta url pratinjau untuk tiap media di dokumen', async () => {
    const command = vi.fn(async () => ({ items: [{ mediaId: MEDIA_ID, url: 'https://r2.contoh.id/pratinjau.png', expiresAt: '2026-10-02T00:10:00.000Z' }] }));
    render(<ArticlePreview title="Kabar" description="" doc={docWithImage(MEDIA_ID)} command={command} />);
    await waitFor(() => expect(command).toHaveBeenCalledWith('media.readMany', { mediaIds: [MEDIA_ID] }));
  });

  it('menggabungkan banyak media dalam satu panggilan dan memakai cache segar', async () => {
    const fresh = new Date(Date.now() + 10 * 60_000).toISOString();
    const command = vi.fn(async () => ({
      items: [
        { mediaId: MEDIA_ID, url: 'https://r2.contoh.id/a.png', expiresAt: fresh },
        { mediaId: OTHER_MEDIA_ID, url: 'https://r2.contoh.id/b.png', expiresAt: fresh },
      ],
    }));
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: `/api/network/media/${MEDIA_ID}`, alt: 'A' } },
        { type: 'image', attrs: { src: `/api/network/media/${OTHER_MEDIA_ID}`, alt: 'B' } },
      ],
    } as TipTapDoc;
    const { rerender } = render(<ArticlePreview title="Kabar" description="" doc={doc} command={command} />);
    await waitFor(() => expect(command).toHaveBeenCalledTimes(1));
    expect(command).toHaveBeenCalledWith('media.readMany', { mediaIds: [MEDIA_ID, OTHER_MEDIA_ID] });
    rerender(<ArticlePreview title="Kabar" description="" doc={doc} command={command} />);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(command).toHaveBeenCalledTimes(1);
  });

  it('menahan url media awet bila pembacaan ditolak', async () => {
    const command = vi.fn(async () => {
      throw new Error('gagal baca');
    });
    render(<ArticlePreview title="Kabar" description="" doc={docWithImage(MEDIA_ID)} command={command} />);
    await waitFor(() => expect(command).toHaveBeenCalled());
    expect(screen.getByText('Paragraf naskah')).toBeDefined();
  });

  it('mengabaikan url kosong maupun non-teks dari pembacaan media', async () => {
    const command = vi.fn(async () => ({ items: [{ mediaId: MEDIA_ID, url: '' }] }));
    const { rerender } = render(<ArticlePreview title="Kabar" description="" doc={docWithImage(MEDIA_ID)} command={command} />);
    await waitFor(() => expect(command).toHaveBeenCalled());
    expect(screen.getByText('Paragraf naskah')).toBeDefined();

    const nonText = vi.fn(async () => ({ items: [{ mediaId: OTHER_MEDIA_ID, url: 7 }] }));
    rerender(<ArticlePreview title="Kabar" description="" doc={docWithImage(OTHER_MEDIA_ID)} command={nonText} />);
    await waitFor(() => expect(nonText).toHaveBeenCalledWith('media.readMany', { mediaIds: [OTHER_MEDIA_ID] }));
    expect(screen.getByText('Paragraf naskah')).toBeDefined();
  });

  it('berpindah lebar pratinjau antara desktop dan ponsel', () => {
    render(<ArticlePreview title="Kabar" description="" doc={docWithImage(MEDIA_ID)} command={vi.fn(async () => null)} />);
    const article = screen.getByRole('heading', { level: 1 }).closest('article');
    expect(article?.className).toContain('w-full');
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau Ponsel' }));
    const narrow = screen.getByRole('heading', { level: 1 }).closest('article');
    expect(narrow?.className).toContain('max-w-[380px]');
  });
});
