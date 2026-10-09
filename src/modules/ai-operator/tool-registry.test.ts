import { describe, expect, it } from 'vitest';

import type { ActorContext } from '@/core/operation-context';
import {
  AI_OPERATOR_TOOLS,
  authorizeAiOperatorTool,
  getAiOperatorTool,
} from '@/modules/ai-operator/tool-registry';

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

describe('AI Operator tool registry', () => {
  it('contains a finite allow-list of named tools', () => {
    expect(Object.keys(AI_OPERATOR_TOOLS).length).toBeGreaterThanOrEqual(10);
    expect(getAiOperatorTool('system.execute_sql')).toBeNull();
    expect(getAiOperatorTool('https://example.com')).toBeNull();
  });

  it('rejects unknown tools and malformed input', () => {
    expect(authorizeAiOperatorTool(actor(['dashboard.read']), 'system.shell', {}).allowed).toBe(false);
    expect(authorizeAiOperatorTool(actor(['article.manage']), 'content.articles.create', { title: '', body: 'x' }))
      .toEqual({ allowed: false, reason: 'INVALID_INPUT' });
  });

  it('checks tenant permissions independently of platform permissions', () => {
    const platformOnly = actor([], ['platform.super_admin']);
    expect(authorizeAiOperatorTool(platformOnly, 'content.articles.search', {}).allowed).toBe(false);
    expect(authorizeAiOperatorTool(platformOnly, 'customers.list.read', {})).toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
  });

  it('requires explicit approval for distribution and routing mutations', () => {
    const publisher = actor(['publishing.request']);
    const delivery = authorizeAiOperatorTool(publisher, 'publishing.delivery.request', {
      articleId: '11111111-1111-4111-8111-111111111111',
      publisherIds: ['22222222-2222-4222-8222-222222222222'],
    });
    expect(delivery).toEqual({ allowed: true, requiresApproval: true, risk: 'high' });

    const platform = actor([], ['platform.ai.manage']);
    const routing = authorizeAiOperatorTool(platform, 'ai.routing.update', {
      primaryProviderId: 'gemini',
      defaultModel: 'model-x',
    });
    expect(routing).toEqual({ allowed: true, requiresApproval: true, risk: 'high' });
  });

  it('does not allow a tenant grant to satisfy a platform permission', () => {
    const tenantAdmin = actor(['platform.ai.manage', 'publishing.request'], []);
    expect(authorizeAiOperatorTool(tenantAdmin, 'ai.routing.update', {
      primaryProviderId: 'gemini',
      defaultModel: 'model-x',
    }).allowed).toBe(false);
  });
});
