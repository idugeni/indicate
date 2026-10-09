import 'server-only';

import { z } from 'zod';

import type { ActorContext } from '@/core/operation-context';
import { mediaListSchema, publicationStatusSchema } from '@/modules/publishing/schemas';

/**
 * AI Operator tool policy. This registry is the allow-list for tools that may
 * be exposed to an AI planner; it is not a substitute for service/API guards.
 */
export type AiOperatorRisk = 'read' | 'write' | 'high';
export type AiOperatorScope = 'tenant' | 'platform';

const uuid = z.uuid();
const searchText = z.string().trim().max(200).optional();

const articleSearchInput = z.object({
  query: searchText,
  limit: z.number().int().min(1).max(100).optional(),
}).strict();

const articleCreateInput = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(50_000),
  categoryId: uuid.optional(),
  status: z.enum(['draft', 'in_review']).default('draft'),
}).strict();

const articleUpdateInput = z.object({
  articleId: uuid,
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(50_000).optional(),
  status: z.enum(['draft', 'in_review', 'scheduled', 'archived']).optional(),
}).strict().refine((value) => value.title !== undefined || value.body !== undefined || value.status !== undefined, {
  message: 'Minimal satu field perubahan harus diisi.',
});

const emptyInput = z.object({}).strict();
const siteSearchInput = z.object({ query: searchText }).strict();
const auditReadInput = z.object({
  actorId: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  targetType: z.string().max(100).optional(),
  outcome: z.enum(['succeeded', 'denied', 'failed']).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: z.string().max(200).optional(),
}).strict();
const deliveryRequestInput = z.object({
  articleId: uuid,
  publisherIds: z.array(uuid).min(1).max(50),
}).strict();

const tool = <T extends z.ZodType>(definition: {
  readonly id: string;
  readonly description: string;
  readonly scope: AiOperatorScope;
  readonly risk: AiOperatorRisk;
  readonly requiredPermissions: readonly string[];
  readonly requireAnyPermission?: boolean;
  readonly requiresApproval?: boolean;
  readonly input: T;
}) => Object.freeze({
  ...definition,
  requiresApproval: definition.requiresApproval ?? definition.risk !== 'read',
});

export const AI_OPERATOR_TOOLS = Object.freeze({
  'dashboard.overview.read': tool({
    id: 'dashboard.overview.read',
    description: 'Membaca ringkasan dashboard organisasi aktif.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['dashboard.read'],
    input: emptyInput,
  }),
  'analytics.overview.read': tool({
    id: 'analytics.overview.read',
    description: 'Membaca ringkasan analitik organisasi aktif.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['analytics.read'],
    input: emptyInput,
  }),
  'content.articles.search': tool({
    id: 'content.articles.search',
    description: 'Mencari artikel dalam organisasi aktif.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['article.read'],
    input: articleSearchInput,
  }),
  'content.articles.create': tool({
    id: 'content.articles.create',
    description: 'Membuat artikel baru sebagai draft atau in-review.',
    scope: 'tenant',
    risk: 'write',
    requiredPermissions: ['article.manage'],
    input: articleCreateInput,
  }),
  'content.articles.update': tool({
    id: 'content.articles.update',
    description: 'Memperbarui field artikel tertentu.',
    scope: 'tenant',
    risk: 'write',
    requiredPermissions: ['article.manage'],
    input: articleUpdateInput,
  }),
  'operations.summary.read': tool({
    id: 'operations.summary.read',
    description: 'Membaca ringkasan operasi dan antrean pemeliharaan organisasi aktif.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['audit.read'],
    input: emptyInput,
  }),
  'publishing.delivery.read': tool({
    id: 'publishing.delivery.read',
    description: 'Membaca status satu pekerjaan distribusi artikel.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['publishing.read'],
    input: publicationStatusSchema,
  }),
  'publishing.delivery.request': tool({
    id: 'publishing.delivery.request',
    description: 'Meminta distribusi artikel ke daftar publisher yang ditentukan.',
    scope: 'tenant',
    risk: 'high',
    requiredPermissions: ['publishing.request'],
    requiresApproval: true,
    input: deliveryRequestInput,
  }),
  'media.assets.read': tool({
    id: 'media.assets.read',
    description: 'Membaca daftar aset media organisasi aktif dengan filter dan paginasi.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['media.read'],
    input: mediaListSchema,
  }),
  'network.sites.read': tool({
    id: 'network.sites.read',
    description: 'Membaca daftar situs milik organisasi aktif.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['site.read'],
    input: siteSearchInput,
  }),
  'audit.events.read': tool({
    id: 'audit.events.read',
    description: 'Membaca event audit yang dapat diakses aktor.',
    scope: 'tenant',
    risk: 'read',
    requiredPermissions: ['audit.read'],
    input: auditReadInput,
  }),
  'customers.list.read': tool({
    id: 'customers.list.read',
    description: 'Membaca daftar pelanggan pada control plane platform.',
    scope: 'platform',
    risk: 'read',
    requiredPermissions: ['platform.super_admin', 'platform.customer.admin'],
    requireAnyPermission: true,
    input: z.object({ limit: z.number().int().min(1).max(100).optional() }).strict(),
  }),
  'ai.routing.update': tool({
    id: 'ai.routing.update',
    description: 'Mengubah kebijakan routing AI platform.',
    scope: 'platform',
    risk: 'high',
    requiredPermissions: ['platform.ai.manage'],
    requiresApproval: true,
    input: z.object({
      primaryProviderId: z.string().trim().min(1).max(80),
      defaultModel: z.string().trim().min(1).max(120),
      fallbackProviderId: z.string().trim().min(1).max(80).nullable().optional(),
      fallbackModel: z.string().trim().min(1).max(120).optional(),
    }).strict(),
  }),
} as const);

export type AiOperatorToolId = keyof typeof AI_OPERATOR_TOOLS;
export type AiOperatorTool = (typeof AI_OPERATOR_TOOLS)[AiOperatorToolId];

export function getAiOperatorTool(id: string): AiOperatorTool | null {
  return Object.prototype.hasOwnProperty.call(AI_OPERATOR_TOOLS, id)
    ? AI_OPERATOR_TOOLS[id as AiOperatorToolId]
    : null;
}

export type AiOperatorAuthorization =
  | { readonly allowed: true; readonly requiresApproval: boolean; readonly risk: AiOperatorRisk }
  | { readonly allowed: false; readonly reason: 'UNKNOWN_TOOL' | 'MISSING_PERMISSION' | 'INVALID_INPUT' };

function hasRequiredPermissions(actor: ActorContext, definition: AiOperatorTool): boolean {
  const permissions = definition.scope === 'platform'
    ? actor.platformPermissionSet ?? new Set<string>()
    : actor.permissionSet;
  return definition.requireAnyPermission === true
    ? definition.requiredPermissions.some((permission) => permissions.has(permission))
    : definition.requiredPermissions.every((permission) => permissions.has(permission));
}

/** Returns safe tool metadata only; schemas and implementation details never leave the server. */
export function listAiOperatorTools(actor: ActorContext, scope: AiOperatorScope = 'tenant') {
  return Object.values(AI_OPERATOR_TOOLS)
    .filter((definition) => definition.scope === scope && hasRequiredPermissions(actor, definition))
    .map(({ id, description, risk, requiredPermissions, requiresApproval }) => ({
      id,
      description,
      risk,
      requiredPermissions,
      requiresApproval,
    }));
}

export function authorizeAiOperatorTool(
  actor: ActorContext,
  toolId: string,
  input: unknown,
): AiOperatorAuthorization {
  const definition = getAiOperatorTool(toolId);
  if (definition === null) return { allowed: false, reason: 'UNKNOWN_TOOL' };

  const parsed = definition.input.safeParse(input);
  if (!parsed.success) return { allowed: false, reason: 'INVALID_INPUT' };

  if (!hasRequiredPermissions(actor, definition)) return { allowed: false, reason: 'MISSING_PERMISSION' };

  // Approval is intentionally not accepted as a caller-supplied boolean here.
  // A future executor must verify a persisted approval record bound to this exact command.
  if (definition.requiresApproval) {
    return { allowed: true, requiresApproval: true, risk: definition.risk };
  }

  return { allowed: true, requiresApproval: false, risk: definition.risk };
}
