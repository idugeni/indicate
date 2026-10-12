import { normalizeSlugCandidate } from '@/modules/site/slug-allocator';

export interface ForOrgPublisherRef {
  readonly id: string;
  readonly name: string;
}

export interface ForOrgRegionRef {
  readonly id: string;
  readonly slug: string;
  readonly kind: 'region' | 'city';
  readonly parentRegionId: string | null;
}

export interface ForOrgTargetState {
  readonly publishers: readonly { readonly id: string; readonly name: string; readonly status: string }[];
  readonly authors: readonly { readonly id: string; readonly displayName: string; readonly status: string }[];
  readonly categories: readonly { readonly id: string; readonly slug: string; readonly status: string }[];
  readonly regions: readonly (ForOrgRegionRef & { readonly status: string })[];
}

/** Resolve the same canonical geography key used by `region_catalog`. */
export function resolveRegionCanonicalKey(
  region: ForOrgRegionRef,
  regions: readonly ForOrgRegionRef[],
): string | null {
  if (region.kind === 'region') return region.parentRegionId === null ? `region:${region.slug}` : null;
  if (region.parentRegionId === null) return null;
  const parent = regions.find((candidate) => candidate.id === region.parentRegionId && candidate.kind === 'region');
  if (parent === undefined) return null;
  const parentKey = resolveRegionCanonicalKey(parent, regions);
  return parentKey === null ? null : `city:${parentKey}:${region.slug}`;
}

export interface ForOrgCreateValue {
  readonly publisherId: string | null;
  readonly authorId: string | null;
  readonly authorName?: string | null;
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

export type ForOrgMappingField = 'publisherId' | 'authorId' | 'categoryIds' | 'regionId';

export type ForOrgMappingResult =
  | { readonly ok: true; readonly value: ForOrgMappedValue }
  | { readonly ok: false; readonly field: ForOrgMappingField };

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
 * Petakan referensi artikel operator ke metadata yang benar-benar dimiliki tenant tujuan.
 *
 * Metadata yang hilang harus disediakan lebih dahulu dalam transaksi penulisan
 * tenant oleh service pemanggil. Fungsi ini tidak pernah mengganti kategori,
 * memilih penulis bawaan, atau memakai ID dari tenant sumber.
 *
 * @returns Referensi tujuan yang cocok, atau satu field spesifik yang gagal dipetakan.
 */
export function mapArticleForOrg(
  reference: ForOrgCreateValue & {
    readonly publisherName: string;
    readonly categorySlugs: readonly string[];
    readonly regionKey: string | null;
  },
  target: ForOrgTargetState,
): ForOrgMappingResult {
  const publisher = target.publishers.find(
    (candidate) => candidate.status === 'active' && candidate.name === reference.publisherName,
  );
  if (publisher === undefined) return { ok: false, field: 'publisherId' };

  const requestedAuthorName = reference.authorName?.trim() || null;
  const author = requestedAuthorName === null
    ? null
    : target.authors.find(
      (candidate) => candidate.status === 'active' && candidate.displayName === requestedAuthorName,
    );
  if (requestedAuthorName !== null && author === undefined) return { ok: false, field: 'authorId' };

  const categoriesBySlug = new Map(
    target.categories
      .filter((candidate) => candidate.status === 'active')
      .map((category) => [category.slug, category.id] as const),
  );
  const categoryIds: string[] = [];
  for (const slug of new Set(reference.categorySlugs)) {
    const categoryId = categoriesBySlug.get(slug);
    if (categoryId === undefined) return { ok: false, field: 'categoryIds' };
    if (!categoryIds.includes(categoryId)) categoryIds.push(categoryId);
  }

  const region = reference.regionKey === null
    ? null
    : target.regions.find(
      (candidate) => candidate.status === 'active'
        && resolveRegionCanonicalKey(candidate, target.regions) === reference.regionKey,
    );
  if (reference.regionKey !== null && region === undefined) return { ok: false, field: 'regionId' };

  return {
    ok: true,
    value: {
      ownerOrgSlug: resolveOwnerOrgSlug(reference.publisherName),
      publisherId: publisher.id,
      authorId: author?.id ?? null,
      categoryIds,
      regionId: region?.id ?? null,
    },
  };
}
