import 'server-only';

import { and, eq, gt, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { aiOperatorApprovals } from '@/data/schema';
import { hashAiOperatorCommand, type AiOperatorCommand } from '@/modules/ai-operator/approval-policy';

 type Database = PostgresJsDatabase<typeof schema>;
 type ApprovalRow = typeof aiOperatorApprovals.$inferSelect;

export type CreateApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow; readonly reused: boolean }
  | { readonly ok: false; readonly reason: 'IDEMPOTENCY_CONFLICT' };

export type DecideApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow }
  | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'NOT_PENDING' | 'SELF_APPROVAL' | 'EXPIRED' };

export type ConsumeApprovalResult =
  | { readonly ok: true; readonly record: ApprovalRow }
  | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'COMMAND_MISMATCH' | 'NOT_APPROVED' | 'SELF_APPROVAL' | 'EXPIRED' | 'ALREADY_CONSUMED' };

const MAX_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_TTL_SECONDS = 15 * 60;

/** Creates a durable, idempotent approval request for an already validated command. */
export async function createAiOperatorApproval(
  db: Database,
  command: AiOperatorCommand,
  idempotencyKey: string,
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
  const inserted = await db.insert(aiOperatorApprovals).values({
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

  if (inserted[0]) return { ok: true, record: inserted[0], reused: false };

  const existing = await db.query.aiOperatorApprovals.findFirst({
    where: and(
      eq(aiOperatorApprovals.organizationId, command.organizationId),
      eq(aiOperatorApprovals.requesterActorId, command.actorId),
      eq(aiOperatorApprovals.idempotencyKey, idempotencyKey),
    ),
  });
  if (!existing || existing.commandHash !== commandHash) return { ok: false, reason: 'IDEMPOTENCY_CONFLICT' };
  return { ok: true, record: existing, reused: true };
}

/** Approves or rejects a pending request; compare-and-set prevents double decisions. */
export async function decideAiOperatorApproval(
  db: Database,
  input: {
    readonly approvalId: string;
    readonly organizationId: string;
    readonly approverActorId: string;
    readonly decision: 'approved' | 'rejected';
    readonly note?: string;
    readonly now?: Date;
  },
): Promise<DecideApprovalResult> {
  const now = input.now ?? new Date();
  const note = input.note?.trim();
  if (note !== undefined && note.length > 1000) throw new RangeError('Approval note cannot exceed 1000 characters.');

  const updated = await db.update(aiOperatorApprovals).set({
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

  if (updated[0]) return { ok: true, record: updated[0] };

  const existing = await db.query.aiOperatorApprovals.findFirst({
    where: and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.organizationId),
    ),
  });
  if (!existing) return { ok: false, reason: 'NOT_FOUND' };
  if (existing.requesterActorId === input.approverActorId) return { ok: false, reason: 'SELF_APPROVAL' };
  if (existing.expiresAt.getTime() <= now.getTime() && existing.state === 'pending') {
    await db.update(aiOperatorApprovals).set({ state: 'expired', updatedAt: now }).where(and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.organizationId),
      eq(aiOperatorApprovals.state, 'pending'),
      gt(now, aiOperatorApprovals.expiresAt),
    ));
    return { ok: false, reason: 'EXPIRED' };
  }
  return { ok: false, reason: 'NOT_PENDING' };
}

/** Atomically consumes an approval for one exact command; only one concurrent caller can win. */
export async function consumeAiOperatorApproval(
  db: Database,
  input: {
    readonly approvalId: string;
    readonly command: AiOperatorCommand;
    readonly now?: Date;
  },
): Promise<ConsumeApprovalResult> {
  const now = input.now ?? new Date();
  const commandHash = hashAiOperatorCommand(input.command);
  const updated = await db.update(aiOperatorApprovals).set({
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

  if (updated[0]) return { ok: true, record: updated[0] };

  const existing = await db.query.aiOperatorApprovals.findFirst({
    where: and(
      eq(aiOperatorApprovals.id, input.approvalId),
      eq(aiOperatorApprovals.organizationId, input.command.organizationId),
      eq(aiOperatorApprovals.requesterActorId, input.command.actorId),
    ),
  });
  if (!existing) return { ok: false, reason: 'NOT_FOUND' };
  if (existing.commandHash !== commandHash) return { ok: false, reason: 'COMMAND_MISMATCH' };
  if (existing.state === 'consumed' || existing.consumedAt !== null) return { ok: false, reason: 'ALREADY_CONSUMED' };
  if (existing.approverActorId === input.command.actorId) return { ok: false, reason: 'SELF_APPROVAL' };
  if (existing.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'EXPIRED' };
  return { ok: false, reason: 'NOT_APPROVED' };
}
