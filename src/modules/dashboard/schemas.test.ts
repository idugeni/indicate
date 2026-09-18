import { describe, expect, it } from 'vitest';

import { siteCachePurgeSchema } from '@/modules/dashboard/schemas';

describe('siteCachePurgeSchema', () => {
  it('menolak purge massal tanpa konfirmasi eksplisit', () => {
    expect(siteCachePurgeSchema.safeParse({}).success).toBe(false);
  });

  it('menerima purge massal dengan konfirmasi eksplisit', () => {
    expect(siteCachePurgeSchema.safeParse({ confirmBulk: true }).success).toBe(true);
  });

  it('menerima purge satu situs tanpa konfirmasi massal', () => {
    expect(siteCachePurgeSchema.safeParse({ siteId: '0199a2b3-4c5d-7e8f-9012-3456789abcde' }).success).toBe(true);
  });
});
