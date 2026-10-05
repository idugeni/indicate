// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TipTapBodyView } from '@/modules/site/components/tiptap-body-view';

const PARAGRAPH = 'font-sans text-xs text-paper';
const LIST = 'space-y-1 pl-5 font-sans text-xs text-paper [list-style:disc]';

describe('TipTapBodyView', () => {
  it('merender paragraf, heading, dan format inline tanpa HTML mentah', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Judul Bagian' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Halo ' }, { type: 'text', text: 'dunia', marks: [{ type: 'bold' }] }] },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Judul Bagian' })).toBeDefined();
    expect(container.querySelector('strong')?.textContent).toBe('dunia');
    expect(container.innerHTML).not.toContain('dangerouslySetInnerHTML');
  });

  it('menghapus tautan berbahaya dan mempertahankan teksnya', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'klik ', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
            { type: 'text', text: 'aman', marks: [{ type: 'link', attrs: { href: 'https://contoh.id/a' } }] },
          ],
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://contoh.id/a');
    expect(links[0]?.getAttribute('rel')).toContain('noopener');
    expect(container.textContent).toContain('klik');
  });

  it('memberi nofollow pada tautan luar dan tidak pada path in-site', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'sumber', marks: [{ type: 'link', attrs: { href: 'https://sumber.id/berita' } }] },
            { type: 'text', text: ' ' },
            { type: 'text', text: 'artikel lain', marks: [{ type: 'link', attrs: { href: '/artikel-lain' } }] },
          ],
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelector('a[href="https://sumber.id/berita"]')?.getAttribute('rel')).toContain('nofollow');
    expect(container.querySelector('a[href="/artikel-lain"]')?.getAttribute('rel')).not.toContain('nofollow');
  });

  it('merender gambar aman dengan caption dan menolak src berbahaya', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Pasar pagi', title: 'Suasana pasar' } },
        { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'jahat' } },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]?.getAttribute('src')).toBe('/api/network/media/0199a2b3-4c5d-7e8f-9012-3456789abcde');
    expect(images[0]?.getAttribute('srcset')).toContain('/api/network/media/0199a2b3-4c5d-7e8f-9012-3456789abcde?variant=thumb 640w');
    expect(images[0]?.getAttribute('alt')).toBe('Pasar pagi');
    expect(container.textContent).toContain('Suasana pasar');
  });

  it('merender galeri 2 gambar berdampingan dan membuang item tak aman', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'imageGallery',
          attrs: {
            images: [
              { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Satu', title: 'Keterangan satu' },
              { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcdf', alt: '', title: '' },
              { src: 'javascript:alert(1)', alt: 'jahat' },
            ],
          },
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(screen.getByRole('group', { name: 'Galeri 2 gambar' })).toBeDefined();
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('alt')).toBe('Satu');
    expect(images[1]?.getAttribute('alt')).toBe('Gambar artikel');
    expect(container.textContent).toContain('Keterangan satu');
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('merender galeri 3 gambar sebagai korsel dengan penghitung', async () => {
    const user = userEvent.setup();
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'imageGallery',
          attrs: {
            images: [
              { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Satu', title: '' },
              { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcdf', alt: 'Dua', title: '' },
              { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcd0', alt: 'Tiga', title: '' },
            ],
          },
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(screen.getByRole('group', { name: 'Galeri 3 gambar' })).toBeDefined();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Dua');
    expect(container.textContent).toContain('2/3');
    await user.click(screen.getByRole('button', { name: 'Foto berikutnya' }));
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Tiga');
    expect(container.textContent).toContain('3/3');
    expect(screen.queryByRole('button', { name: 'Foto berikutnya' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Foto sebelumnya' }));
    await user.click(screen.getByRole('button', { name: 'Foto sebelumnya' }));
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Satu');
    expect(screen.queryByRole('button', { name: 'Foto sebelumnya' })).toBeNull();
  });

  it('merender galeri 4 gambar sebagai hero penuh plus 3 sejajar', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'imageGallery',
          attrs: {
            images: ['e', 'f', '0', '1'].map((seed) => ({
              src: `media:0199a2b3-4c5d-7e8f-9012-3456789abcd${seed}`,
              alt: '',
              title: '',
            })),
          },
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(screen.getByRole('group', { name: 'Galeri 4 gambar' })).toBeDefined();
    expect(container.querySelectorAll('img')).toHaveLength(4);
    expect(container.querySelector('.grid-cols-3')).not.toBe(null);
  });

  it('merender galeri 1 gambar membentang penuh', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'imageGallery', attrs: { images: [{ src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: '', title: '' }] } },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('.col-span-2')).not.toBe(null);
  });

  it('melewatkan galeri tanpa gambar valid', () => {
    const doc = { type: 'doc', content: [{ type: 'imageGallery', attrs: { images: [{ src: 'javascript:alert(1)' }] } }] };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('melewatkan srcset untuk gambar eksternal', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://cdn.contoh.id/gambar.webp', alt: 'Eksternal' } }],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]?.getAttribute('src')).toBe('https://cdn.contoh.id/gambar.webp');
    expect(images[0]?.getAttribute('srcset')).toBe(null);
  });

  it('merender sematan YouTube sebagai kartu tautan aman', () => {
    const doc = { type: 'doc', content: [{ type: 'youtube', attrs: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } }] };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    const link = container.querySelector('a[href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"]');
    expect(link).not.toBe(null);
  });

  it('merender sematan sosial sebagai kartu tautan tanpa iframe', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'twitter', attrs: { src: 'https://x.com/i/status/1234567890123456789' } },
        { type: 'instagram', attrs: { src: 'https://www.instagram.com/p/C8AbC123dEf' } },
        { type: 'tiktok', attrs: { src: 'https://www.tiktok.com/@redaksi/video/7234567890123456789' } },
        { type: 'facebook', attrs: { src: 'https://www.facebook.com/lapassmg/posts/1234567890123456' } },
        { type: 'twitter', attrs: { src: 'https://evil.example/x/1' } },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    expect(container.querySelector('a[href="https://x.com/i/status/1234567890123456789"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://www.instagram.com/p/C8AbC123dEf"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://www.tiktok.com/@redaksi/video/7234567890123456789"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://www.facebook.com/lapassmg/posts/1234567890123456"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://evil.example/x/1"]')).toBe(null);
  });

  it('merender sematan Google Drive sebagai kartu tautan tanpa iframe', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'drive', attrs: { src: 'https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view' } },
        { type: 'drive', attrs: { src: 'https://drive.google.com/drive/folders/1AbC2dEfGhIjKlMnOpQrStUvWx' } },
        { type: 'drive', attrs: { src: 'https://drive.google.com/drive/home' } },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    expect(container.querySelector('a[href="https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://drive.google.com/drive/folders/1AbC2dEfGhIjKlMnOpQrStUvWx"]')).not.toBe(null);
    expect(container.querySelector('a[href="https://drive.google.com/drive/home"]')).toBe(null);
    expect(container.textContent).toContain('File Google Drive');
    expect(container.textContent).toContain('Folder Google Drive');
  });

  it('merender nothing untuk dokumen tidak valid', () => {
    const { container } = render(<TipTapBodyView doc={{ type: 'paragraph' }} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.textContent).toBe('');
  });

  it('melewatkan paragraf kosong agar tidak menggandakan jarak antar-blok', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Isi' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
        { type: 'paragraph', content: [{ type: 'hardBreak' }] },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });

  it('merender tabel, perataan, stabilo, dan warna teks', () => {
    const cell = (text: string) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Tengah' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Stabilo', marks: [{ type: 'highlight' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Merah', marks: [{ type: 'textStyle', attrs: { color: '#b91c1c' } }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Nakal', marks: [{ type: 'textStyle', attrs: { color: 'red;evil' } }] }] },
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, cell('B')] },
            { type: 'tableRow', content: [cell('1'), cell('2')] },
          ],
        },
      ],
    };
    const { container } = render(<TipTapBodyView doc={doc} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.querySelector('p[style*="text-align: center"]')).not.toBe(null);
    expect(container.querySelector('mark')?.textContent).toBe('Stabilo');
    expect(container.querySelector('span[style*="color: rgb(185, 28, 28)"]')).not.toBe(null);
    expect(container.querySelector('table')).not.toBe(null);
    expect(container.querySelectorAll('th')).toHaveLength(1);
    expect(container.querySelectorAll('td')).toHaveLength(3);
    expect(container.textContent).toContain('Nakal');
  });
});
