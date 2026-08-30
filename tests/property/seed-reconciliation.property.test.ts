import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { reconcileMvpSeed } from '@/application/seed/reconcile-mvp-seed';
import { MVP_REGION_DESCRIPTORS } from '@/domain/seed/mvp-seed';
import { InMemoryStage2Database } from '@/infrastructure/testing/stage2-memory';
import { assertAsyncProperty } from '../helpers/property';

const label = fc.stringMatching(/^[a-z][a-z0-9]{2,12}$/);

// Feature: indicate-mvp, Property 7: Seed reconciliation is idempotent and atomic
// **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
describe('Property 7: seed reconciliation', () => {
  it('preserves stable IDs, reconciles attributes, and rolls back injected failures', async () => {
    await assertAsyncProperty(
      'Property 7: Seed reconciliation is idempotent and atomic',
      fc.asyncProperty(fc.uniqueArray(label, { minLength: 3, maxLength: 3 }), fc.string({ minLength: 1, maxLength: 30 }), async (labels, suffix) => {
        const database = new InMemoryStage2Database();
        let id = 0;
        const identifiers = { create: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}` };
        const input = {
          organizationId: '00000000-0000-4000-8000-000000000001',
          rootHostnames: labels.map((value) => `${value}.example.web.id`),
          reservedHostnames: new Set(['indicate.web.id']),
        };
        const first = await reconcileMvpSeed(input, database, identifiers);
        const firstState = database.snapshot();
        const second = await reconcileMvpSeed(input, database, identifiers);
        expect(first).toMatchObject({ created: 6, updated: 0, unchanged: 0, failed: 0 });
        expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 6, failed: 0 });
        expect(database.snapshot().domains.map(({ id: value }) => value)).toEqual(firstState.domains.map(({ id: value }) => value));
        expect(database.snapshot().regions.map(({ id: value }) => value)).toEqual(firstState.regions.map(({ id: value }) => value));

        const changedName = `Wonosobo ${suffix}`.trim();
        const changedRegions = MVP_REGION_DESCRIPTORS.map((region) => region.externalKey === 'central-java-wonosobo'
          ? { ...region, name: changedName }
          : region);
        const changed = await reconcileMvpSeed({ ...input, regions: changedRegions }, database, identifiers);
        expect(changed.updated).toBe(changedName === 'Wonosobo' ? 0 : 1);
        expect(database.snapshot().regions.find(({ externalKey }) => externalKey === 'central-java-wonosobo')?.id)
          .toBe(firstState.regions.find(({ externalKey }) => externalKey === 'central-java-wonosobo')?.id);

        const beforeFailure = database.snapshot();
        database.failSeedAfterOperations = 2;
        await expect(reconcileMvpSeed({ ...input, rootHostnames: labels.map((value) => `${value}.other.web.id`) }, database, identifiers)).rejects.toThrow();
        expect(database.snapshot()).toEqual(beforeFailure);
      }),
    );
  });
});
