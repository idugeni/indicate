import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { STAGE3_PERMISSIONS, TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { InMemoryStage3Repository } from '@/infrastructure/testing/stage3-memory';
import { assertAsyncProperty } from '../helpers/property';
import { emptyStage3State, ORG_ID, SequenceIdentifierGenerator, stage3Actor } from '../helpers/stage3';

// Feature: indicate-mvp, Property 34: Audit is attributable, immutable, redacted, scoped, and atomic
// **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.16, 18.17, 21.22**
describe('Property 34: immutable atomic auditing', () => {
  it('redacts generated secrets, attributes denials, scopes reads, rejects mutation, and rolls back audit failure', async () => {
    await assertAsyncProperty('Property 34: Audit is attributable, immutable, redacted, scoped, and atomic', fc.asyncProperty(
      fc.stringMatching(/^[A-Za-z0-9_-]{8,40}$/),
      async (secretSentinel) => {
        const initial = emptyStage3State();
        const role = initial.roles[0]!;
        const restricted = {
          ...initial,
          roles: [{ ...role, permissions: new Set([STAGE3_PERMISSIONS.publisherManage, STAGE3_PERMISSIONS.auditRead]) }],
        };
        const foreignOrganizationId = '00000000-0000-4000-8000-000000000002';
        const foreign = { ...emptyStage3State({ organizationId: foreignOrganizationId, organizationName: 'Foreign' }), roles: [], memberships: [] };
        const repository = new InMemoryStage3Repository([restricted, foreign]);
        const service = new TenantBusinessService(repository, new SequenceIdentifierGenerator());
        const actor = stage3Actor('audit-property');

        const created = await service.createPublisher(actor, {
          name: 'Audited Publisher', type: 'organization', attributionLabel: 'Audited',
          contacts: { apiToken: secretSentinel, publicPhone: '123' }, evidenceReference: null,
        });
        expect(created.ok).toBe(true);
        const snapshot = repository.snapshot(ORG_ID)!;
        expect(snapshot.auditLogs).toHaveLength(1);
        expect(snapshot.auditLogs[0]).toMatchObject({
          organizationId: ORG_ID, actorType: 'user', actorId: actor.actorId, entryPoint: 'cms',
          action: 'publisher.create', targetType: 'publisher', outcome: 'succeeded', requestId: 'audit-property',
        });
        expect(JSON.stringify(snapshot.auditLogs)).not.toContain(secretSentinel);
        expect(JSON.stringify(snapshot.auditLogs)).toContain('[REDACTED]');

        const denied = await service.dashboard(actor);
        expect(denied).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
        const ownLogs = await service.auditLogs(actor);
        expect(ownLogs.ok).toBe(true); if (!ownLogs.ok) return;
        expect(ownLogs.value.some(({ action, outcome, actorId }) => action === 'dashboard.read' && outcome === 'denied' && actorId === actor.actorId)).toBe(true);
        expect(ownLogs.value.every(({ organizationId }) => organizationId === ORG_ID)).toBe(true);
        expect(repository.snapshot(foreignOrganizationId)?.auditLogs).toEqual([]);

        const immutable = repository.snapshot(ORG_ID)!;
        expect(Object.isFrozen(immutable.auditLogs)).toBe(true);
        expect(Object.isFrozen(immutable.auditLogs[0])).toBe(true);
        expect(() => Object.assign(immutable.auditLogs[0]!, { outcome: 'failed' })).toThrow();
        expect(() => (immutable.auditLogs as unknown[]).pop()).toThrow();

        repository.failNextAudit = true;
        const beforeFailure = repository.snapshot(ORG_ID)!;
        const failed = await service.createPublisher(actor, {
          name: 'Rollback Publisher', type: 'organization', attributionLabel: 'Rollback',
          contacts: { secret: secretSentinel }, evidenceReference: null,
        });
        expect(failed.ok).toBe(false);
        expect(repository.snapshot(ORG_ID)).toEqual(beforeFailure);
      },
    ));
  });
});
