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

  it('merender nothing untuk dokumen tidak valid', () => {
    const { container } = render(<TipTapBodyView doc={{ type: 'paragraph' }} paragraphClassName={PARAGRAPH} listClassName={LIST} />);
    expect(container.textContent).toBe('');
  });
});
