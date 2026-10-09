import { describe, expect, it } from 'vitest';

import type { ActorContext } from '@/core/operation-context';
import { validateAiOperatorPlan } from '@/modules/ai-operator/plan-validation';
import { listAiOperatorPlanningTools } from '@/modules/ai-operator/tool-registry';

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

  it('marks executable publication writes as requiring approval without authorizing execution', () => {
    const result = validateAiOperatorPlan(actor(['publishing.request']), {
      summary: 'Distribusikan artikel ke portal yang dipilih.',
      steps: [{
        toolId: 'publishing.delivery.request',
        input: {
          articleId: '11111111-1111-4111-8111-111111111111',
          siteIds: ['22222222-2222-4222-8222-222222222222'],
          idempotencyKey: 'plan-request-1',
          options: {},
        },
        rationale: 'Pengguna meminta distribusi ke portal tertentu.',
      }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.steps[0]?.requiresApproval).toBe(true);
  });

  it('does not plan tools whose executor is not connected', () => {
    expect(validateAiOperatorPlan(actor(['article.manage']), {
      summary: 'Buat draf artikel.',
      steps: [{ toolId: 'content.articles.create', input: { title: 'Judul', body: 'Isi' }, rationale: 'Permintaan pengguna.' }],
    })).toEqual({ ok: false, reason: 'TOOL_NOT_EXECUTABLE' });
  });

  it('provides JSON Schema only for authorized executable tools', () => {
    const tools = listAiOperatorPlanningTools(actor(['dashboard.read', 'analytics.read', 'article.read', 'publishing.read', 'publishing.request', 'media.read', 'site.read', 'audit.read']));
    expect(tools.map((item) => item.id)).toContain('dashboard.overview.read');
    expect(tools.map((item) => item.id)).toContain('publishing.delivery.request');
    expect(tools.map((item) => item.id)).not.toContain('content.articles.create');
    expect(tools.find((item) => item.id === 'publishing.delivery.request')?.inputSchema).toBeDefined();
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
