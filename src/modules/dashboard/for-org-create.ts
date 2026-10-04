import { normalizeSlugCandidate } from '@/modules/site/slug-allocator';

export interface ForOrgPublisherRef {
  readonly id: string;
  readonly name: string;
}

export interface ForOrgTargetState {
  readonly publishers: readonly { readonly id: string; readonly name: string; readonly status: string }[];
  readonly authors: readonly { readonly id: string; readonly displayName: string; readonly status: string }[];
  readonly categories: readonly { readonly id: string; readonly slug: string; readonly status: string }[];
  readonly regions: readonly { readonly id: string; readonly slug: string; readonly status: string }[];
}

export interface ForOrgCreateValue {
  readonly publisherId: string | null;
  readonly authorId: string | null;
  readonly categoryIds: readonly string[] | undefined;
  readonly regionId: string | null;
}

export interface ForOrgMappedValue {
  /** Slug org pemilik yang cocok dengan nama penerbit cermin. */
  readonly ownerOrgSlug: string;
  readonly publisherId: string;
  readonly authorId: string | null;
  readonly categoryIds: string[];
  readonly regionId: string | null;
}

/**
 * Petakan nama penerbit cermin ke slug org pemiliknya.
 *
 * @param publisherName - Nama penerbit di org aktif (mis. RUTAN KELAS II B WONOSOBO).
 * @returns Slug kandidat org (rutan-kelas-ii-b-wonosobo); service mencocokkannya ke organizations.
 */
export function resolveOwnerOrgSlug(publisherName: string): string {
  return normalizeSlugCandidate(publisherName);
}

/**
 * Petakan referensi artikel org operator ke baris setara di org pemilik.
 *
 * @param reference - Id operator (penerbit terpilih, penulis, kategori, wilayah) plus slug pendampingnya.
 * @param target - Baris org pemilik untuk dicocokkan.
 * @returns Nilai siap tulis di org pemilik, atau null bila penerbit cermin tak ada di sana.
 */
export function mapArticleForOrg(
  reference: ForOrgCreateValue & {
    readonly publisherName: string;
    readonly categorySlugs: readonly string[];
    readonly regionSlug: string | null;
  },
  target: ForOrgTargetState,
): ForOrgMappedValue | null {
  const publisher = target.publishers.find(
    (candidate) => candidate.status === 'active' && candidate.name === reference.publisherName,
  );
  if (publisher === undefined) return null;
  const author =
    target.authors.find((candidate) => candidate.status === 'active' && candidate.displayName === 'Redaksi')?.id
    ?? null;
  const categoryIds = reference.categorySlugs.flatMap((slug) => {
    const match = target.categories.find((candidate) => candidate.status === 'active' && candidate.slug === slug);
    return match === undefined ? [] : [match.id];
  });
  const regionId =
    reference.regionSlug === null
      ? null
      : (target.regions.find((candidate) => candidate.status === 'active' && candidate.slug === reference.regionSlug)?.id
        ?? null);
  return {
    ownerOrgSlug: resolveOwnerOrgSlug(reference.publisherName),
    publisherId: publisher.id,
    authorId: author,
    categoryIds,
    regionId,
  };
}
