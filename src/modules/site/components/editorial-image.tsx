/**
 * Responsive editorial image without optimizer cost.
 *
 * @param src - Full-variant URL (direct R2 public URL or signed media route).
 * @param thumbSrc - 640px listing variant; enables a two-entry `srcSet` so small screens skip full bytes.
 * @param alt - Final accessible text; callers fall back to the article title when durable alt is null.
 * @param caption - Optional caption line; null hides it.
 * @param width - Natural full width for the `srcSet` descriptor; defaults to 1200.
 * @param height - Natural full height for aspect stability; defaults to 675.
 * @param focalX - Horizontal crop focus (0-100); pairs with `focalY`, null means center.
 * @param focalY - Vertical crop focus (0-100); pairs with `focalX`, null means center.
 * @param eager - Eager fetch for above-the-fold covers; defaults to lazy.
 * @param className - Class applied to the `img` element.
 * @param figureClassName - Class applied to the wrapping `figure`.
 * @param captionClassName - Class applied to the caption.
 * @returns Plain `img` with native `srcSet`: `images.unoptimized` stays true so no Vercel transform cost accrues.
 */
export function EditorialImage({
  src,
  thumbSrc = null,
  alt,
  caption = null,
  width = null,
  height = null,
  focalX = null,
  focalY = null,
  eager = false,
  className = 'aspect-video w-full object-cover',
  figureClassName = 'm-0 overflow-hidden rounded-2xl shadow-sm',
  captionClassName = 'px-6 pb-4 text-center font-sans text-sm opacity-80',
}: {
  readonly src: string;
  readonly thumbSrc?: string | null;
  readonly alt: string;
  readonly caption?: string | null;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly focalX?: number | null;
  readonly focalY?: number | null;
  readonly eager?: boolean;
  readonly className?: string;
  readonly figureClassName?: string;
  readonly captionClassName?: string;
}) {
  const fullWidth = width ?? 1200;
  const srcSet = thumbSrc === null ? undefined : `${thumbSrc} 640w, ${src} ${fullWidth}w`;
  const objectPosition = focalX === null || focalY === null ? undefined : `${focalX}% ${focalY}%`;
  return (
    <figure className={figureClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img is deliberate: images.unoptimized is true so next/image adds no optimization, while native srcSet serves final R2 bytes with zero transform cost */}
      <img
        src={src}
        {...(srcSet === undefined ? {} : { srcSet })}
        sizes="(max-width: 768px) 100vw, 768px"
        alt={alt}
        width={fullWidth}
        height={height ?? 675}
        loading={eager ? 'eager' : 'lazy'}
        {...(eager ? { fetchPriority: 'high' } : {})}
        decoding="async"
        className={className}
        {...(objectPosition === undefined ? {} : { style: { objectPosition } })}
      />
      {caption === null ? null : <figcaption className={captionClassName}>{caption}</figcaption>}
    </figure>
  );
}
