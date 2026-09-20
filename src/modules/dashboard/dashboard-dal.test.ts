import { describe, expect, it } from 'vitest';

import { fetchCachedAnalytics } from '@/modules/dashboard/dashboard-dal';

const ACTOR = {
  actorType: 'user',
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-1',
  organizationId: 'org-1',
  permissionSet: new Set(['analytics.read']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
} as const;

describe('fetchCachedAnalytics', () => {
  it('menolak filter tak valid tanpa menyentuh cache', async () => {
    const result = await fetchCachedAnalytics(ACTOR, { from: 'bukan-tanggal' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error.code).toBe('INVALID_INPUT');
      expect(result.error.error.fields).toStrictEqual({ from: expect.any(Array) });
    }
  });
});
