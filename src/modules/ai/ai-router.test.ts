import { beforeEach, describe, expect, it } from 'vitest';

import { classifyAiError, resetAiRotationState, selectCredential } from '@/modules/ai/ai-router';
import type { AiCredentialRecord } from '@/modules/ai/ai-types';

function makeCredential(overrides: Partial<AiCredentialRecord> & { id: string }): AiCredentialRecord {
  return {
    providerId: 'gemini',
    organizationId: null,
    label: 'test key',
    keyEncrypted: 'cipher',
    keyMasked: 'abcd...wxyz',
    status: 'active',
    priority: 1,
    weight: 100,
    cooldownUntil: null,
    lastUsedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorMessage: null,
    lastErrorClass: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitCount: 0,
    quotaExhaustedCount: 0,
    avgLatencyMs: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectCredential', () => {
  beforeEach(() => {
    resetAiRotationState();
  });

  it('mengembalikan null untuk kandidat kosong', () => {
    expect(selectCredential([], 'health_aware')).toBeNull();
  });

  it('round_robin memutar kandidat secara berurutan', () => {
    const candidates = [makeCredential({ id: 'a' }), makeCredential({ id: 'b' })];
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('a');
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('b');
    expect(selectCredential(candidates, 'round_robin')?.id).toBe('a');
  });

  it('random memilih salah satu kandidat', () => {
    const candidates = [makeCredential({ id: 'a' }), makeCredential({ id: 'b' })];
    const picked = selectCredential(candidates, 'random');
    expect(['a', 'b']).toContain(picked?.id);
  });

  it('least_used memilih total_requests terkecil', () => {
    const candidates = [
      makeCredential({ id: 'busy', totalRequests: 50 }),
      makeCredential({ id: 'idle', totalRequests: 3 }),
    ];
    expect(selectCredential(candidates, 'least_used')?.id).toBe('idle');
  });

  it('lowest_error_rate memilih rasio gagal terendah', () => {
    const candidates = [
      makeCredential({ id: 'flaky', totalRequests: 10, failedRequests: 5 }),
      makeCredential({ id: 'steady', totalRequests: 10, failedRequests: 1 }),
    ];
    expect(selectCredential(candidates, 'lowest_error_rate')?.id).toBe('steady');
  });

  it('priority_based memilih angka prioritas terkecil', () => {
    const candidates = [
      makeCredential({ id: 'low', priority: 9 }),
      makeCredential({ id: 'high', priority: 1 }),
    ];
    expect(selectCredential(candidates, 'priority_based')?.id).toBe('high');
  });

  it('health_aware mengutamakan prioritas lalu rasio gagal', () => {
    const candidates = [
      makeCredential({ id: 'p2-clean', priority: 2, totalRequests: 10, failedRequests: 0 }),
      makeCredential({ id: 'p1-flaky', priority: 1, totalRequests: 10, failedRequests: 9 }),
      makeCredential({ id: 'p1-clean', priority: 1, totalRequests: 10, failedRequests: 0 }),
    ];
    expect(selectCredential(candidates, 'health_aware')?.id).toBe('p1-clean');
  });
});

describe('classifyAiError', () => {
  it('mengenali kunci tidak valid sebagai retryable', () => {
    const result = classifyAiError(new Error('API_KEY_INVALID: key not valid'));
    expect(result.errorClass).toBe('invalid_key');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali 401 sebagai invalid_key', () => {
    expect(classifyAiError('request failed with 401').errorClass).toBe('invalid_key');
  });

  it('mengenali 429 sebagai rate_limit', () => {
    const result = classifyAiError(new Error('429 resource_exhausted'));
    expect(result.errorClass).toBe('rate_limit');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali quota_exhausted eksplisit', () => {
    expect(classifyAiError('QUOTA_EXHAUSTED for project').errorClass).toBe('quota_exhausted');
  });

  it('mengenali timeout sebagai retryable', () => {
    const result = classifyAiError(new Error('deadline exceeded before response'));
    expect(result.errorClass).toBe('timeout');
    expect(result.isRetryable).toBe(true);
  });

  it('mengenali gangguan provider sebagai retryable', () => {
    expect(classifyAiError('fetch failed').errorClass).toBe('provider_unavailable');
    expect(classifyAiError('service 503').errorClass).toBe('provider_unavailable');
  });

  it('menandai blokir safety sebagai non-retryable', () => {
    const result = classifyAiError(new Error('response blocked by safety filters'));
    expect(result.errorClass).toBe('safety_blocked');
    expect(result.isRetryable).toBe(false);
  });

  it('menggolongkan error tak dikenal sebagai application_error', () => {
    const result = classifyAiError(new Error('something entirely unexpected'));
    expect(result.errorClass).toBe('application_error');
    expect(result.isRetryable).toBe(true);
    expect(result.message).toBe('something entirely unexpected');
  });
});
