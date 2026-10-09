import { describe, expect, it } from 'vitest';

import type { ActorContext } from '@/core/operation-context';
import { validateAiOperatorPlan } from '@/modules/ai-operator/plan-validation';

const actor = (permissions: string[], platformPermissions: string[] = []): ActorContext => ({
  actorType: 'user',
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-user-1',
  organizationId: 'org-1',
  permissionSet: new Set(permissions),
  platformPermissionSet: new Set(platformPermissions),
  entryPoint: 'dashboard',
  requestId: 'req-1',
});

describe('AI Operator plan validation', () => {
  it('accepts only schema-valid tools the actor is authorized to use', () => {
    const result = validateAiOperatorPlan(actor(['dashboard.read']), {
      summary: 'Periksa ringkasan dashboard.',
      steps: [{ toolId: 'dashboard.overview.read', input: {}, rationale: 'Mengambil data ringkasan.' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.steps[0]?.requiresApproval).toBe(false);
      expect(result.plan.steps[0]?.risk).toBe('read');
    }
  });

  it('marks write steps as requiring approval without authorizing execution', () => {
    const result = validateAiOperatorPlan(actor(['article.manage']), {
      summary: 'Buat draf artikel.',
      steps: [{ toolId: 'content.articles.create', input: { title: 'Judul', body: 'Isi' }, rationale: 'Permintaan pengguna.' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.steps[0]?.requiresApproval).toBe(true);
  });

  it('rejects arbitrary tool names, platform tools, invalid inputs and missing permissions', () => {
    const plan = (toolId: string, input: unknown) => ({
      summary: 'Rencana.',
      steps: [{ toolId, input, rationale: 'Alasan.' }],
    });
    expect(validateAiOperatorPlan(actor(['dashboard.read']), plan('system.execute_sql', {})))
      .toEqual({ ok: false, reason: 'UNKNOWN_TOOL' });
    expect(validateAiOperatorPlan(actor([], ['platform.super_admin']), plan('customers.list.read', {})))
      .toEqual({ ok: false, reason: 'PLATFORM_TOOL_NOT_SUPPORTED' });
    expect(validateAiOperatorPlan(actor(['dashboard.read']), plan('content.articles.create', { title: '', body: '' })))
      .toEqual({ ok: false, reason: 'INVALID_TOOL_INPUT' });
    expect(validateAiOperatorPlan(actor([]), plan('dashboard.overview.read', {})))
      .toEqual({ ok: false, reason: 'MISSING_PERMISSION' });
  });

  it('bounds plan length and rejects extra fields', () => {
    expect(validateAiOperatorPlan(actor(['dashboard.read']), {
      summary: 'Too many steps.',
      steps: Array.from({ length: 9 }, () => ({
        toolId: 'dashboard.overview.read', input: {}, rationale: 'Read.',
      })),
    })).toEqual({ ok: false, reason: 'INVALID_PLAN' });
    expect(validateAiOperatorPlan(actor(['dashboard.read']), {
      summary: 'Unexpected property.',
      arbitraryUrl: 'https://example.com',
      steps: [{ toolId: 'dashboard.overview.read', input: {}, rationale: 'Read.' }],
    })).toEqual({ ok: false, reason: 'INVALID_PLAN' });
  });
});
