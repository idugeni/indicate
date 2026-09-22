import { z } from 'zod';

import { isDashboardPermission } from '@/modules/dashboard/permissions';
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  SEO_TITLE_MIN,
} from '@/modules/site/seo-validation';
import { TAG_MAX_COUNT, normalizeSlugCandidate, normalizeTagList } from '@/modules/site/slug-allocator';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

const TEMPLATE_IDS = new Set(MASTER_TEMPLATE_PRESETS.map((preset) => preset.id));

export function isKnownTemplateId(value: unknown): value is string {
  return typeof value === 'string' && TEMPLATE_IDS.has(value);
}

const id = z.uuid();
const expectedVersion = z.int().positive();
const lifecycleStatus = z.enum(['active', 'inactive', 'archived']);

function normalizeSlugInput(value: unknown): unknown {
  if (typeof value !== 'string' || !/[a-z0-9]/i.test(value)) return value;
  return normalizeSlugCandidate(value);
}

const slug = z.preprocess(normalizeSlugInput, z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
const RESERVED_ARTICLE_SLUGS = new Set(['articles', 'categories', 'tags', 'search', 'report', 'tentang', 'kontak', 'kebijakan-privasi', 'syarat-ketentuan', 'privacy', 'terms', 'about', 'contact', 'services', 'pricing', 'faq', 'api', 'dashboard', 'auth', 'sign-in', 'domain-pending']);
const articleSlug = slug.refine((value) => !RESERVED_ARTICLE_SLUGS.has(value), 'Slug ini dicadangkan untuk rute portal.');
const hostname = z.string().trim().toLowerCase().min(3).max(253).regex(/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

export const domainCreateSchema = z.object({ normalizedHostname: hostname, status: lifecycleStatus.default('inactive') }).strict();
export const domainUpdateSchema = domainCreateSchema.extend({ id, expectedVersion });
export const regionCreateSchema = z.object({ externalKey: slug, name: z.string().trim().min(1).max(160), slug, status: lifecycleStatus.default('active') }).strict();
export const regionUpdateSchema = regionCreateSchema.extend({ id, expectedVersion });
export const siteCreateSchema = z.object({ domainId: id, regionId: id.nullable(), normalizedHostname: hostname, status: lifecycleStatus.default('inactive') }).strict();
export const siteUpdateSchema = siteCreateSchema.extend({ id, expectedVersion });
export const siteSettingsSchema = z.object({
  siteId: id,
  expectedVersion: expectedVersion.optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  tagline: z.string().trim().min(1).max(120).nullable().optional(),
  seoDefaultTitle: z.string().trim().min(SEO_TITLE_MIN).max(SEO_TITLE_MAX).nullable().optional(),
  seoDefaultDescription: z.string().trim().min(SEO_DESCRIPTION_MIN).max(SEO_DESCRIPTION_MAX).nullable().optional(),
  seoOpenGraphSiteName: z.string().trim().min(1).max(160).nullable().optional(),
  locale: z.string().trim().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Gunakan format id-ID.').nullable().optional(),
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
export const authorCreateSchema = z.object({ displayName: z.string().trim().min(1).max(160), byline: z.string().trim().min(1).max(200), status: lifecycleStatus.default('active') }).strict();
export const authorUpdateSchema = authorCreateSchema.extend({ id, expectedVersion });
export const articleCreateSchema = z.object({
  regionId: id,
  publisherId: id.nullable().default(null),
  categoryId: id.nullable().default(null),
  authorId: id.nullable().default(null),
  slug: articleSlug,
  title: z.string().trim().min(1).max(300),
  dek: z.string().trim().min(1).max(300).nullish(),
  excerpt: z.string().trim().min(1).max(500).nullish(),
  canonicalUrl: z.string().trim().max(2000).nullish(),
  body: z.string().trim().min(1).max(200_000),
  source: z.string().trim().min(1).max(500),
  tags: z.preprocess((value) => (Array.isArray(value) ? normalizeTagList(value) : value), z.array(z.string().trim().min(1).max(60)).max(TAG_MAX_COUNT)).default([]),
  status: z.enum(['draft', 'in_review', 'scheduled', 'active']).default('draft'),
  scheduledAt: z.iso.datetime().nullish(),
}).strict();
export const articleUpdateSchema = articleCreateSchema.extend({ id, expectedVersion });
export const articleTransitionSchema = z.object({ id, expectedVersion }).strict();
export const assignmentSchema = z.object({ articleId: id, siteIds: z.array(id).max(200) }).strict();
export const siteViewsSchema = z.object({ articleId: id, siteId: id, viewCount: z.int().min(0).max(1_000_000_000) }).strict();
export const articleFilterSchema = z.object({
  regionId: id.optional(), siteId: id.optional(), categoryId: id.optional(), publisherId: id.optional(), authorId: id.optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']).optional(),
  search: z.string().trim().max(300).optional(),
}).strict();
export const auditFilterSchema = z.object({
  actorId: z.string().max(200).optional(), action: z.string().max(200).optional(), targetType: z.string().max(100).optional(),
  outcome: z.enum(['succeeded', 'denied', 'failed']).optional(), from: z.iso.datetime().optional(), to: z.iso.datetime().optional(),
}).strict();

export type DomainCreateInput = z.infer<typeof domainCreateSchema>;
export type RegionCreateInput = z.infer<typeof regionCreateSchema>;
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type PublisherCreateInput = z.infer<typeof publisherCreateSchema>;
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;


export const analyticsFilterSchema = z.object({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).strict();
