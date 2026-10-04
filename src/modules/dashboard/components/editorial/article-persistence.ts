import { SLUG_MAX_LENGTH, TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import type { TipTapDoc } from '@/modules/site/tiptap-document';
import { localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';

/** Panjang isi maksimum yang diterima server. */
const ARTICLE_BODY_MAX = 200_000;

/**
 * Isian form yang dipakai submit artikel.
 *
 * @remarks Sengaja tidak membaca `FormData`: submit membangun payload dari
 * state React sebagai sumber kebenaran tunggal.
 */
export interface ArticleFormSnapshot {
  readonly slug: string;
  readonly titleText: string;
  readonly descriptionText: string;
  readonly bodyText: string;
  readonly bodyJson: TipTapDoc | null;
  readonly source: string;
  readonly canonicalUrl: string;
  readonly coverUrl: string;
  readonly tags: readonly string[];
  readonly status: string;
  readonly rawSchedule: string;
  readonly provinceId: string | null;
  readonly cityId: string | null;
  readonly publisherId: string | null;
  readonly authorId: string | null;
  readonly categoryIds: readonly string[];
  readonly leadMediaId: string | null;
  /** Org pemilik yang dituju; diisi saat penerbit cermin org lain dipilih. */
  readonly ownerOrganizationId?: string | null;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Bangun payload artikel dari snapshot form.
 *
 * @param snapshot - Isian form saat ini.
 * @param categoryIds - Id kategori final, termasuk yang baru dibuat redakteur.
 * @returns Payload untuk `article.create` atau `article.update`.
 */
export function buildArticlePayload(
  snapshot: ArticleFormSnapshot,
  categoryIds: readonly string[],
): Record<string, unknown> {
  const scheduledAt = snapshot.status === 'scheduled' ? localDateTimeToIso(snapshot.rawSchedule) : null;
  return {
    regionId: snapshot.cityId ?? snapshot.provinceId,
    publisherId: snapshot.publisherId,
    ...(snapshot.ownerOrganizationId === undefined || snapshot.ownerOrganizationId === null ? {} : { ownerOrganizationId: snapshot.ownerOrganizationId }),
    categoryIds: [...categoryIds],
    authorId: snapshot.authorId,
    leadMediaId: snapshot.leadMediaId,
    slug: snapshot.slug.trim().slice(0, SLUG_MAX_LENGTH),
    title: snapshot.titleText.trim(),
    excerpt: optionalText(snapshot.descriptionText),
    canonicalUrl: optionalText(snapshot.canonicalUrl),
    coverImageUrl: optionalText(snapshot.coverUrl),
    body: snapshot.bodyText.trim().slice(0, ARTICLE_BODY_MAX),
    bodyJson: snapshot.bodyJson,
    source: optionalText(snapshot.source) ?? '',
    tags: normalizeTagList(snapshot.tags).slice(0, TAG_MAX_COUNT),
    status: snapshot.status,
    scheduledAt,
  };
}
