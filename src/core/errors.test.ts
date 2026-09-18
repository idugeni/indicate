import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

describe('createNonDisclosingDenial', () => {
  it('memakai pesan non-disclosing dan membekukan envelope', () => {
    const envelope = createNonDisclosingDenial('req-1');
    expect(envelope.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(envelope.error.message).toBe('The requested resource is unavailable.');
    expect(envelope.requestId).toBe('req-1');
    expect(Object.isFrozen(envelope)).toBe(true);
  });
});

describe('createPublicError', () => {
  it('menghilangkan fields saat tidak diberikan', () => {
    const envelope = createPublicError('INVALID_INPUT', 'buruk', 'req-2');
    expect(envelope.error).toEqual({ code: 'INVALID_INPUT', message: 'buruk' });
  });

  it('menyertakan fields saat diberikan', () => {
    const envelope = createPublicError('INVALID_INPUT', 'buruk', 'req-3', { nama: ['wajib'] });
    expect(envelope.error.fields).toEqual({ nama: ['wajib'] });
  });
});
