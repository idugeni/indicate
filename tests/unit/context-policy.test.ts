import { describe, expect, it, vi } from 'vitest';

import { resolveOperationContext, withVerifiedOperationContext } from '@/application/context/context-policy';
import type { ActorContext, HostnameContext } from '@/domain/context/operation-context';
import type { TenantTransactionManager } from '@/ports/tenant-transaction';

const actor: ActorContext = {
  actorType: 'user',
  actorId: 'actor-123',
  verifiedAuthUserId: '00000000-0000-4000-8000-000000000099',
  organizationId: 'org-123',
  permissionSet: new Set(['article.read']),
  entryPoint: 'cms',
  requestId: 'request-123',
};
const hostname: HostnameContext = {
  normalizedHostname: 'news.example.web.id',
  organizationId: 'org-123',
  domainId: 'domain-123',
  siteId: 'site-123',
  regionId: null,
  routingVersion: 1,
};

describe('operation context policy', () => {
  it('accepts one authorized tenant context', () => {
    expect(resolveOperationContext({ actor })).toEqual({ ok: true, value: { kind: 'tenant', actor } });
  });

  it('accepts one public hostname context', () => {
    expect(resolveOperationContext({ hostname })).toEqual({ ok: true, value: { kind: 'public', hostname } });
  });

  it.each([
    [{}, 'MISSING_CONTEXT'],
    [{ actor, hostname }, 'CONFLICTING_CONTEXT'],
    [{ actor: { ...actor, organizationId: null } }, 'UNAUTHORIZED_CONTEXT'],
  ] as const)('rejects invalid context before repository access', async (candidate, expected) => {
    const repositoryRead = vi.fn(async () => 'tenant-data');
    const result = await withVerifiedOperationContext(candidate, repositoryRead);
    expect(result).toEqual({ ok: false, error: expected });
    expect(repositoryRead).not.toHaveBeenCalled();
  });
});



describe('tenant transaction execution boundary', () => {
  it('derives organization scope from the verified actor and rejects adapter mismatch before operation access', async () => {
    const { executeInTenantTransaction } = await import('@/application/context/tenant-transaction-execution');
    const operation = vi.fn(async () => 'should-not-run');
    const manager: TenantTransactionManager = {
      execute: vi.fn(async (authorizedActor, callback) => callback({
        organizationId: 'org-other',
        actor: authorizedActor,
        appendAudit: vi.fn(),
      })),
    };
    await expect(executeInTenantTransaction(
      manager,
      { kind: 'tenant', actor: actor as typeof actor & { organizationId: string } },
      operation,
    )).rejects.toThrow('Tenant transaction context mismatch');
    expect(manager.execute).toHaveBeenCalledWith(actor, expect.any(Function));
    expect(operation).not.toHaveBeenCalled();
  });
});
