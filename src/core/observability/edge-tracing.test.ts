import { describe, expect, it } from 'vitest';

import { isServicePath, SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import { ensureTraceContext, TRACEPARENT_HEADER, traceIdsFromHeaders } from '@/core/observability/trace-context';

describe('isServicePath', () => {
  it('mengenali path layanan eksak dan segmen', () => {
    expect(SERVICE_PATHS).toContain('/pricing');
    expect(isServicePath('/pricing')).toBe(true);
    expect(isServicePath('/pricing/extra')).toBe(true);
    expect(isServicePath('/berita-utama')).toBe(false);
    expect(isServicePath('/pricingextra')).toBe(false);
  });
});

describe('ensureTraceContext', () => {
  const VALID = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

  it('memakai ulang traceparent valid', () => {
    const context = ensureTraceContext(new Headers({ [TRACEPARENT_HEADER]: VALID }));
    expect(context.headerValue).toBe(VALID);
    expect(context).toMatchObject({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736', sampled: true });
  });

  it('membuat baru untuk header rusak atau absen', () => {
    const broken = ensureTraceContext(new Headers({ [TRACEPARENT_HEADER]: 'rusak' }));
    expect(broken.headerValue).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    const minted = ensureTraceContext(new Headers());
    expect(minted.sampled).toBe(true);
    expect(minted.headerValue).not.toBe(broken.headerValue);
  });

  it('menolak trace id nol', () => {
    const zero = ensureTraceContext(
      new Headers({ [TRACEPARENT_HEADER]: '00-00000000000000000000000000000000-00f067aa0ba902b7-01' }),
    );
    expect(zero.headerValue).not.toContain('00000000000000000000000000000000');
  });
});

describe('traceIdsFromHeaders', () => {
  it('mengekstrak id atau null', () => {
    expect(traceIdsFromHeaders(new Headers({ [TRACEPARENT_HEADER]: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' }))).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
    });
    expect(traceIdsFromHeaders(new Headers())).toBe(null);
    expect(traceIdsFromHeaders(new Headers({ [TRACEPARENT_HEADER]: 'rusak' }))).toBe(null);
  });
});
