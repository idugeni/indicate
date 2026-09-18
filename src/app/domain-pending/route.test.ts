import { describe, expect, it } from 'vitest';

import { isPendingAttemptId } from '@/app/domain-pending/route';

describe('isPendingAttemptId', () => {
  it('menerima UUID valid', () => {
    expect(isPendingAttemptId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('menolak null, kosong, dan format liar', () => {
    expect(isPendingAttemptId(null)).toBe(false);
    expect(isPendingAttemptId('bukan-uuid')).toBe(false);
    expect(isPendingAttemptId('123e4567-e89b-92d3-a456-426614174000')).toBe(false);
  });
});
