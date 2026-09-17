import { describe, expect, it, vi } from 'vitest';

import { EmailTestService } from '@/modules/integrations/email-test-service';
import { EmailSendError } from '@/modules/integrations/ports';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';

function platformActor(): AuthorizedTenantActorContext {
  return {
    actorType: 'user', actorId: 'actor-1', verifiedAuthUserId: 'auth-1', organizationId: 'org-1', permissionSet: new Set(), regionScopeId: null,
    platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]), entryPoint: 'dashboard', requestId: 'request-1',
  };
}

function plainActor(): AuthorizedTenantActorContext {
  return { ...platformActor(), platformPermissionSet: new Set() };
}

describe('EmailTestService', () => {
  it('delivers a probe to the requested address', async () => {
    const port = { send: vi.fn(async () => ({ id: 'email-7' })), upsertContact: vi.fn(async () => ({ id: 'contact-7' })) };
    const service = new EmailTestService(port);
    const result = await service.send(platformActor(), { to: 'owner@example.com' });
    expect(result.ok).toBe(true);
    expect(port.send).toHaveBeenCalledWith(expect.objectContaining({ to: ['owner@example.com'] }));
  });

  it('denies non-platform actors without disclosure', async () => {
    const port = { send: vi.fn(async () => ({ id: 'email-7' })), upsertContact: vi.fn(async () => ({ id: 'contact-7' })) };
    const service = new EmailTestService(port);
    const result = await service.send(plainActor(), { to: 'owner@example.com' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(port.send).not.toHaveBeenCalled();
  });

  it('rejects invalid destinations and unconfigured providers', async () => {
    const port = { send: vi.fn(async () => ({ id: 'email-7' })), upsertContact: vi.fn(async () => ({ id: 'contact-7' })) };
    const service = new EmailTestService(port);
    const invalid = await service.send(platformActor(), { to: 'not-an-email' });
    expect(invalid.ok).toBe(false);
    const unconfigured = await new EmailTestService(null).send(platformActor(), { to: 'owner@example.com' });
    expect(unconfigured.ok).toBe(false);
    if (!unconfigured.ok) expect(unconfigured.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('maps provider failures to retryable errors', async () => {
    const port = {
      send: vi.fn(async () => {
        throw new EmailSendError('rejected');
      }),
      upsertContact: vi.fn(async () => ({ id: 'contact-7' })),
    };
    const service = new EmailTestService(port);
    const result = await service.send(platformActor(), { to: 'owner@example.com' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});
