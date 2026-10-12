import Link from 'next/link';
import type { CSSProperties } from 'react';

/**
 * One canonical category label for every article card and hero.
 * Missing taxonomy is represented only as "Berita"; that fallback is deliberately
 * not linked because it is not a catalog slug.
 */
export function ArticleCategoryLabel({
  categoryName,
  categorySlug,
  className,
  style,
  linked = true,
}: {
  readonly categoryName: string | null;
  readonly categorySlug: string | null;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly linked?: boolean;
}) {
  const label = categoryName?.trim() || 'Berita';
  const slug = categorySlug?.trim();

  if (!slug || !linked) {
    return <span className={className} style={style}>{label}</span>;
  }

  return (
    <Link href={`/categories/${slug}`} className={className} style={style}>
      {label}
    </Link>
  );
}
