import type { ArticleGalleryImage } from '@/modules/delivery/models';
import { EditorialImage } from '@/modules/site/components/editorial-image';

/**
 * Render article-owned gallery images below the body with durable metadata.
 *
 * @param images - Gallery projection ordered by `sortOrder` then upload time.
 * @param title - Article title used when an image carries no durable alt text.
 * @returns Photo section, or null when the gallery is empty.
 */
export function ArticleGallery({
  images,
  title,
}: {
  readonly images: readonly ArticleGalleryImage[];
  readonly title: string;
}) {
  if (images.length === 0) return null;
  return (
    <section aria-label="Galeri foto" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {images.map((image) => (
        <EditorialImage
          key={image.id}
          src={image.url}
          thumbSrc={image.thumbnailUrl}
          alt={image.alt ?? title}
          caption={image.caption}
          width={image.width}
          height={image.height}
        />
      ))}
    </section>
  );
}
