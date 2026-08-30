import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';
import { assertProperty } from '../helpers/property';

describe('Property 3: Hostname normalization converges', () => {
  // Feature: indicate-mvp, Property 3: Hostname normalization converges
  // **Validates: Requirements 3.8, 3.9, 3.10, 21.6**
  it('converges equivalent valid host spellings and rejects malformed authorities', () => {
    const label = fc.stringMatching(/^[a-z][a-z0-9]{0,12}$/);
    assertProperty('Property 3: Hostname normalization converges', fc.property(label, label, fc.integer({ min: 1, max: 65_535 }), (left, right, port) => {
      const host = `${left}.${right}.web.id`;
      const values = [host, host.toUpperCase(), `${host}.`, `${host}:${port}`, `${host.toUpperCase()}.:${port}`].map((value) => normalizeRequestHostname(value));
      expect(values.every((value) => value.ok && value.hostname === host)).toBe(true);
      for (const malformed of [null, '', `${host},evil.test`, `https://${host}`, `${host}:99999`, `*.${host}`]) expect(normalizeRequestHostname(malformed).ok).toBe(false);
    }));
  });
});
