import { describe, expect, it } from 'vitest';

import { SecretString } from '@/core/config/secret-string';

describe('SecretString perbandingan', () => {
  it('menerima kandidat yang sama dan menolak yang beda', () => {
    const secret = SecretString.fromPlain('rahasia-kuat-123');
    expect(secret.equalsPlain('rahasia-kuat-123')).toBe(true);
    expect(secret.equalsPlain('rahasia-salah-123')).toBe(false);
  });

  it('menolak kandidat beda panjang tanpa bocor waktu', () => {
    expect(SecretString.fromPlain('pendek').equalsPlain('jauh-lebih-panjang')).toBe(false);
  });
});

describe('SecretString redaksi', () => {
  it('menyembunyikan nilai dari label dan inspect', () => {
    const secret = SecretString.fromPlain('rahasia-kuat-123');
    expect(secret.label).toBe('redacted');
    expect(Reflect.get(secret, Symbol.for('nodejs.util.inspect.custom'))()).toBe('SecretString(redacted)');
  });

  it('menolak serialisasi dan koersi', () => {
    const secret = SecretString.fromPlain('rahasia-kuat-123');
    expect(() => secret.toJSON()).toThrow();
    expect(() => secret.toString()).toThrow();
    expect(() => secret[Symbol.toPrimitive]()).toThrow();
  });

  it('membuka nilai hanya lewat reveal', () => {
    expect(SecretString.fromPlain('buka-ini').reveal()).toBe('buka-ini');
  });
});
