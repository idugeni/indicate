// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';

const USER_ID = '1d9fc14a-3fb9-49c8-9ac9-e2f78d10f8cd';
const ORG_ID = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0';
type Database = ConstructorParameters<typeof DrizzleAuthorizationRepository>[0];

/**
 * Fake connection that records the order of executed statements: the RLS guard
 * inside `permission_list_platform` only passes once `app.actor_id` is set.
 */
function fakeDatabase() {
  const statements: string[] = [];
  const execute = vi.fn(async (statement: unknown) => {
    const text = JSON.stringify(statement, (key, value) => (value === undefined ? '<param>' : value));
    statements.push(text);
    return text.includes('permission_list_platform') ? [{ name: 'platform.super_admin' }] : [];
  });
  const database = {
    transaction: async (run: (tx: { readonly execute: typeof execute }) => unknown) => run({ execute }),
  };
  return { statements, database: database as unknown as Database };
}

describe('Izin platform', () => {
  it('menyetel app.actor_id sebelum memanggil permission_list_platform', async () => {
    const { database, statements } = fakeDatabase();
    const permissions = await new DrizzleAuthorizationRepository(database).listPlatformPermissions(USER_ID);
    expect(permissions).toEqual(['platform.super_admin']);
    const actorIndex = statements.findIndex((entry) => entry.includes('app.actor_id'));
    const lookupIndex = statements.findIndex((entry) => entry.includes('permission_list_platform'));
    expect(actorIndex).toBeGreaterThanOrEqual(0);
    expect(lookupIndex).toBeGreaterThan(actorIndex);
  });

  it('memakai set_tenant_context ketika organisasi tersedia', async () => {
    const { database, statements } = fakeDatabase();
    await new DrizzleAuthorizationRepository(database).listPlatformPermissions(USER_ID, ORG_ID);
    expect(statements.some((entry) => entry.includes('set_tenant_context'))).toBe(true);
    expect(statements.some((entry) => entry.includes('app.actor_id'))).toBe(false);
  });
});
