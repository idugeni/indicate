import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DrizzleAiRepository } from '@/data/repos/ai';

function actor(): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set(['dashboard.read']),
    platformPermissionSet: new Set(['ai.manage']),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'req-1',
  };
}

interface RecordedCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

function buildHarness(rows: readonly unknown[]): { repository: DrizzleAiRepository; recorded: RecordedCall[] } {
  const recorded: RecordedCall[] = [];
  const chainable: Record<string, (...args: readonly unknown[]) => unknown> = {};
  for (const method of ['from', 'where', 'groupBy', 'orderBy']) {
    chainable[method] = (...args: readonly unknown[]) => {
      recorded.push({ method, args });
      return chainable;
    };
  }
  chainable.limit = async (...args: readonly unknown[]) => {
    recorded.push({ method: 'limit', args });
    return [...rows];
  };
  const transaction = {
    execute: async () => [],
    select: (...args: readonly unknown[]) => {
      recorded.push({ method: 'select', args });
      return chainable;
    },
  };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  return { repository: new DrizzleAiRepository(database as never), recorded };
}

describe('getTokenUsageByOrg', () => {
  it('mengagregat requests, tokens, dan blocked per organisasi', async () => {
    const { repository } = buildHarness([
      { organizationId: 'org-a', requests: '3', tokens: '150', blocked: '1' },
      { organizationId: null, requests: '2', tokens: '40', blocked: '0' },
    ]);
    const rows = await repository.getTokenUsageByOrg(actor(), 7);
    expect(rows).toEqual([
      { organizationId: 'org-a', requests: 3, tokens: 150, blocked: 1 },
      { organizationId: null, requests: 2, tokens: 40, blocked: 0 },
    ]);
  });

  it('membatasi 25 baris untuk window 30 hari', async () => {
    const { repository, recorded } = buildHarness([]);
    await repository.getTokenUsageByOrg(actor(), 30);
    expect(recorded.find((call) => call.method === 'limit')?.args).toEqual([25]);
    expect(recorded.some((call) => call.method === 'groupBy')).toBe(true);
  });

  it('agregat kosong menghasilkan daftar kosong', async () => {
    const { repository } = buildHarness([]);
    await expect(repository.getTokenUsageByOrg(actor())).resolves.toEqual([]);
  });
});
