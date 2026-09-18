import { describe, expect, it } from 'vitest';

import { contentErrorStatus } from '@/app/api/dashboard/content/route';
import { ContentAdminAccessDeniedError } from '@/data/repos/content/admin';

describe('contentErrorStatus', () => {
  it('memetakan denial akses ke 404', () => {
    expect(contentErrorStatus(new ContentAdminAccessDeniedError())).toBe(404);
  });

  it('menjatuhkan kegagalan repo ke 500', () => {
    expect(contentErrorStatus(new Error('db down'))).toBe(500);
  });
});
