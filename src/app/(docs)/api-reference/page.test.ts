import { describe, expect, it } from 'vitest';

import { ruleLabel, typeLabel } from '@/app/(docs)/api-reference/page';

describe('typeLabel', () => {
  it('melabeli literal, enum, array, dan map', () => {
    expect(typeLabel({ const: 'paid' })).toBe('"paid"');
    expect(typeLabel({ enum: ['a', 'b'] })).toBe('"a" | "b"');
    expect(typeLabel({ type: 'array', items: { type: 'string' } })).toBe('array<string>');
    expect(typeLabel({ type: 'object', additionalProperties: { type: 'string' } })).toBe('map');
  });

  it('menambah format dan nullable', () => {
    expect(typeLabel({ type: 'string', format: 'date-time', nullable: true })).toBe('string(date-time) | null');
    expect(typeLabel({})).toBe('any');
  });
});

describe('ruleLabel', () => {
  it('merangkai wajib, panjang, minimum, pola, dan default', () => {
    expect(ruleLabel('nama', { minLength: 1, maxLength: 60 }, true)).toBe('wajib, panjang 1–60');
    expect(ruleLabel('catatan', {}, false)).toBe('opsional');
    expect(ruleLabel('umur', { minimum: 0, pattern: '^[0-9]+$', default: 0 }, true)).toBe('wajib, ≥ 0, pola regex, default 0');
  });
});
