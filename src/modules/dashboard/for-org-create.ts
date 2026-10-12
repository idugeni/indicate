import { DEFAULT_CATEGORY_SLUG } from '@/modules/dashboard/models';
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
 * Petakan referensi artikel org operator ke baris setara di org pemilik.
 *
 * Kategori yang tidak tersedia pada tenant tujuan menggunakan kategori lokal
 * "Berita". Penulis yang tidak tersedia menggunakan penulis "Redaksi", sama
 * seperti proses pemindahan artikel UPT yang sudah digunakan saat ini. ID dari
 * tenant sumber tidak pernah disimpan di tenant tujuan.
 *
 * @param reference - Id operator (penerbit terpilih, penulis, kategori, wilayah) plus slug pendampingnya.
 * @param target - Baris org pemilik untuk dicocokkan.
 * @returns Nilai siap tulis di org pemilik, atau field yang benar-benar gagal dipetakan.
 */
export function mapArticleForOrg(
  reference: ForOrgCreateValue & {
    readonly publisherName: string;
    readonly categorySlugs: readonly string[];
    readonly regionSlug: string | null;
  },
  target: ForOrgTargetState,
): ForOrgMappingResult {
  const publisher = target.publishers.find(
    (candidate) => candidate.status === 'active' && candidate.name === reference.publisherName,
  );
  if (publisher === undefined) return { ok: false, field: 'publisherId' };

  const requestedAuthorName = reference.authorName?.trim() || null;
  const matchingAuthor = requestedAuthorName === null
    ? undefined
    : target.authors.find((candidate) => candidate.status === 'active' && candidate.displayName === requestedAuthorName);
  const defaultAuthor = target.authors.find(
    (candidate) => candidate.status === 'active' && candidate.displayName === 'Redaksi',
  );
  const author = matchingAuthor ?? defaultAuthor;
  if (author === undefined) return { ok: false, field: 'authorId' };

  const activeCategories = target.categories.filter((candidate) => candidate.status === 'active');
  const defaultCategory = activeCategories.find((candidate) => candidate.slug === DEFAULT_CATEGORY_SLUG);
  const categoriesBySlug = new Map(activeCategories.map((category) => [category.slug, category.id] as const));
  const categoryIds = [...new Set(reference.categorySlugs.map(
    (slug) => categoriesBySlug.get(slug) ?? defaultCategory?.id,
  ).filter((id): id is string => id !== undefined))];
  if (categoryIds.length !== new Set(reference.categorySlugs).size && defaultCategory === undefined) {
    return { ok: false, field: 'categoryIds' };
  }

  const region =
    reference.regionSlug === null
      ? null
      : target.regions.find((candidate) => candidate.status === 'active' && candidate.slug === reference.regionSlug);
  if (reference.regionSlug !== null && region === undefined) return { ok: false, field: 'regionId' };
  const regionId = region?.id ?? null;

  return {
    ok: true,
    value: {
      ownerOrgSlug: resolveOwnerOrgSlug(reference.publisherName),
      publisherId: publisher.id,
      authorId: author.id,
      categoryIds,
      regionId,
    },
  };
}
