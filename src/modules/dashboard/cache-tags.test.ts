import { describe, expect, it } from 'vitest';

import { orgTag } from '@/modules/dashboard/cache-tags';

describe('orgTag', () => {
  it('membungkus id organisasi dengan prefix org', () => {
    expect(orgTag('o1')).toBe('org:o1');
  });

  it('membedakan tag antar organisasi', () => {
    expect(orgTag('o1')).not.toBe(orgTag('o2'));
  });
});
