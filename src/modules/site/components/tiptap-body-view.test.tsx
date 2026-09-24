// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

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
    expect(images[0]?.getAttribute('alt')).toBe('Pasar pagi');
    expect(container.textContent).toContain('Suasana pasar');
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
