import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { aiOperatorApprovals } from '@/data/schema';
import { resolveAiOperatorDashboardContext } from '@/modules/ai-operator/dashboard-context';
import { createAiOperatorApproval, decideAiOperatorApproval } from '@/modules/ai-operator/approval-store';
import { authorizeAiOperatorTool, getAiOperatorTool } from '@/modules/ai-operator/tool-registry';

const createSchema = z.object({
  organizationId: z.uuid(),
  action: z.literal('request'),
  toolId: z.string().trim().min(1).max(120),
  input: z.unknown(),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

const decisionSchema = z.object({
  organizationId: z.uuid(),
  action: z.literal('decide'),
  approvalId: z.uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).optional(),
}).strict();

const requestSchema = z.discriminatedUnion('action', [createSchema, decisionSchema]);

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const params = new URL(request.url).searchParams;
  const organizationId = z.uuid().safeParse(params.get('organizationId'));
  if (!organizationId.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid organization.', requestId), { status: 400 });
  }

  const context = await resolveAiOperatorDashboardContext(organizationId.data, requestId, request.headers);
  if (context === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  const canReview = context.actor.permissionSet.has('ai_operator.approve');
  const rows = await context.db.query.aiOperatorApprovals.findMany({
    where: canReview
      ? eq(aiOperatorApprovals.organizationId, organizationId.data)
      : and(
          eq(aiOperatorApprovals.organizationId, organizationId.data),
          eq(aiOperatorApprovals.requesterActorId, context.actor.actorId),
        ),
    orderBy: [desc(aiOperatorApprovals.createdAt)],
    limit: 100,
  });

  return NextResponse.json({
    organizationId: organizationId.data,
    approvals: rows.map((row) => ({
      id: row.id,
      requesterActorId: row.requesterActorId,
      approverActorId: row.approverActorId,
      toolId: row.toolId,
      input: row.commandInput,
      commandHash: row.commandHash,
      state: row.state,
      decisionNote: row.decisionNote,
      expiresAt: row.expiresAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      consumedAt: row.consumedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid approval request.', requestId), { status: 400 });
  }

  const context = await resolveAiOperatorDashboardContext(parsed.data.organizationId, requestId, request.headers);
  if (context === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  if (parsed.data.action === 'request') {
    const definition = getAiOperatorTool(parsed.data.toolId);
    if (definition === null || definition.scope !== 'tenant') {
      return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown tenant operator tool.', requestId), { status: 400 });
    }
    if (parsed.data.toolId !== 'publishing.delivery.request') {
      return NextResponse.json(createPublicError('CONFLICT', 'This tool does not yet have a transactional executor and cannot be approved.', requestId), { status: 409 });
    }
    const authorization = authorizeAiOperatorTool(context.actor, parsed.data.toolId, parsed.data.input);
    if (!authorization.allowed) {
      const status = authorization.reason === 'INVALID_INPUT' ? 400 : 403;
      return NextResponse.json(createPublicError(
        authorization.reason === 'INVALID_INPUT' ? 'INVALID_INPUT' : 'FORBIDDEN',
        'The approval request is not permitted.',
        requestId,
      ), { status });
    }
    if (!authorization.requiresApproval) {
      return NextResponse.json(createPublicError('INVALID_INPUT', 'This tool does not require approval.', requestId), { status: 400 });
    }

    const validated = definition.input.safeParse(parsed.data.input);
    if (!validated.success || validated.data === null || typeof validated.data !== 'object' || Array.isArray(validated.data)) {
      return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid command input.', requestId), { status: 400 });
    }

    const result = await createAiOperatorApproval(context.db, {
      organizationId: context.actor.organizationId,
      actorId: context.actor.actorId,
      toolId: parsed.data.toolId,
      input: validated.data,
    }, parsed.data.idempotencyKey, {
      actorType: context.actor.actorType,
      entryPoint: context.actor.entryPoint,
      requestId,
    });
    if (!result.ok) {
      return NextResponse.json(createPublicError('CONFLICT', 'Idempotency key was already used for a different command.', requestId), { status: 409 });
    }

    logEvent('info', {
      event: 'ai_operator.approval.requested',
      requestId,
      context: { organizationId: context.actor.organizationId, actorId: context.actor.actorId, toolId: parsed.data.toolId, approvalId: result.record.id, reused: result.reused },
    });
    return NextResponse.json({ approval: { id: result.record.id, state: result.record.state, commandHash: result.record.commandHash, expiresAt: result.record.expiresAt.toISOString() }, reused: result.reused, requestId }, { status: result.reused ? 200 : 201 });
  }

  if (!context.actor.permissionSet.has('ai_operator.approve')) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const result = await decideAiOperatorApproval(context.db, {
    approvalId: parsed.data.approvalId,
    organizationId: context.actor.organizationId,
    approverActorId: context.actor.actorId,
    decision: parsed.data.decision,
    audit: {
      actorType: context.actor.actorType,
      entryPoint: context.actor.entryPoint,
      requestId,
    },
    ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
  });
  if (!result.ok) {
    const status = result.reason === 'NOT_FOUND' ? 404 : result.reason === 'SELF_APPROVAL' ? 403 : 409;
    return NextResponse.json(createPublicError(result.reason === 'NOT_FOUND' ? 'RESOURCE_UNAVAILABLE' : result.reason === 'SELF_APPROVAL' ? 'FORBIDDEN' : 'CONFLICT', 'The approval decision could not be applied.', requestId), { status });
  }

  logEvent('info', {
    event: 'ai_operator.approval.decided',
    requestId,
    context: { organizationId: context.actor.organizationId, actorId: context.actor.actorId, approvalId: result.record.id, decision: parsed.data.decision },
  });
  return NextResponse.json({ approval: { id: result.record.id, state: result.record.state, approverActorId: result.record.approverActorId, approvedAt: result.record.approvedAt?.toISOString() ?? null, rejectedAt: result.record.rejectedAt?.toISOString() ?? null }, requestId });
}

export const GET = withApiAccess('GET /api/dashboard/operator/approvals', handleGET);
export const POST = withApiAccess('POST /api/dashboard/operator/approvals', handlePOST);
