import { SLUG_MAX_LENGTH, TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import type { TipTapDoc } from '@/modules/site/tiptap-document';
import { localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';

/** Autosave tidak pernah menerbitkan, jadi statusnya dipaksa di sini. */
const AUTOSAVE_STATUS = 'draft';
const ARTICLE_BODY_MAX = 200_000;
const SLUG_SHAPE = /^[a-z0-9-]+$/u;

/**
 * Isian form yang dipakai bersama oleh autosave dan submit.
 *
 * @remarks Sengaja tidak membaca `FormData`: autosave dipicu dari `useEffect`
 * yang tidak punya akses ke event form, jadi sumber kebenaran tunggal harus
 * state React.
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
}

/**
 * Rujukan artikel yang sudah tersimpan oleh autosave.
 */
export interface AutosavedDraft {
  readonly id: string;
  readonly version: number;
  readonly slug: string;
}

/**
 * Perintah workspace dashboard; menolak dilawan dan mengembalikan null saat gagal.
 */
export type ArticleCommand = (action: string, payload: unknown) => Promise<unknown>;

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

/**
 * Susun payload autosave dari snapshot form.
 *
 * @param snapshot - Isian form saat ini.
 * @param serverCategoryIds - Id kategori yang sudah ada di server saja.
 * @returns Payload autosave, atau null bila form belum cukup lengkap untuk disimpan.
 * @remarks Kategori lokal (`new:`) sengaja dikecualikan. Membuatnya di sini akan
 * melanggar janji bahwa kategori baru tidak menyentuh server sebelum artikel
 * disimpan; nama yang diketik tetap ada di cermin `localStorage` sehingga tidak
 * hilang saat tab dimuat ulang.
 * @remarks Syarat lengkap mengikuti `articleCreateSchema`: slug, judul, isi, dan
 * wilayah. Tanpa wilayah, `articleCreateSchema` menolak apa pun yang dikirim.
 */
export function buildAutosavePayload(
  snapshot: ArticleFormSnapshot,
  serverCategoryIds: readonly string[],
): Record<string, unknown> | null {
  const slug = snapshot.slug.trim();
  if (slug === '' || !SLUG_SHAPE.test(slug)) return null;
  if ((snapshot.cityId ?? snapshot.provinceId) === null) return null;
  if (snapshot.titleText.trim() === '') return null;
  if (snapshot.bodyText.trim() === '') return null;
  const payload = buildArticlePayload(
    { ...snapshot, status: AUTOSAVE_STATUS, rawSchedule: '' },
    serverCategoryIds,
  );
  return { ...payload, scheduledAt: null };
}

/**
 * Tulis artikel sebagai draft baru, atau perbarui draft autosave yang sudah ada.
 *
 * @param command - Perintah workspace dashboard.
 * @param payload - Payload artikel dari `buildArticlePayload`.
 * @param existing - Draft hasil autosave sebelumnya; null berarti buat baru.
 * @returns Rujukan draft tersimpan, atau null bila gagal atau organisasi berganti.
 * @remarks Percabangan create/update dipusatkan di sini supaya autosave dan
 * submit tidak pernah berbeda tentang payload yang sama.
 */
export async function persistDraftArticle(
  command: ArticleCommand,
  payload: Record<string, unknown>,
  existing: AutosavedDraft | null,
): Promise<AutosavedDraft | null> {
  try {
    const raw = existing === null
      ? await command('article.create', payload)
      : await command('article.update', { ...payload, id: existing.id, expectedVersion: existing.version });
    const record = raw as { readonly id?: unknown; readonly slug?: unknown; readonly version?: unknown } | null;
    if (record === null || typeof record.id !== 'string') return null;
    return {
      id: record.id,
      version: typeof record.version === 'number' ? record.version : (existing?.version ?? 1) + 1,
      slug: typeof record.slug === 'string' ? record.slug : (existing?.slug ?? ''),
    };
  } catch {
    return null;
  }
}
