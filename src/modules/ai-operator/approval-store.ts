import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { ActorType, EntryPoint } from '@/core/operation-context';
import type * as schema from '@/data/schema';
import { aiOperatorApprovals, auditLogs } from '@/data/schema';
import { hashAiOperatorCommand, type AiOperatorCommand } from '@/modules/ai-operator/approval-policy';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type ApprovalRow = typeof aiOperatorApprovals.$inferSelect;

export type ApprovalAuditContext = {
  readonly actorType: ActorType;
  readonly entryPoint: EntryPoint;
  readonly requestId: string;
};

export type CreateApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow; readonly reused: boolean }
  | { readonly ok: false; readonly reason: 'IDEMPOTENCY_CONFLICT' };

export type DecideApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow }
  | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'NOT_PENDING' | 'SELF_APPROVAL' | 'EXPIRED' };

export type ConsumeApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow; readonly reused?: boolean }
  | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'COMMAND_MISMATCH' | 'NOT_APPROVED' | 'SELF_APPROVAL' | 'EXPIRED' | 'ALREADY_CONSUMED' };

const MAX_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_TTL_SECONDS = 15 * 60;

async function appendApprovalAudit(
  transaction: Transaction,
  input: {
    readonly organizationId: string;
    readonly actorId: string;
    readonly audit: ApprovalAuditContext;
    readonly action: string;
    readonly targetId: string;
    readonly outcome: 'succeeded' | 'denied' | 'failed';
    readonly changedFields: string[];
    readonly before: Record<string, unknown> | null;
    readonly after: Record<string, unknown> | null;
    readonly occurredAt: Date;
  },
): Promise<void> {
  await transaction.insert(auditLogs).values({
    organizationId: input.organizationId,
    id: randomUUID(),
    actorType: input.audit.actorType,
    actorId: input.actorId,
    entryPoint: input.audit.entryPoint,
    action: input.action,
    targetType: 'ai_operator_approval',
    targetId: input.targetId,
    outcome: input.outcome,
    changedFields: input.changedFields,
    before: input.before,
    after: input.after,
    requestId: input.audit.requestId,
    occurredAt: input.occurredAt,
  });
}

/** Creates a durable, idempotent approval request and its hash-chained audit event atomically. */
export async function createAiOperatorApproval(
  db: Database,
  command: AiOperatorCommand,
  idempotencyKey: string,
  audit: ApprovalAuditContext,
  options: { readonly now?: Date; readonly ttlSeconds?: number } = {},
): Promise<CreateApprovalResult> {
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > MAX_TTL_SECONDS) {
    throw new RangeError('Approval TTL must be between 60 seconds and 24 hours.');
  }
  if (idempotencyKey.trim().length < 1 || idempotencyKey.length > 200) {
    throw new TypeError('A bounded idempotency key is required.');
  }
  if (command.input === null || typeof command.input !== 'object' || Array.isArray(command.input)) {
    throw new TypeError('Approval input must be a validated JSON object.');
  }

  const commandHash = hashAiOperatorCommand(command);
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  return db.transaction(async (transaction) => {
    const inserted = await transaction.insert(aiOperatorApprovals).values({
      organizationId: command.organizationId,
      requesterActorId: command.actorId,
      toolId: command.toolId,
      commandInput: command.input as Record<string, unknown>,
      commandHash,
      idempotencyKey,
      expiresAt,
    }).onConflictDoNothing({
      target: [aiOperatorApprovals.organizationId, aiOperatorApprovals.requesterActorId, aiOperatorApprovals.idempotencyKey],
    }).returning();

    if (inserted[0]) {
      await appendApprovalAudit(transaction, {
        organizationId: command.organizationId,
        actorId: command.actorId,
        audit,
        action: 'ai_operator.approval.requested',
        targetId: inserted[0].id,
        outcome: 'succeeded',
        changedFields: ['state', 'toolId', 'commandHash'],
        before: null,
        after: { state: 'pending', toolId: command.toolId, commandHash },
        occurredAt: now,
      });
      return { ok: true, record: inserted[0], reused: false };
    }

    const existing = await transaction.query.aiOperatorApprovals.findFirst({
      where: and(
        eq(aiOperatorApprovals.organizationId, command.organizationId),
        eq(aiOperatorApprovals.requesterActorId, command.actorId),
        eq(aiOperatorApprovals.idempotencyKey, idempotencyKey),
      ),
    });
    if (!existing || existing.commandHash !== commandHash) {
      await appendApprovalAudit(transaction, {
        organizationId: command.organizationId,
        actorId: command.actorId,
        audit,
        action: 'ai_operator.approval.idempotency_conflict',
        targetId: existing?.id ?? idempotencyKey,
        outcome: 'denied',
        changedFields: [],
        before: null,
        after: { reason: 'IDEMPOTENCY_CONFLICT', commandHash },
        occurredAt: now,
      });
      return { ok: false, reason: 'IDEMPOTENCY_CONFLICT' };
    }

    await appendApprovalAudit(transaction, {
      organizationId: command.organizationId,
      actorId: command.actorId,
      audit,
      action: 'ai_operator.approval.request_reused',
      targetId: existing.id,
      outcome: 'succeeded',
      changedFields: [],
      before: null,
      after: { state: existing.state, commandHash },
      occurredAt: now,
    });
    return { ok: true, record: existing, reused: true };
  });
}

/** Approves or rejects a pending request; compare-and-set and audit write share one transaction. */
export async function decideAiOperatorApproval(
  db: Database,
  input: {
    readonly approvalId: string;
    readonly organizationId: string;
    readonly approverActorId: string;
    readonly decision: 'approved' | 'rejected';
    readonly note?: string;
    readonly audit: ApprovalAuditContext;
    readonly now?: Date;
  },
): Promise<DecideApprovalResult> {
  const now = input.now ?? new Date();
  const note = input.note?.trim();
  if (note !== undefined && note.length > 1000) throw new RangeError('Approval note cannot exceed 1000 characters.');

  return db.transaction(async (transaction) => {
    const updated = await transaction.update(aiOperatorApprovals).set({
      state: input.decision,
      approverActorId: input.approverActorId,
      approvedAt: input.decision === 'approved' ? now : null,
      rejectedAt: input.decision === 'rejected' ? now : null,
      decisionNote: note || null,
      updatedAt: now,
    }).where(and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.organizationId),
      eq(aiOperatorApprovals.state, 'pending'),
      ne(aiOperatorApprovals.requesterActorId, input.approverActorId),
      gt(aiOperatorApprovals.expiresAt, now),
    )).returning();

    if (updated[0]) {
      await appendApprovalAudit(transaction, {
        organizationId: input.organizationId,
        actorId: input.approverActorId,
        audit: input.audit,
        action: `ai_operator.approval.${input.decision}`,
        targetId: updated[0].id,
        outcome: 'succeeded',
        changedFields: ['state', 'approverActorId', 'decisionNote'],
        before: { state: 'pending' },
        after: { state: input.decision, approverActorId: input.approverActorId, commandHash: updated[0].commandHash },
        occurredAt: now,
      });
      return { ok: true, record: updated[0] };
    }

    const existing = await transaction.query.aiOperatorApprovals.findFirst({
      where: and(
        eq(aiOperatorApprovals.id, input.approvalId),
        eq(aiOperatorApprovals.organizationId, input.organizationId),
      ),
    });
    const reason = !existing ? 'NOT_FOUND'
      : existing.requesterActorId === input.approverActorId ? 'SELF_APPROVAL'
        : existing.expiresAt.getTime() <= now.getTime() && existing.state === 'pending' ? 'EXPIRED'
          : 'NOT_PENDING';

    if (existing?.state === 'pending' && reason === 'EXPIRED') {
      await transaction.update(aiOperatorApprovals).set({ state: 'expired', updatedAt: now }).where(and(
        eq(aiOperatorApprovals.id, input.approvalId),
        eq(aiOperatorApprovals.organizationId, input.organizationId),
        eq(aiOperatorApprovals.state, 'pending'),
        lt(aiOperatorApprovals.expiresAt, now),
      ));
    }
    await appendApprovalAudit(transaction, {
      organizationId: input.organizationId,
      actorId: input.approverActorId,
      audit: input.audit,
      action: reason === 'EXPIRED' ? 'ai_operator.approval.expired' : 'ai_operator.approval.decision_denied',
      targetId: input.approvalId,
      outcome: 'denied',
      changedFields: reason === 'EXPIRED' ? ['state'] : [],
      before: existing ? { state: existing.state, requesterActorId: existing.requesterActorId } : null,
      after: { reason },
      occurredAt: now,
    });
    return { ok: false, reason };
  });
}

/** Read-checks an approval before an idempotent executor call; consumed approvals are allowed only for exact-command replay. */
export async function getUsableAiOperatorApproval(
  db: Database,
  input: { readonly approvalId: string; readonly command: AiOperatorCommand; readonly now?: Date },
): Promise<{ readonly ok: true; readonly record: ApprovalRow; readonly replay: boolean } | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'COMMAND_MISMATCH' | 'NOT_APPROVED' | 'SELF_APPROVAL' | 'EXPIRED' }> {
  const now = input.now ?? new Date();
  const record = await db.query.aiOperatorApprovals.findFirst({
    where: and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.command.organizationId),
      eq(aiOperatorApprovals.requesterActorId, input.command.actorId),
    ),
  });
  if (!record) return { ok: false, reason: 'NOT_FOUND' };
  if (record.commandHash !== hashAiOperatorCommand(input.command)) return { ok: false, reason: 'COMMAND_MISMATCH' };
  if (record.approverActorId === input.command.actorId) return { ok: false, reason: 'SELF_APPROVAL' };
  if (record.state === 'consumed' && record.consumedAt !== null) return { ok: true, record, replay: true };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'EXPIRED' };
  if (record.state !== 'approved' || record.approverActorId === null) return { ok: false, reason: 'NOT_APPROVED' };
  return { ok: true, record, replay: false };
}

/** Atomically consumes an approval for one exact command and writes the audit event in the same transaction. */
export async function consumeAiOperatorApproval(
  db: Database,
  input: {
    readonly approvalId: string;
    readonly command: AiOperatorCommand;
    readonly audit: ApprovalAuditContext;
    readonly now?: Date;
  },
): Promise<ConsumeApprovalResult> {
  const now = input.now ?? new Date();
  const commandHash = hashAiOperatorCommand(input.command);
  return db.transaction(async (transaction) => {
    const updated = await transaction.update(aiOperatorApprovals).set({
      state: 'consumed',
      consumedAt: now,
      updatedAt: now,
    }).where(and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.command.organizationId),
      eq(aiOperatorApprovals.requesterActorId, input.command.actorId),
      eq(aiOperatorApprovals.commandHash, commandHash),
      eq(aiOperatorApprovals.state, 'approved'),
      gt(aiOperatorApprovals.expiresAt, now),
      ne(aiOperatorApprovals.requesterActorId, aiOperatorApprovals.approverActorId),
    )).returning();

    if (updated[0]) {
      await appendApprovalAudit(transaction, {
        organizationId: input.command.organizationId,
        actorId: input.command.actorId,
        audit: input.audit,
        action: 'ai_operator.approval.consumed',
        targetId: updated[0].id,
        outcome: 'succeeded',
        changedFields: ['state', 'consumedAt'],
        before: { state: 'approved', commandHash },
        after: { state: 'consumed', commandHash },
        occurredAt: now,
      });
      return { ok: true, record: updated[0] };
    }

    const existing = await transaction.query.aiOperatorApprovals.findFirst({
      where: and(
        eq(aiOperatorApprovals.id, input.approvalId),
        eq(aiOperatorApprovals.organizationId, input.command.organizationId),
        eq(aiOperatorApprovals.requesterActorId, input.command.actorId),
      ),
    });
    if (existing.commandHash === commandHash && existing.state === 'consumed' && existing.consumedAt !== null) {
      await appendApprovalAudit(transaction, {
        organizationId: input.command.organizationId,
        actorId: input.command.actorId,
        audit: input.audit,
        action: 'ai_operator.approval.consumed_replay',
        targetId: existing.id,
        outcome: 'succeeded',
        changedFields: [],
        before: { state: 'consumed', commandHash },
        after: { state: 'consumed', replay: true, commandHash },
        occurredAt: now,
      });
      return { ok: true, record: existing, reused: true };
    }
    const reason = existing.commandHash !== commandHash ? 'COMMAND_MISMATCH'
      : existing.state === 'consumed' || existing.consumedAt !== null ? 'ALREADY_CONSUMED'
        : existing.approverActorId === input.command.actorId ? 'SELF_APPROVAL'
          : existing.expiresAt.getTime() <= now.getTime() ? 'EXPIRED'
            : 'NOT_APPROVED';
    await appendApprovalAudit(transaction, {
      organizationId: input.command.organizationId,
      actorId: input.command.actorId,
      audit: input.audit,
      action: 'ai_operator.approval.consume_denied',
      targetId: input.approvalId,
      outcome: 'denied',
      changedFields: [],
      before: existing ? { state: existing.state, commandHash: existing.commandHash } : null,
      after: { reason, attemptedCommandHash: commandHash },
      occurredAt: now,
    });
    return { ok: false, reason };
  });
}
