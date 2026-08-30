import { z } from 'zod';

import { isStage3Permission } from '@/domain/stage3/permissions';

const id = z.uuid();
const expectedVersion = z.int().positive();
const lifecycleStatus = z.enum(['active', 'inactive', 'archived']);
const slug = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
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
  description: z.string().trim().max(1000),
  colors: z.record(z.string(), z.string().max(100)).optional(),
  socialLinks: z.record(z.string(), z.url()).optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
  navigation: z.array(z.object({ label: z.string().trim().min(1).max(80), path: z.string().startsWith('/').max(250) })).max(30).optional(),
}).strict();
const permissionNames = z.array(z.string().trim().min(1).max(100).refine(isStage3Permission, 'Unknown or unavailable permission.')).max(100);
export const roleCreateSchema = z.object({ name: z.string().trim().min(1).max(100), active: z.boolean().default(true), permissions: permissionNames }).strict();
export const roleUpdateSchema = roleCreateSchema.extend({ id, expectedVersion });
export const membershipSchema = z.object({ userId: id, roleId: id, status: lifecycleStatus.default('active'), expectedVersion: expectedVersion.optional() }).strict();

export const publisherCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(['government_institution', 'rutan_lapas', 'public_relations_office', 'company', 'organization', 'community', 'independent_publisher']),
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
  slug,
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(200_000),
  source: z.string().trim().min(1).max(500),
  status: z.enum(['draft', 'active']).default('draft'),
}).strict();
export const articleUpdateSchema = articleCreateSchema.extend({ id, expectedVersion });
export const articleTransitionSchema = z.object({ id, expectedVersion }).strict();
export const assignmentSchema = z.object({ articleId: id, siteIds: z.array(id).max(200) }).strict();
export const articleFilterSchema = z.object({
  regionId: id.optional(), siteId: id.optional(), categoryId: id.optional(), publisherId: id.optional(), authorId: id.optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying']).optional(),
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
