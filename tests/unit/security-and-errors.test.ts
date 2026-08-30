import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/shared/errors/application-error';
import { resolveRequestId } from '@/shared/request/request-id';
import { redact, sanitizeError } from '@/shared/security/redaction';
import { safeRedirectPath } from '@/shared/security/safe-redirect-path';

describe('redaction and public errors', () => {
  it('redacts sensitive keys, sentinels, circular values, and credential-bearing strings', () => {
    const value: Record<string, unknown> = {
      token: 'secret-token',
      serviceRoleKey: 'service-role',
      accessKeyId: 'access-key',
      message: 'failed with SENTINEL at https://user:password@example.test/path?token=raw-token',
    };
    value.self = value;
    expect(redact(value, { secretSentinels: ['SENTINEL'] })).toEqual({
      token: '[REDACTED]',
      serviceRoleKey: '[REDACTED]',
      accessKeyId: '[REDACTED]',
      message: 'failed with [REDACTED] at https://[REDACTED]@example.test/path?token=[REDACTED]',
      self: '[CIRCULAR]',
    });
  });

  it('sanitizes Error instances without provider messages or stack traces', () => {
    const output = sanitizeError(new Error('bad SECRET'), { secretSentinels: ['SECRET'] });
    expect(output).toEqual({
      name: 'Error',
      message: 'A dependency operation failed.',
      redactionApplied: true,
    });
    expect(output).not.toHaveProperty('stack');
  });

  it('uses one non-disclosing denial shape', () => {
    const absent = createNonDisclosingDenial('request-1');
    const crossTenant = createNonDisclosingDenial('request-1');
    expect(absent).toEqual(crossTenant);
    expect(absent.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('preserves field-specific public validation errors', () => {
    expect(createPublicError('INVALID_INPUT', 'Invalid input.', 'request-2', { title: ['required'] })).toEqual({
      error: { code: 'INVALID_INPUT', message: 'Invalid input.', fields: { title: ['required'] } },
      requestId: 'request-2',
    });
  });

  it('rejects cross-origin and backslash authentication redirects', () => {
    expect(safeRedirectPath('/cms?tab=sites')).toBe('/cms?tab=sites');
    expect(safeRedirectPath('//evil.example/path')).toBe('/');
    expect(safeRedirectPath('/\\\\evil.example/path')).toBe('/');
    expect(safeRedirectPath('https://evil.example')).toBe('/');
  });

  it('accepts safe request IDs and replaces unsafe values', () => {
    expect(resolveRequestId('safe_request-123')).toBe('safe_request-123');
    expect(resolveRequestId('unsafe value')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
