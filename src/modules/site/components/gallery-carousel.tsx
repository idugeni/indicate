'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { EditorialImage } from '@/modules/site/components/editorial-image';

export interface CarouselGalleryItem {
  readonly src: string;
  readonly thumbSrc: string | null;
  readonly alt: string;
  readonly caption: string | null;
}

/**
 * Korsel galeri inline untuk 3 gambar: dibuka pada foto kedua, satu foto
 * besar, panah kiri-kanan yang hilang di ujung, penghitung posisi,
 * dan caption foto aktif.
 *
 * @param items - Tepat gambar galeri yang sudah teresolusi.
 * @returns Foto aktif plus kontrol yang selalu terlihat di sentuh/fokus.
 */
export function GalleryCarousel({ items }: { readonly items: readonly CarouselGalleryItem[] }) {
  const [index, setIndex] = useState(1);
  const position = Math.min(Math.max(index, 0), items.length - 1);
  useEffect(() => {
    if (typeof Image === 'undefined') return;
    for (const neighbor of [items[position - 1], items[position + 1]]) {
      if (neighbor !== undefined) {
        const probe = new Image();
        probe.src = neighbor.src;
      }
    }
  }, [items, position]);
  if (items.length === 0) return null;
  const active = items[position]!;
  return (
    <div className="group relative" role="group" aria-label={`Galeri ${items.length} gambar`} aria-roledescription="korsel">
      <EditorialImage
        key={active.src}
        src={active.src}
        thumbSrc={active.thumbSrc}
        alt={active.alt}
        caption={active.caption}
        captionClassName="px-6 py-3 font-sans text-xs leading-relaxed"
        width={1280}
        height={720}
        className="gallery-fade aspect-video w-full object-cover"
        figureClassName="m-0 overflow-hidden rounded-xl"
      />
      <div className="pointer-events-none absolute inset-x-2 top-0 flex aspect-video items-center justify-between">
        {position > 0 ? (
          <button
            type="button"
            onClick={() => setIndex(position - 1)}
            aria-label="Foto sebelumnya"
            className="pointer-events-auto rounded-full bg-bg/80 p-1.5 text-paper opacity-0 shadow-md backdrop-blur transition-opacity duration-180 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {position < items.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex(position + 1)}
            aria-label="Foto berikutnya"
            className="pointer-events-auto rounded-full bg-bg/80 p-1.5 text-paper opacity-0 shadow-md backdrop-blur transition-opacity duration-180 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <span aria-live="polite" className="absolute right-2 top-2 rounded-full bg-bg/80 px-2 py-0.5 font-mono text-[11px] tabular-nums text-paper backdrop-blur">
        {position + 1}/{items.length}
      </span>
    </div>
  );
}
