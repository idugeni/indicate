import { describe, expect, it, vi } from 'vitest';

import { createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import type { RateLimitDecision, RateLimitPolicy } from '@/modules/integrations/models';
import { enforceReportIntakeThrottle, REPORT_IP_RATE_LIMIT_CLASS, REPORT_IP_POLICY, REPORT_RATE_LIMIT_CLASS, REPORT_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS, type ReportRateLimiter } from '@/modules/moderation/report-intake-throttle';

const HOST_POLICY = { allowance: 60, windowSeconds: 60 };

function limiter(options: { readonly limitedClasses?: readonly string[]; readonly failingClasses?: readonly string[] } = {}) {
  const limited = new Set(options.limitedClasses ?? []);
  const failing = new Set(options.failingClasses ?? []);
  const enforce = vi.fn(async (key: string, policy: RateLimitPolicy): Promise<Result<RateLimitDecision, PublicErrorEnvelope>> => {
    void policy;
    const endpointClass = key.split(':')[0] ?? '';
    if (failing.has(endpointClass)) {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Request protection is temporarily unavailable.', 'req-1') };
    }
    if (limited.has(endpointClass)) {
      return { ok: false, error: createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', 'req-1', { retryAfterSeconds: ['42'] }) };
    }
    return { ok: true, value: { allowed: true, remaining: 9, retryAfterSeconds: 0, resetAt: '2026-09-28T00:00:00.000Z' } };
  });
  const service: ReportRateLimiter = {
    publicKey: (endpointClass: string, source: string) => `${endpointClass}:public:${source.replace(/[^A-Za-z0-9:_-]/g, '_')}`,
    enforce,
  };
  return { service, enforce };
}

describe('enforceReportIntakeThrottle', () => {
  it('menegakkan bucket per-host dan per-IP secara berurutan', async () => {
    const { service, enforce } = limiter();
    const result = await enforceReportIntakeThrottle(service, {
      hostname: 'wonosobo.example',
      clientIp: '203.0.113.7',
      hostPolicy: HOST_POLICY,
      requestId: 'req-1',
    });
    expect(result).toEqual({ allowed: true });
    expect(enforce).toHaveBeenCalledTimes(2);
    expect(enforce.mock.calls.map(([key]) => key)).toEqual([
      `${REPORT_RATE_LIMIT_CLASS}:public:wonosobo_example`,
      `${REPORT_IP_RATE_LIMIT_CLASS}:public:wonosobo_example_203_0_113_7`,
    ]);
  });

  it('memakai policy ketat per-IP, bukan policy publik per-host', async () => {
    const { service, enforce } = limiter();
    await enforceReportIntakeThrottle(service, { hostname: 'wonosobo.example', clientIp: '203.0.113.7', hostPolicy: HOST_POLICY, requestId: 'req-1' });
    expect(enforce.mock.calls[0]?.[1]).toEqual({ ...HOST_POLICY, failureMode: 'closed' });
    expect(enforce.mock.calls[1]?.[1]).toEqual({ ...REPORT_IP_POLICY, failureMode: 'closed' });
  });

  it('menolak saat bucket per-host habis', async () => {
    const { service, enforce } = limiter({ limitedClasses: [REPORT_RATE_LIMIT_CLASS] });
    const result = await enforceReportIntakeThrottle(service, { hostname: 'wonosobo.example', clientIp: '203.0.113.7', hostPolicy: HOST_POLICY, requestId: 'req-1' });
    expect(result).toEqual({ allowed: false, retryAfterSeconds: '42' });
    expect(enforce).toHaveBeenCalledTimes(1);
  });

  it('menolak saat bucket per-IP habis walau per-host masih longgar', async () => {
    const { service } = limiter({ limitedClasses: [REPORT_IP_RATE_LIMIT_CLASS] });
    const result = await enforceReportIntakeThrottle(service, { hostname: 'wonosobo.example', clientIp: '203.0.113.7', hostPolicy: HOST_POLICY, requestId: 'req-1' });
    expect(result).toEqual({ allowed: false, retryAfterSeconds: '42' });
  });

  it('menolak fail-closed saat Redis tidak terjangkau', async () => {
    const { service } = limiter({ failingClasses: [REPORT_IP_RATE_LIMIT_CLASS] });
    const result = await enforceReportIntakeThrottle(service, { hostname: 'wonosobo.example', clientIp: '203.0.113.7', hostPolicy: HOST_POLICY, requestId: 'req-1' });
    expect(result).toEqual({ allowed: false, retryAfterSeconds: REPORT_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS });
  });

  it('tetap memakai bucket per-host saja saat IP client tidak tersedia', async () => {
    const { service, enforce } = limiter();
    const result = await enforceReportIntakeThrottle(service, { hostname: 'wonosobo.example', clientIp: null, hostPolicy: HOST_POLICY, requestId: 'req-1' });
    expect(result).toEqual({ allowed: true });
    expect(enforce).toHaveBeenCalledTimes(1);
    expect(enforce.mock.calls[0]?.[0]).toBe(`${REPORT_RATE_LIMIT_CLASS}:public:wonosobo_example`);
  });
});
