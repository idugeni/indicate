import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { auditLogs, organizations } from '@/data/schema';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';

const uuidSchema = z.uuid();
const organizationQuerySchema = z.object({ organizationId: uuidSchema });
const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/iu);
const contactDetailsSchema = z.object({
  email: z.string().trim().email().max(254).or(z.literal('')).optional(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().url().max(2000).refine((value) => value.startsWith('https://'), 'Website harus menggunakan HTTPS.').or(z.literal('')).optional(),
  address: z.string().trim().max(500).optional(),
}).strict();
const visualIdentitySchema = z.object({
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
}).strict();
const identityProfileSchema = z.object({
  schemaVersion: z.literal(1),
  description: z.string().max(2000),
  logoUrl: z.string().url().max(2000).refine((value) => value.startsWith('https://')).nullable(),
  contactDetails: contactDetailsSchema,
  visualIdentity: visualIdentitySchema,
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
  logoUrl: z.string().trim().url().max(2000).refine((value) => value.startsWith('https://'), 'Logo harus menggunakan HTTPS.').or(z.literal('')).nullable(),
  contactDetails: contactDetailsSchema,
  visualIdentity: visualIdentitySchema,
}).strict();

type IdentityProfile = z.infer<typeof identityProfileSchema>;
function readIdentityProfile(stored: unknown): IdentityProfile {
  if (stored === undefined || stored === null) return defaultIdentityProfile;
  return identityProfileSchema.parse(stored);
}
function publicProfile(row: { id: string; name: string; slug: string; identityData: unknown; customerMetadata?: unknown; version: number }) {
  const identity = readIdentityProfile(row.identityData);
  // Older tenant records store contact information at the customer_metadata root.
  // Keep explicit organizationIdentity values authoritative, using legacy fields only as fallbacks.
  const metadata = row.customerMetadata && typeof row.customerMetadata === 'object' && !Array.isArray(row.customerMetadata)
    ? row.customerMetadata as Record<string, unknown>
    : {};
  const contactDetails = identity.contactDetails;
  const legacyString = (key: string) => typeof metadata[key] === 'string' ? (metadata[key] as string).trim() : '';
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ...identity,
    contactDetails: {
      ...contactDetails,
      ...(!contactDetails.phone && legacyString('phone') ? { phone: legacyString('phone') } : {}),
      ...(!contactDetails.address && legacyString('address') ? { address: legacyString('address') } : {}),
      ...(!contactDetails.website && legacyString('site_url') ? { website: legacyString('site_url') } : {}),
    },
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
    const rows = await database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${requestId})`);
      return transaction.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        identityData: sql<unknown>`${organizations.customerMetadata} -> 'organizationIdentity'`,
        customerMetadata: organizations.customerMetadata,
        version: organizations.version,
      }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
    });
    const row = rows[0];
    if (row === undefined) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    return NextResponse.json({ ...publicProfile(row), canManage: actor.permissionSet.has(DASHBOARD_PERMISSIONS.roleManage) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.membershipManage) });
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
        version: organizations.version,
      }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
      const current = currentRows[0];
      if (current === undefined) return { kind: 'missing' as const };
      if (current.version !== parsed.data.expectedVersion) return { kind: 'conflict' as const };
      const currentIdentity = readIdentityProfile(current.identityData);
      const nextIdentity: IdentityProfile = {
        schemaVersion: 1,
        description: parsed.data.description,
        logoUrl: parsed.data.logoUrl === '' ? null : parsed.data.logoUrl,
        contactDetails: {
          ...(parsed.data.contactDetails.email ? { email: parsed.data.contactDetails.email } : {}),
          ...(parsed.data.contactDetails.phone ? { phone: parsed.data.contactDetails.phone } : {}),
          ...(parsed.data.contactDetails.website ? { website: parsed.data.contactDetails.website } : {}),
          ...(parsed.data.contactDetails.address ? { address: parsed.data.contactDetails.address } : {}),
        },
        visualIdentity: Object.fromEntries(Object.entries(parsed.data.visualIdentity).filter(([, value]) => value !== undefined)),
      };
      const nextName = parsed.data.name;
      const before = { name: current.name, description: currentIdentity.description, logoUrl: currentIdentity.logoUrl, contactDetails: currentIdentity.contactDetails, visualIdentity: currentIdentity.visualIdentity };
      const after = { name: nextName, description: nextIdentity.description, logoUrl: nextIdentity.logoUrl, contactDetails: nextIdentity.contactDetails, visualIdentity: nextIdentity.visualIdentity };
      const changedFields = (Object.keys(after) as (keyof typeof after)[]).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
      if (changedFields.length === 0) return { kind: 'saved' as const, profile: publicProfile(current) };
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
      return { kind: 'saved' as const, profile: publicProfile(updated) };
    });
    if (result.kind === 'missing') return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (result.kind === 'conflict') return NextResponse.json(createPublicError('CONFLICT', 'Identitas organisasi berubah di sesi lain. Muat ulang sebelum menyimpan lagi.', requestId), { status: 409 });
    return NextResponse.json({ ...result.profile, canManage: true });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Identitas organisasi gagal disimpan.', requestId), { status: 503 });
  }
}

export { handleGET as GET, handlePOST as POST };
