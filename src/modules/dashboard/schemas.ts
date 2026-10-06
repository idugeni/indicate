import { z } from 'zod';

import { isDashboardPermission } from '@/modules/dashboard/permissions';
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  SEO_TITLE_MIN,
} from '@/modules/site/seo-validation';
import { SLUG_MAX_LENGTH, SLUG_PATTERN, TAG_MAX_COUNT, normalizeSlugCandidate, normalizeTagCandidate, normalizeTagList } from '@/modules/site/slug-allocator';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

const TEMPLATE_IDS = new Set(MASTER_TEMPLATE_PRESETS.map((preset) => preset.id));

export function isKnownTemplateId(value: unknown): value is string {
  return typeof value === 'string' && TEMPLATE_IDS.has(value);
}

const id = z.uuid();
const expectedVersion = z.int().positive();
const lifecycleStatus = z.enum(['active', 'inactive', 'archived']);
const articleMode = z.enum(['standard', 'video', 'gallery', 'audio', 'liveblog', 'short']);
/** Playback seconds; empty generic-editor text arrives as `''` and stays null. */
const durationSecondsField = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.union([z.null(), z.coerce.number().int().min(1).max(86400)]),
);

function normalizeSlugInput(value: unknown): unknown {
  if (typeof value !== 'string' || !/[a-z0-9]/i.test(value)) return value;
  return normalizeSlugCandidate(value);
}

/** Category and region slugs name fixed taxonomy, so they keep the short bound. */
const TAXONOMY_SLUG_MAX_LENGTH = 100;
/** Article slugs follow the title instead; `SLUG_MAX_LENGTH` is pinned to this bound. */
export const ARTICLE_TITLE_MAX = 300;
const slug = z.preprocess(normalizeSlugInput, z.string().trim().min(1).max(TAXONOMY_SLUG_MAX_LENGTH).regex(SLUG_PATTERN));
const RESERVED_ARTICLE_SLUGS = new Set(['articles', 'categories', 'tags', 'search', 'report', 'tentang', 'kontak', 'kebijakan-privasi', 'syarat-ketentuan', 'privacy', 'terms', 'about', 'contact', 'services', 'pricing', 'faq', 'api', 'dashboard', 'auth', 'sign-in', 'domain-pending']);
const articleSlug = z.preprocess(normalizeSlugInput, z.string().trim().min(1).max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN))
  .refine((value) => !RESERVED_ARTICLE_SLUGS.has(value), 'Slug ini dicadangkan untuk rute portal.');
const hostname = z.string().trim().toLowerCase().min(3).max(253).regex(/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

export const domainCreateSchema = z.object({ normalizedHostname: hostname, status: lifecycleStatus.default('inactive'), siteTopology: z.enum(['national', 'regional']).default('national') }).strict();
export const domainUpdateSchema = domainCreateSchema.extend({ id, expectedVersion });
export const regionKindSchema = z.enum(['region', 'city']);
/** Familiar public label kept beside the official name; null falls back to `name`. */
const regionShortName = z.string().trim().min(1).max(40).nullable();
export const regionCreateSchema = z.object({ externalKey: slug, name: z.string().trim().min(1).max(160), shortName: regionShortName.default(null), slug, status: lifecycleStatus.default('active'), kind: regionKindSchema.default('region'), parentRegionId: id.nullable().default(null) }).strict();
export const regionUpdateSchema = regionCreateSchema.extend({ id, expectedVersion, kind: regionKindSchema.optional(), parentRegionId: id.nullable().optional(), shortName: regionShortName.optional() });
export const siteCreateSchema = z.object({ domainId: id, regionId: id.nullable(), status: lifecycleStatus.default('inactive') }).strict();
export const siteUpdateSchema = siteCreateSchema.extend({ id, expectedVersion });
export const siteSettingsSchema = z.object({
  siteId: id,
  expectedVersion: expectedVersion.optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  tagline: z.string().trim().min(1).max(120).nullable().optional(),
  seoDefaultTitle: z.string().trim().min(SEO_TITLE_MIN).max(SEO_TITLE_MAX).nullable().optional(),
  seoDefaultDescription: z.string().trim().min(SEO_DESCRIPTION_MIN).max(SEO_DESCRIPTION_MAX).nullable().optional().refine(
    (value) => value === undefined || value === null || (!value.includes(':') && !/portal berita/iu.test(value)),
    'Deskripsi default wajib unik per situs: tanpa titik dua dan tanpa pola template.',
  ),
  seoOpenGraphSiteName: z.string().trim().min(1).max(160).nullable().optional(),
  locale: z.string().trim().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Gunakan format id-ID.').nullable().optional(),
  commentsEnabled: z.boolean().optional(),
  seoRobotsDirective: z.enum(['index,follow', 'noindex,nofollow']).nullable().optional(),
  logoMediaId: id.nullable().optional(),
  faviconMediaId: id.nullable().optional(),
  defaultMediaId: id.nullable().optional(),
  colors: z.record(z.string(), z.string().max(100)).optional().refine(
    (colors) => colors === undefined || isKnownTemplateId(colors.templateId),
    'templateId wajib diisi dari daftar template terdaftar.',
  ),
  socialLinks: z.record(z.string(), z.url()).optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
  navigation: z.array(z.object({ label: z.string().trim().min(1).max(80), path: z.string().startsWith('/').max(250) })).max(30).optional(),
}).strict();
export const siteCachePurgeSchema = z.object({ siteId: id.optional(), confirmBulk: z.literal(true).optional() }).strict()
  .refine((value) => value.siteId !== undefined || value.confirmBulk === true, { message: 'Konfirmasi purge semua situs wajib dicentang.', path: ['confirmBulk'] });
const permissionNames = z.array(z.string().trim().min(1).max(100).refine(isDashboardPermission, 'Unknown or unavailable permission.')).max(100);
const roleTierSchema = z.enum(['admin', 'user', 'superadmin']);
/**
 * Display-name guard: a role name must not impersonate a *different* system
 * tier. Authorization never reads names (ID-joined permission sets only), but
 * the dashboard shows them, so `tier: user` named "Superadmin" would mislead.
 * A name matching the record's own tier stays allowed (e.g. the platform
 * `Superadmin` row, or an org that genuinely calls its admins "Admin").
 * Missing tier on update is treated as `user` (safe default; forms always
 * send tier, and the DB trigger remains the final backstop for superadmin).
 */
function tierNameConsistent(value: { readonly name: string; readonly tier?: string | undefined }): boolean {
  const lowered = value.name.toLowerCase();
  if (!(roleTierSchema.options as readonly string[]).includes(lowered)) return true;
  return (value.tier ?? 'user') === lowered;
}
const tierNameMessage = 'Role name must not impersonate a different system tier.';
export const roleCreateSchema = z.object({ name: z.string().trim().min(1).max(100), tier: roleTierSchema.default('user'), active: z.boolean().default(true), permissions: permissionNames }).strict().refine(tierNameConsistent, tierNameMessage);
export const roleUpdateSchema = z.object({ name: z.string().trim().min(1).max(100), tier: roleTierSchema.optional(), active: z.boolean().default(true), permissions: permissionNames, id, expectedVersion }).strict().refine(tierNameConsistent, tierNameMessage);
export const membershipSchema = z.object({ userId: id, roleId: id, status: lifecycleStatus.default('active'), regionId: id.nullable().default(null), expectedVersion: expectedVersion.optional() }).strict();

/** Single-use tenant invitation: orgId always comes from the actor (not the payload); tokenHash is computed on the client. */
export const invitationCreateSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(320),
  roleId: id,
  tokenHash: z.string().length(64),
}).strict();

export const invitationRevokeSchema = z.object({ id }).strict();

export const publisherCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(['government_institution', 'correctional_institution', 'public_relations_office', 'company', 'organization', 'community', 'independent_publisher']),
  attributionLabel: z.string().trim().min(1).max(200),
  contacts: z.record(z.string(), z.string().trim().max(500)).default({}),
  evidenceReference: z.string().trim().min(1).max(500).nullable().default(null),
}).strict();
export const publisherUpdateSchema = publisherCreateSchema.extend({ id, expectedVersion });
export const publisherDecisionSchema = z.object({ id, expectedVersion, evidenceReference: z.string().trim().min(1).max(500).optional(), reason: z.string().trim().min(1).max(500).optional() }).strict();
export const affiliationSchema = z.object({
  publisherId: id,
  siteId: id,
  institutionName: z.string().trim().min(1).max(200),
  claimScopes: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  evidenceReference: z.string().trim().min(1).max(500),
}).strict();
export const affiliationUpdateSchema = affiliationSchema.omit({ publisherId: true, siteId: true }).extend({ id, expectedVersion, active: z.boolean() });

export const categoryCreateSchema = z.object({ name: z.string().trim().min(1).max(120), slug, status: lifecycleStatus.default('active') }).strict();
export const categoryUpdateSchema = categoryCreateSchema.extend({ id, expectedVersion });
export const categoryDeleteSchema = z.object({ id, expectedVersion }).strict();
/** Canonical kebab-case tag; raw input normalizes first so `Harga Emas` matches `harga-emas`. */
const canonicalTag = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeTagCandidate(value) : value),
  z.string().trim().min(1).max(60),
);
export const tagRenameSchema = z.object({ from: canonicalTag, to: canonicalTag }).strict()
  .refine((value) => value.from !== value.to, 'Tag asal dan tujuan harus berbeda.');
export const tagRemoveSchema = z.object({ tag: canonicalTag }).strict();
export const authorCreateSchema = z.object({ displayName: z.string().trim().min(1).max(160), byline: z.string().trim().min(1).max(200), status: lifecycleStatus.default('active') }).strict();
export const authorUpdateSchema = authorCreateSchema.extend({ id, expectedVersion });

/** Shared article shape; create applies entry defaults, update keeps absences as "keep current". */
const articleBaseFields = {
  regionId: id.nullable(),
  /**
   * Org pemilik yang diminta klien; server selalu menurunkan ulang dari
   * penerbit cermin dan menolak bila tidak cocok (anti-bingung org).
   */
  ownerOrganizationId: id.nullish(),
  /** Ordered category set; first entry is the primary `categoryId` mirror. Omitted on update preserves existing rows. */
  categoryIds: z.array(id).max(10).optional(),
  leadMediaId: id.nullable().optional(),
  coverImageUrl: z.string().trim().max(2000).nullish(),
  slug: articleSlug,
  title: z.string().trim().min(1).max(ARTICLE_TITLE_MAX),
  excerpt: z.string().trim().min(1).max(500).nullish(),
  canonicalUrl: z.string().trim().max(2000).nullish(),
  /** Optional TipTap JSON; strictly validated in the service, legacy `body` stays required for search/RSS. */
  bodyJson: z.unknown().nullish(),
  /** Free-text provenance; optional so a piece can be filed without one. An absent field means "not stated" on create and "keep current" on update. */
  source: z.string().trim().max(500).optional(),
  scheduledAt: z.iso.datetime({ offset: true }).nullish(),
  /** Canonical external watch/file URL for `video` mode; null for other modes. */
  videoUrl: z.string().trim().max(2000).nullish(),
  /** Canonical external listen/file URL for `audio` mode; null otherwise. */
  audioUrl: z.string().trim().max(2000).nullish(),
  /** Playback length in whole seconds for `video`/`audio` modes; null otherwise. */
  durationSeconds: durationSecondsField,
};

/** Cross-check presentation mode against body, cover, and mode URLs. */
function refineArticleMode(
  value: {
    readonly type?: 'standard' | 'video' | 'gallery' | 'audio' | 'liveblog' | 'short' | undefined;
    readonly body?: string | undefined;
    readonly bodyJson?: unknown;
    readonly leadMediaId?: string | null | undefined;
    readonly coverImageUrl?: string | null | undefined;
    readonly videoUrl?: string | null | undefined;
    readonly audioUrl?: string | null | undefined;
    readonly durationSeconds?: number | null | undefined;
  },
  ctx: z.core.$RefinementCtx,
): void {
  if (value.type === 'short' && typeof value.body === 'string' && value.body.trim().length > 500) {
    ctx.addIssue({ code: 'custom', path: ['body'], message: 'Mode short maksimal 500 karakter; pangkas isi atau ganti ke mode standar.' });
  }
  if (value.type === 'video' && (value.videoUrl ?? '').trim() === '' && (value.leadMediaId ?? null) === null && (value.coverImageUrl ?? '').trim() === '') {
    ctx.addIssue({ code: 'custom', path: ['videoUrl'], message: 'Mode video wajib memiliki URL video, sampul terunggah, atau URL sampul luar.' });
  }
  if (value.type === 'audio' && (value.audioUrl ?? '').trim() === '') {
    ctx.addIssue({ code: 'custom', path: ['audioUrl'], message: 'Mode audio wajib memiliki URL audio.' });
  }
  if (value.type === 'liveblog' && value.bodyJson === null) {
    ctx.addIssue({ code: 'custom', path: ['bodyJson'], message: 'Mode liveblog wajib memakai editor terstruktur (isi JSON tidak boleh kosong).' });
  }
  for (const field of ['videoUrl', 'audioUrl'] as const) {
    const url = value[field];
    if (url !== undefined && url !== null && url.trim() !== '' && !/^https?:\/\//i.test(url.trim())) {
      ctx.addIssue({ code: 'custom', path: [field], message: 'URL harus diawali http:// atau https://.' });
    }
  }
  if (value.durationSeconds !== undefined && value.durationSeconds !== null && value.type !== 'video' && value.type !== 'audio') {
    ctx.addIssue({ code: 'custom', path: ['durationSeconds'], message: 'Durasi hanya berlaku untuk mode video atau audio.' });
  }
}

export const articleCreateSchema = z.object({
  ...articleBaseFields,
  publisherId: id.nullable().default(null),
  categoryId: id.nullable().default(null),
  authorId: id.nullable().default(null),
  body: z.string().trim().min(1).max(200_000),
  tags: z.preprocess((value) => (Array.isArray(value) ? normalizeTagList(value) : value), z.array(z.string().trim().min(1).max(60)).max(TAG_MAX_COUNT)).default([]),
  status: z.enum(['draft', 'in_review', 'scheduled', 'active']).default('draft'),
  /** Presentation mode; mirrors the `article_type` enum (`standard` for legacy rows). */
  type: articleMode.default('standard'),
  /** Paid-content flag driving the sponsored disclosure on delivery surfaces. */
  isSponsored: z.boolean().default(false),
}).strict().superRefine(refineArticleMode);
export const articleUpdateSchema = z.object({
  ...articleBaseFields,
  publisherId: id.nullable().default(null),
  categoryId: id.nullable().default(null),
  authorId: id.nullable().default(null),
  id,
  expectedVersion,
  body: z.string().trim().min(1).max(200_000).optional(),
  /** Absent tags preserve the stored set; only an explicit array replaces it. */
  tags: z.preprocess((value) => (Array.isArray(value) ? normalizeTagList(value) : value), z.array(z.string().trim().min(1).max(60)).max(TAG_MAX_COUNT)).optional(),
  status: z.enum(['draft', 'in_review', 'scheduled', 'active']).default('draft'),
  /** Update omits defaults: absent mode fields mean "keep current", never "reset to standard". */
  type: articleMode.optional(),
  isSponsored: z.boolean().optional(),
}).strict().superRefine(refineArticleMode);
export const articleTransitionSchema = z.object({ id, expectedVersion, ownerOrganizationId: id.optional() }).strict();
export const articleDeleteSchema = z.object({ id, expectedVersion, ownerOrganizationId: id.optional() }).strict();
/** Muat satu artikel pemilik beserta lookup org-nya untuk editor steward. */
export const articleEditLoadSchema = z.object({ id, ownerOrganizationId: id }).strict();
/** Steward cross-org listing filters; org-scoped ids are rejected here and stay single-org only. */
export const crossOrgArticleFilterSchema = z.object({
  status: z.enum(['draft', 'in_review', 'scheduled', 'active', 'archived']).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  search: z.string().trim().max(300).optional(),
  sort: z.enum(['updated', 'published-desc', 'published-asc', 'title', 'syndicated']).optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']).optional(),
  limit: z.coerce.number().int().min(0).max(500).optional(), cursor: z.uuid().optional(),
}).strict();
/** List entri liveblog milik satu artikel mode `liveblog`. */
export const articleUpdateListSchema = z.object({ articleId: id, ownerOrganizationId: id.optional() }).strict();
/** Tambah satu entri liveblog; `sortOrder` diisi server sebagai max+1. */
export const articleUpdateCreateSchema = z.object({
  articleId: id,
  body: z.string().trim().min(1).max(20000),
  ownerOrganizationId: id.optional(),
}).strict();
export const articleUpdateUpdateSchema = z.object({
  id,
  expectedVersion,
  body: z.string().trim().min(1).max(20000),
  ownerOrganizationId: id.optional(),
}).strict();
export const articleUpdateDeleteSchema = z.object({ id, expectedVersion, ownerOrganizationId: id.optional() }).strict();
export const assignmentSchema = z.object({ articleId: id, siteIds: z.array(id).max(200) }).strict();
/**
 * Terbitkan artikel milik org lain ke portal org aktif (jembatan lintas-org).
 *
 * @remarks `ownerOrganizationId` adalah org pemilik artikel (mis. UPT), bukan
 * org aktif pemanggil. Hanya steward platform yang boleh memakainya;
 * penerbitan satu-org tetap lewat `assignmentSchema` + antrean pekerja.
 */
export const bridgeRequestSchema = z.object({ ownerOrganizationId: id, articleId: id, siteIds: z.array(id).min(1).max(200), viewCount: z.int().min(0).max(1_000_000_000).optional() }).strict();
/** Tarik penayangan jembatan; artikel pemilik tidak diubah. */
export const bridgeUnpublishSchema = z.object({ ownerOrganizationId: id, articleId: id, siteIds: z.array(id).max(200) }).strict();
/** Minta penayangan otomatis draf humas ke portal kota asalnya. */
export const bridgeAutoRequestSchema = z.object({ ownerOrganizationId: id, articleId: id, viewCount: z.int().min(0).max(1_000_000_000).optional() }).strict();
export const siteViewsSchema = z.object({ articleId: id, siteId: id, viewCount: z.int().min(0).max(1_000_000_000) }).strict();
export const siteViewsBulkSchema = z.object({ articleId: id, siteIds: z.array(id).min(1).max(200), viewCount: z.int().min(0).max(1_000_000_000) }).strict();
export const articleFilterSchema = z.object({
  regionId: id.optional(), siteId: id.optional(), siteHostname: z.string().trim().min(1).max(253).optional(),
  categoryId: id.optional(), publisherId: id.optional(), authorId: id.optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']).optional(),
  status: z.enum(['draft', 'in_review', 'scheduled', 'active', 'archived']).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  search: z.string().trim().max(300).optional(),
  sort: z.enum(['updated', 'published-desc', 'published-asc', 'title', 'syndicated']).optional(),
  limit: z.coerce.number().int().min(0).max(500).optional(), cursor: z.uuid().optional(),
}).strict();
export const auditFilterSchema = z.object({
  actorId: z.string().max(200).optional(), action: z.string().max(200).optional(), targetType: z.string().max(100).optional(),
  outcome: z.enum(['succeeded', 'denied', 'failed']).optional(), from: z.iso.datetime().optional(), to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(), cursor: z.string().max(200).optional(),
}).strict();

export type DomainCreateInput = z.infer<typeof domainCreateSchema>;
export type RegionCreateInput = z.infer<typeof regionCreateSchema>;
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type PublisherCreateInput = z.infer<typeof publisherCreateSchema>;
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;


export const analyticsFilterSchema = z.object({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).strict();
