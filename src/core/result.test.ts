import { describe, expect, it } from 'vitest';

import { failure, success } from '@/core/result';

describe('success', () => {
  it('membungkus nilai dengan penanda ok', () => {
    expect(success({ id: 'a' })).toEqual({ ok: true, value: { id: 'a' } });
  });
});

describe('failure', () => {
  it('membungkus galat dengan penanda gagal', () => {
    expect(failure('boom')).toEqual({ ok: false, error: 'boom' });
  });
});
