import { describe, expect, it } from 'vitest';

import type { ActorContext } from '@/core/operation-context';
import {
  AI_OPERATOR_TOOLS,
  authorizeAiOperatorTool,
  getAiOperatorTool,
  listAiOperatorTools,
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

  it('lists only tools authorized for the actor and requested scope', () => {
    const tenantReader = actor(['dashboard.read', 'article.read'], ['platform.super_admin']);
    const tenantTools = listAiOperatorTools(tenantReader, 'tenant');
    expect(tenantTools.map((item) => item.id)).toContain('dashboard.overview.read');
    expect(tenantTools.map((item) => item.id)).toContain('content.articles.search');
    expect(tenantTools.map((item) => item.id)).not.toContain('customers.list.read');
    expect(listAiOperatorTools(tenantReader, 'platform').map((item) => item.id)).toContain('customers.list.read');
    expect(tenantTools.every((item) => !('input' in item))).toBe(true);
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
      siteIds: ['22222222-2222-4222-8222-222222222222'],
      idempotencyKey: 'operator-delivery-1',
      options: {},
    });
    expect(delivery).toEqual({ allowed: true, requiresApproval: true, risk: 'high' });

    const platform = actor([], ['platform.ai.manage']);
    const routing = authorizeAiOperatorTool(platform, 'ai.routing.update', {
      primaryProviderId: 'gemini',
      defaultModel: 'model-x',
    });
    expect(routing).toEqual({ allowed: true, requiresApproval: true, risk: 'high' });
  });

  it('validates bounded filters for site and audit read tools', () => {
    expect(authorizeAiOperatorTool(actor(['media.read']), 'media.assets.read', {}))
      .toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
    expect(authorizeAiOperatorTool(actor(['media.read'], ['platform.super_admin']), 'media.assets.read', {
      ownerOrganizationId: '22222222-2222-4222-8222-222222222222',
    })).toEqual({ allowed: false, reason: 'INVALID_INPUT' });
    expect(authorizeAiOperatorTool(actor(['publishing.read']), 'publishing.delivery.read', {
      jobId: '11111111-1111-4111-8111-111111111111',
    })).toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
    expect(authorizeAiOperatorTool(actor(['publishing.read']), 'publishing.delivery.read', {}))
      .toEqual({ allowed: false, reason: 'INVALID_INPUT' });

    expect(authorizeAiOperatorTool(actor(['site.read']), 'network.sites.read', { query: 'portal' }))
      .toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
    expect(authorizeAiOperatorTool(actor(['site.read']), 'network.sites.read', { query: 'x'.repeat(201) }))
      .toEqual({ allowed: false, reason: 'INVALID_INPUT' });

    expect(authorizeAiOperatorTool(actor(['audit.read']), 'operations.summary.read', {}))
      .toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
    expect(authorizeAiOperatorTool(actor(['audit.read']), 'audit.events.read', {
      action: 'article.create',
      outcome: 'succeeded',
      limit: 100,
    })).toEqual({ allowed: true, requiresApproval: false, risk: 'read' });
    expect(authorizeAiOperatorTool(actor(['audit.read']), 'audit.events.read', {
      limit: 501,
    })).toEqual({ allowed: false, reason: 'INVALID_INPUT' });
  });

  it('does not allow a tenant grant to satisfy a platform permission', () => {
    const tenantAdmin = actor(['platform.ai.manage', 'publishing.request'], []);
    expect(authorizeAiOperatorTool(tenantAdmin, 'ai.routing.update', {
      primaryProviderId: 'gemini',
      defaultModel: 'model-x',
    }).allowed).toBe(false);
  });
});
