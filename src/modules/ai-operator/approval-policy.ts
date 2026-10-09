import 'server-only';

import { createHash } from 'node:crypto';

export type AiOperatorCommand = {
  readonly organizationId: string;
  readonly actorId: string;
  readonly toolId: string;
  readonly input: unknown;
};

export type AiOperatorApprovalState = 'pending' | 'approved' | 'rejected' | 'consumed' | 'expired';

export type AiOperatorApprovalRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly requesterActorId: string;
  readonly approverActorId: string | null;
  readonly commandHash: string;
  readonly state: AiOperatorApprovalState;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
};

export type ApprovalDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: 'NOT_FOUND' | 'SCOPE_MISMATCH' | 'COMMAND_MISMATCH' | 'NOT_APPROVED' | 'SELF_APPROVAL' | 'EXPIRED' | 'ALREADY_CONSUMED' };

/** Produces deterministic JSON for validated JSON-compatible tool input. */
function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Command input contains a non-finite number.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Command input must contain only plain objects.');
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => {
      if (record[key] === undefined) throw new TypeError('Command input cannot contain undefined values.');
      return `${JSON.stringify(key)}:${canonicalize(record[key])}`;
    }).join(',')}}`;
  }
  throw new TypeError('Command input must be JSON-compatible.');
}

/** Hashes the exact tenant, requester, tool and input that approval covers. */
export function hashAiOperatorCommand(command: AiOperatorCommand): string {
  return createHash('sha256').update(canonicalize({
    organizationId: command.organizationId,
    actorId: command.actorId,
    toolId: command.toolId,
    input: command.input,
  })).digest('hex');
}

export function evaluateAiOperatorApproval(
  record: AiOperatorApprovalRecord | null,
  command: AiOperatorCommand,
  approverActorId: string,
  now: Date = new Date(),
): ApprovalDecision {
  if (record === null) return { allowed: false, reason: 'NOT_FOUND' };
  if (record.organizationId !== command.organizationId || record.requesterActorId !== command.actorId) {
    return { allowed: false, reason: 'SCOPE_MISMATCH' };
  }
  if (record.commandHash !== hashAiOperatorCommand(command)) return { allowed: false, reason: 'COMMAND_MISMATCH' };
  if (record.state === 'consumed' || record.consumedAt !== null) return { allowed: false, reason: 'ALREADY_CONSUMED' };
  if (record.state !== 'approved' || record.approverActorId === null) return { allowed: false, reason: 'NOT_APPROVED' };
  if (record.approverActorId === record.requesterActorId || approverActorId !== record.approverActorId) {
    return { allowed: false, reason: 'SELF_APPROVAL' };
  }
  if (record.expiresAt.getTime() <= now.getTime()) return { allowed: false, reason: 'EXPIRED' };
  return { allowed: true };
}
