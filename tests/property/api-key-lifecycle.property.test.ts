import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ApiKeyService, type ApiKeyHasher, type CredentialGenerator } from '@/application/stage6/api-key-service';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { SequenceIdentifierGenerator, ORG_ID } from '../helpers/stage3';
import { assertAsyncProperty } from '../helpers/property';

class QuickHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string) { return createHash('sha256').update(`${salt}:${secret}`).digest('base64'); }
  async verify(secret: string, salt: string, expectedHash: string) { return (await this.hash(secret, salt)) === expectedHash; }
}
class GeneratedCredential implements CredentialGenerator {
  private index = 0;
  constructor(private readonly marker: string) {}
  create() { this.index += 1; const lookupId = `${this.marker}${String(this.index).padStart(16, '0')}`.slice(-16); const secret = Buffer.from(`${this.marker}:${this.index}`.padEnd(32, 'x')).toString('base64url').slice(0, 43).padEnd(43, 'x'); return { lookupId, salt: Buffer.from(`salt:${this.marker}:${this.index}`).toString('base64'), verificationHash: '', plaintext: `ind_live_${lookupId}.${secret}` }; }
}

// Feature: indicate-mvp, Property 31: API key lifecycle preserves credential secrecy and scope
// **Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9**
describe('Property 31: API key lifecycle secrecy and scope', () => {
  it('shows plaintext once, stores only verification material, enforces scope, and atomically rotates/revokes', async () => {
    await assertAsyncProperty('Property 31: API key lifecycle preserves credential secrecy and scope', fc.asyncProperty(
      fc.record({ marker: fc.stringMatching(/^[a-f0-9]{4,12}$/), name: fc.string({ minLength: 1, maxLength: 30 }).filter((value) => value.trim().length > 0), allowed: fc.constantFrom('article.read', 'publishing.read', 'media.read') }),
      async ({ marker, name, allowed }) => {
        const repository = new InMemoryStage6Repository(); const actor = { actorType: 'user' as const, actorId: '00000000-0000-4000-8000-000000000010', verifiedAuthUserId: '00000000-0000-4000-8000-000000000090', organizationId: ORG_ID, permissionSet: new Set([STAGE6_PERMISSIONS.apiKeyManage, STAGE6_PERMISSIONS.apiKeyRead, allowed]), entryPoint: 'cms' as const, requestId: 'property-31' };
        const service = new ApiKeyService(repository, new SequenceIdentifierGenerator(), new GeneratedCredential(marker), { now: () => new Date('2026-08-30T00:00:00.000Z') }, new QuickHasher());
        const issued = await service.issue(actor, { name: name.trim(), scopes: [allowed], expiresAt: null }); expect(issued.ok).toBe(true); if (!issued.ok) return;
        const persisted = repository.snapshotApiKeys(); expect(JSON.stringify(persisted)).not.toContain(issued.value.plaintext); expect(persisted[0]?.verificationHash).not.toBe('');
        expect((await service.authenticate(issued.value.plaintext, allowed)).ok).toBe(true); expect((await service.authenticate(issued.value.plaintext, 'forbidden.scope')).ok).toBe(false);
        const rotated = await service.rotate(actor, { apiKeyId: issued.value.key.id, expectedVersion: 1 }); expect(rotated.ok).toBe(true); if (!rotated.ok) return;
        expect((await service.authenticate(issued.value.plaintext, allowed)).ok).toBe(false); expect((await service.authenticate(rotated.value.plaintext, allowed)).ok).toBe(true);
        const revoked = await service.revoke(actor, { apiKeyId: rotated.value.key.id, expectedVersion: 1 }); expect(revoked.ok).toBe(true); expect((await service.authenticate(rotated.value.plaintext, allowed)).ok).toBe(false);
        const before = repository.snapshotApiKeys(); repository.failNextAudit = true; const failed = await service.issue(actor, { name: 'rollback', scopes: [allowed], expiresAt: null }); expect(failed.ok).toBe(false); expect(repository.snapshotApiKeys()).toEqual(before);
      },
    ), ['ind_live_']);
  });
});
