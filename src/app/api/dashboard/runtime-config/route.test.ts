import { describe, expect, it } from 'vitest';

import { runtimeConfigErrorStatus } from '@/app/api/dashboard/runtime-config/route';
import { RuntimeConfigAdminAccessDeniedError, RuntimeConfigAdminConflictError } from '@/data/repos/runtime-config/admin';

describe('runtimeConfigErrorStatus', () => {
  it('memetakan denial akses ke 404', () => {
    expect(runtimeConfigErrorStatus(new RuntimeConfigAdminAccessDeniedError())).toBe(404);
  });

  it('memetakan konflik versi ke 409', () => {
    expect(runtimeConfigErrorStatus(new RuntimeConfigAdminConflictError())).toBe(409);
  });

  it('menjatuhkan sisanya ke 500', () => {
    expect(runtimeConfigErrorStatus(new Error('db down'))).toBe(500);
  });
});
