import { describe, expect, it } from 'vitest';

import { redact, sanitizeError } from '@/core/security/redaction';

describe('redact', () => {
  it('menyensor nilai di balik key sensitif', () => {
    const output = redact({ apiKey: 'secret-1', name: 'Portal', nested: { password: 'x', limit: 10 } }) as Record<string, unknown>;
    expect(output.apiKey).toBe('[REDACTED]');
    expect(output.name).toBe('Portal');
    expect((output.nested as Record<string, unknown>).password).toBe('[REDACTED]');
    expect((output.nested as Record<string, unknown>).limit).toBe(10);
  });

  it('menyensor kredensial dalam URL dan bearer token', () => {
    expect(redact('https://user:pass@example.test/x')).toBe('https://[REDACTED]@example.test/x');
    expect(redact('Bearer abcdef12345')).toBe('Bearer [REDACTED]');
    expect(redact('https://a.test/cb?token=zzz&next=1')).toBe('https://a.test/cb?token=[REDACTED]&next=1');
  });

  it('mengganti sentinel rahasia yang dikenal', () => {
    expect(redact('kunci webhook-secret-1 bocor', { secretSentinels: ['webhook-secret-1'] })).toBe('kunci [REDACTED] bocor');
  });

  it('memotong struktur dalam dan melingkar', () => {
    let deep: unknown = 'dasar';
    for (let level = 0; level < 12; level += 1) deep = { next: deep };
    expect(redact(deep)).toEqual(expect.anything());
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(redact(circular)).toEqual({ self: '[CIRCULAR]' });
  });
});

describe('sanitizeError', () => {
  it('menyembunyikan pesan error asli tanpa sentinel', () => {
    const output = sanitizeError(new Error('postgres://admin:secret@db/x'));
    expect(output.message).toBe('A dependency operation failed.');
    expect(output).not.toHaveProperty('redactionApplied');
  });

  it('menandai redaksi saat sentinel tersedia', () => {
    const output = sanitizeError(new Error('boom'), { secretSentinels: ['boom'] });
    expect(output.redactionApplied).toBe(true);
  });

  it('menangani non-error secara generik', () => {
    expect(sanitizeError('string')).toEqual({ name: 'UnknownError', message: 'An unexpected error occurred.' });
  });
});
