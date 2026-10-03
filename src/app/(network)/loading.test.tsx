// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import PublicLoading from '@/app/(network)/loading';

describe('Fallback pemuatan jaringan', () => {
  it('mengembalikan null agar loader domain utama tidak bocor ke template tenant', () => {
    expect(PublicLoading()).toBeNull();
  });
});
