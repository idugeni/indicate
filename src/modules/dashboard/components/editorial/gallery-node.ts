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
    return [
      'div',
      { 'data-image-gallery': '', class: 'grid grid-cols-2 gap-1.5' },
      ...items.map((item) => ['img', { src: item.src, alt: item.alt, title: item.title, class: 'aspect-[4/3] w-full rounded-lg object-cover' }]),
    ];
  },
});
