import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { auditLogs, organizations, publishers } from '@/data/schema';
import { SOCIAL_ORDER } from '@/modules/site/company-contact';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';

const uuidSchema = z.uuid();
const organizationQuerySchema = z.object({ organizationId: uuidSchema });
const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/iu);
const httpsUrlSchema = z.string().trim().url().max(2000).refine((value) => value.startsWith('https://'));
const internalLogoPathSchema = z.string().regex(/^\/(?:api\/network\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|brand\/[a-z0-9_-]+(?:[./-][a-z0-9_-]+)*\.(?:svg|png|jpe?g|webp))$/iu);
const logoUrlSchema = z.union([httpsUrlSchema, internalLogoPathSchema, z.literal('')]);
const contactDetailsSchema = z.object({
  email: z.string().trim().email().max(254).or(z.literal('')).optional(),
  phone: z.string().trim().max(40).optional(),
  website: httpsUrlSchema.or(z.literal('')).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(160).optional(),
}).strict();
const socialLinksSchema = z.record(z.string(), httpsUrlSchema).superRefine((links, context) => {
  for (const key of Object.keys(links)) {
    if (!(SOCIAL_ORDER as readonly string[]).includes(key)) {
      context.addIssue({ code: 'custom', path: [key], message: 'Kanal sosial tidak didukung.' });
    }
  }
});
const visualIdentitySchema = z.object({
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
}).strict();
const identityProfileSchema = z.object({
  schemaVersion: z.literal(1),
  description: z.string().max(2000),
  logoUrl: logoUrlSchema.nullable(),
  contactDetails: contactDetailsSchema,
  visualIdentity: visualIdentitySchema,
  socialLinks: socialLinksSchema.optional(),
}).strict();
const defaultIdentityProfile = identityProfileSchema.parse({
  schemaVersion: 1,
  description: '',
  logoUrl: null,
  contactDetails: {},
  visualIdentity: {},
});
const updateSchema = z.object({
  organizationId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000),
  logoUrl: logoUrlSchema.nullable(),
  contactDetails: contactDetailsSchema,
  visualIdentity: visualIdentitySchema,
  socialLinks: socialLinksSchema.optional(),
}).strict();

type IdentityProfile = z.infer<typeof identityProfileSchema>;
function readIdentityProfile(stored: unknown): IdentityProfile {
  if (stored === undefined || stored === null) return defaultIdentityProfile;
  return identityProfileSchema.parse(stored);
}
function recordOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

function safeLogoValue(value: unknown): string | null {
  const parsed = logoUrlSchema.safeParse(value);
  return parsed.success && parsed.data !== '' ? parsed.data : null;
}

function publicProfile(
  row: { id: string; name: string; slug: string; identityData: unknown; customerMetadata?: unknown; version: number },
  publisherContacts?: unknown,
) {
  const identity = readIdentityProfile(row.identityData);
  const metadata = recordOf(row.customerMetadata);
  const publisher = recordOf(publisherContacts);
  const contactDetails = identity.contactDetails;
  const socialLinks = identity.socialLinks ?? Object.fromEntries(
    SOCIAL_ORDER.flatMap((key) => {
      const value = firstText(publisher[key]);
      return value === undefined ? [] : [[key, value]];
    }),
  );
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ...identity,
    description: firstText(identity.description, publisher.bio, metadata.description) ?? '',
    logoUrl: identity.logoUrl === '' ? null : identity.logoUrl ?? safeLogoValue(publisher.logoUrl),
    contactDetails: {
      ...contactDetails,
      ...(!contactDetails.email && firstText(publisher.email, metadata.email) ? { email: firstText(publisher.email, metadata.email) } : {}),
      ...(!contactDetails.phone && firstText(publisher.phone, metadata.phone) ? { phone: firstText(publisher.phone, metadata.phone) } : {}),
      ...(!contactDetails.address && firstText(publisher.address, metadata.address) ? { address: firstText(publisher.address, metadata.address) } : {}),
      ...(!contactDetails.city && firstText(publisher.city, metadata.city) ? { city: firstText(publisher.city, metadata.city) } : {}),
      ...(!contactDetails.website && firstText(publisher.website, publisher.detailUrl, metadata.website, metadata.detailUrl, metadata.site_url) ? { website: firstText(publisher.website, publisher.detailUrl, metadata.website, metadata.detailUrl, metadata.site_url) } : {}),
    },
    socialLinks,
    version: row.version,
  };
}

async function resolveActor(organizationId: string, requestId: string) {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return null;
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  return actor === null ? null : { actor, database: runtime.db };
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const parsedQuery = organizationQuerySchema.safeParse({ organizationId: new URL(request.url).searchParams.get('organizationId') });
  if (!parsedQuery.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await resolveActor(parsedQuery.data.organizationId, requestId);
  if (context === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const { actor, database } = context;
  try {
    const profile = await database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${requestId})`);
      const rows = await transaction.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        identityData: sql<unknown>`${organizations.customerMetadata} -> 'organizationIdentity'`,
        customerMetadata: organizations.customerMetadata,
        version: organizations.version,
      }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const candidatePublishers = await transaction.select({
        name: publishers.name,
        contacts: publishers.contacts,
      }).from(publishers)
        .where(and(eq(publishers.organizationId, actor.organizationId), eq(publishers.status, 'active')))
        .orderBy(sql`CASE WHEN lower(${publishers.name}) = lower(${row.name}) THEN 0 ELSE 1 END`, asc(publishers.name))
        .limit(2);
      const primaryPublisher = candidatePublishers.find((item) => item.name.toLowerCase() === row.name.toLowerCase())
        ?? (candidatePublishers.length === 1 ? candidatePublishers[0] : undefined);
      return { row, publisherContacts: primaryPublisher?.contacts };
    });
    if (profile === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    return NextResponse.json({ ...publicProfile(profile.row, profile.publisherContacts), canManage: actor.permissionSet.has(DASHBOARD_PERMISSIONS.roleManage) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.membershipManage) });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Profil organisasi tidak dapat dimuat.', requestId), { status: 503 });
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Periksa kembali data identitas organisasi.', requestId), { status: 400 });
  const context = await resolveActor(parsed.data.organizationId, requestId);
  if (context === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const { actor, database } = context;
  const mayManage = actor.permissionSet.has(DASHBOARD_PERMISSIONS.roleManage)
    || actor.permissionSet.has(DASHBOARD_PERMISSIONS.membershipManage);
  if (!mayManage) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  try {
    const result = await database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${requestId})`);
      const currentRows = await transaction.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        identityData: sql<unknown>`${organizations.customerMetadata} -> 'organizationIdentity'`,
        customerMetadata: organizations.customerMetadata,
        version: organizations.version,
      }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
      const current = currentRows[0];
      if (current === undefined) return { kind: 'missing' as const };
      if (current.version !== parsed.data.expectedVersion) return { kind: 'conflict' as const };
      const candidatePublishers = await transaction.select({
        name: publishers.name,
        contacts: publishers.contacts,
      }).from(publishers)
        .where(and(eq(publishers.organizationId, actor.organizationId), eq(publishers.status, 'active')))
        .orderBy(sql`CASE WHEN lower(${publishers.name}) = lower(${current.name}) THEN 0 ELSE 1 END`, asc(publishers.name))
        .limit(2);
      const primaryPublisher = candidatePublishers.find((item) => item.name.toLowerCase() === current.name.toLowerCase())
        ?? (candidatePublishers.length === 1 ? candidatePublishers[0] : undefined);
      const publisherContacts = primaryPublisher?.contacts;
      const currentIdentity = readIdentityProfile(current.identityData);
      const nextIdentity: IdentityProfile = {
        schemaVersion: 1,
        description: parsed.data.description,
        logoUrl: parsed.data.logoUrl,
        contactDetails: {
          ...(parsed.data.contactDetails.email ? { email: parsed.data.contactDetails.email } : {}),
          ...(parsed.data.contactDetails.phone ? { phone: parsed.data.contactDetails.phone } : {}),
          ...(parsed.data.contactDetails.website ? { website: parsed.data.contactDetails.website } : {}),
          ...(parsed.data.contactDetails.address ? { address: parsed.data.contactDetails.address } : {}),
          ...(parsed.data.contactDetails.city ? { city: parsed.data.contactDetails.city } : {}),
        },
        visualIdentity: Object.fromEntries(Object.entries(parsed.data.visualIdentity).filter(([, value]) => value !== undefined)),
        socialLinks: Object.fromEntries(Object.entries(parsed.data.socialLinks ?? currentIdentity.socialLinks ?? {}).filter(([, value]) => value.trim() !== '')),
      };
      const nextName = parsed.data.name;
      const before = {
        name: current.name,
        description: currentIdentity.description,
        logoUrl: currentIdentity.logoUrl,
        contactDetails: currentIdentity.contactDetails,
        visualIdentity: currentIdentity.visualIdentity,
        socialLinks: currentIdentity.socialLinks ?? {},
      };
      const after = {
        name: nextName,
        description: nextIdentity.description,
        logoUrl: nextIdentity.logoUrl,
        contactDetails: nextIdentity.contactDetails,
        visualIdentity: nextIdentity.visualIdentity,
        socialLinks: nextIdentity.socialLinks ?? {},
      };
      const changedFields = (Object.keys(after) as (keyof typeof after)[]).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
      if (changedFields.length === 0) return { kind: 'saved' as const, profile: publicProfile(current, publisherContacts) };
      const updatedRows = await transaction.update(organizations).set({
        name: nextName,
        customerMetadata: sql`jsonb_set(${organizations.customerMetadata}, '{organizationIdentity}', ${JSON.stringify(nextIdentity)}::jsonb, true)`,
        version: current.version + 1,
        updatedAt: new Date(),
      }).where(and(eq(organizations.id, actor.organizationId), eq(organizations.version, current.version))).returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        identityData: sql<unknown>`${organizations.customerMetadata} -> 'organizationIdentity'`,
        customerMetadata: organizations.customerMetadata,
        version: organizations.version,
      });
      const updated = updatedRows[0];
      if (updated === undefined) return { kind: 'conflict' as const };
      await transaction.insert(auditLogs).values({
        organizationId: actor.organizationId,
        id: crypto.randomUUID(),
        actorType: actor.actorType,
        actorId: actor.actorId,
        entryPoint: actor.entryPoint,
        action: 'organization.identity.update',
        targetType: 'organization',
        targetId: actor.organizationId,
        outcome: 'succeeded',
        changedFields,
        before: Object.fromEntries(changedFields.map((key) => [key, before[key]])),
        after: Object.fromEntries(changedFields.map((key) => [key, after[key]])),
        requestId,
      });
      return { kind: 'saved' as const, profile: publicProfile(updated, publisherContacts) };
    });
    if (result.kind === 'missing') return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (result.kind === 'conflict') return NextResponse.json(createPublicError('CONFLICT', 'Identitas organisasi berubah di sesi lain. Muat ulang sebelum menyimpan lagi.', requestId), { status: 409 });
    return NextResponse.json({ ...result.profile, canManage: true });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Identitas organisasi gagal disimpan.', requestId), { status: 503 });
  }
}

export { handleGET as GET, handlePOST as POST };
