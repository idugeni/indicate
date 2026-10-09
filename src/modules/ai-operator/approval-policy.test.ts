import { describe, expect, it } from 'vitest';

import {
  evaluateAiOperatorApproval,
  hashAiOperatorCommand,
  type AiOperatorApprovalRecord,
  type AiOperatorCommand,
} from '@/modules/ai-operator/approval-policy';

const command: AiOperatorCommand = {
  organizationId: 'org-1',
  actorId: 'requester-1',
  toolId: 'content.articles.create',
  input: { title: 'Judul', body: 'Isi', options: { b: 2, a: 1 } },
};

const record = (overrides: Partial<AiOperatorApprovalRecord> = {}): AiOperatorApprovalRecord => ({
  id: 'approval-1',
  organizationId: command.organizationId,
  requesterActorId: command.actorId,
  approverActorId: 'approver-1',
  commandHash: hashAiOperatorCommand(command),
  state: 'approved',
  expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  consumedAt: null,
  ...overrides,
});

describe('AI Operator approval policy', () => {
  it('hashes equivalent JSON objects deterministically regardless of key order', () => {
    expect(hashAiOperatorCommand(command)).toBe(hashAiOperatorCommand({
      ...command,
      input: { options: { a: 1, b: 2 }, body: 'Isi', title: 'Judul' },
    }));
  });

  it('binds approval to tenant, requester, tool and exact input', () => {
    expect(evaluateAiOperatorApproval(record(), command, 'approver-1', new Date('2029-01-01'))).toEqual({ allowed: true });
    expect(evaluateAiOperatorApproval(record(), { ...command, input: { title: 'Changed' } }, 'approver-1'))
      .toEqual({ allowed: false, reason: 'COMMAND_MISMATCH' });
    expect(evaluateAiOperatorApproval(record(), { ...command, organizationId: 'org-2' }, 'approver-1'))
      .toEqual({ allowed: false, reason: 'SCOPE_MISMATCH' });
  });

  it('rejects missing, pending, self-approved, expired and consumed approvals', () => {
    expect(evaluateAiOperatorApproval(null, command, 'approver-1')).toEqual({ allowed: false, reason: 'NOT_FOUND' });
    expect(evaluateAiOperatorApproval(record({ state: 'pending', approverActorId: null }), command, 'approver-1'))
      .toEqual({ allowed: false, reason: 'NOT_APPROVED' });
    expect(evaluateAiOperatorApproval(record({ approverActorId: 'requester-1' }), command, 'requester-1'))
      .toEqual({ allowed: false, reason: 'SELF_APPROVAL' });
    expect(evaluateAiOperatorApproval(record({ expiresAt: new Date('2020-01-01') }), command, 'approver-1'))
      .toEqual({ allowed: false, reason: 'EXPIRED' });
    expect(evaluateAiOperatorApproval(record({ state: 'consumed', consumedAt: new Date() }), command, 'approver-1'))
      .toEqual({ allowed: false, reason: 'ALREADY_CONSUMED' });
  });

  it('rejects values outside the JSON data model', () => {
    expect(() => hashAiOperatorCommand({ ...command, input: { value: Number.NaN } })).toThrow();
    expect(() => hashAiOperatorCommand({ ...command, input: { value: undefined } })).toThrow();
  });
});
