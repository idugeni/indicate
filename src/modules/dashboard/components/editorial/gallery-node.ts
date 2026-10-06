import { Node } from '@tiptap/core';

import { GALLERY_MAX_IMAGES } from '@/modules/site/tiptap-document/types';

function galleryItems(value: unknown): readonly { readonly src: string; readonly alt: string; readonly title: string }[] {
  const attrs = value as { readonly images?: unknown } | null;
  if (attrs === null || typeof attrs !== 'object' || !Array.isArray(attrs.images)) return [];
  return attrs.images
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    .map((item) => ({
      src: typeof item.src === 'string' ? item.src : '',
      alt: typeof item.alt === 'string' ? item.alt : '',
      title: typeof item.title === 'string' ? item.title : '',
    }))
    .filter((item) => item.src !== '');
}

/**
 * Blok galeri inline atom berisi sampai `GALLERY_MAX_IMAGES` gambar.
 *
 * @remarks Pratinjau editor meniru struktur layout publik per jumlah gambar
 * (1 penuh, 2 sejajar, 3 korsel dibuka di foto ke-2, 4 hero + 3) agar
 * WYSIWYG, tetapi statis: tanpa panah interaktif, karena node ini atom.
 * @returns Node `imageGallery` dengan atribut `images` (`{ src, alt, title }`).
 */
export const ImageGallery = Node.create({
  name: 'imageGallery',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      images: {
        default: [],
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-image-gallery]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const items = galleryItems(HTMLAttributes).slice(0, GALLERY_MAX_IMAGES);
    const single = 'aspect-video w-full rounded-lg object-cover';
    if (items.length === 3) {
      const active = items[1]!;
      return [
        'div',
        { 'data-image-gallery': '', class: 'relative' },
        ['img', { src: active.src, alt: active.alt, title: active.title, class: single }],
        ['span', { class: 'absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white' }, `2/${items.length}`],
      ];
    }
    if (items.length === 4) {
      const hero = items[0]!;
      const rest = items.slice(1);
      return [
        'div',
        { 'data-image-gallery': '', class: 'flex flex-col gap-1.5' },
        ['img', { src: hero.src, alt: hero.alt, title: hero.title, class: single }],
        ['div', { class: 'grid grid-cols-3 gap-1.5' }, ...rest.map((entry) => ['img', { src: entry.src, alt: entry.alt, title: entry.title, class: single }])],
      ];
    }
    return [
      'div',
      { 'data-image-gallery': '', class: 'grid grid-cols-2 gap-1.5' },
      ...items.map((item) => ['img', { src: item.src, alt: item.alt, title: item.title, class: items.length === 1 ? `${single} col-span-2` : single }]),
    ];
  },
});
