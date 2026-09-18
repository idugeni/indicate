import { describe, expect, it } from 'vitest';

import { TRACEPARENT_HEADER, ensureTraceContext, traceIdsFromHeaders } from '@/core/observability/trace-context';

const VALID = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

function headersWith(value: string | null): Headers {
  const headers = new Headers();
  if (value !== null) headers.set(TRACEPARENT_HEADER, value);
  return headers;
}

describe('ensureTraceContext', () => {
  it('meneruskan traceparent valid beserta flag sampled', () => {
    const context = ensureTraceContext(headersWith(VALID));
    expect(context.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(context.parentSpanId).toBe('00f067aa0ba902b7');
    expect(context.sampled).toBe(true);
    expect(context.headerValue).toBe(VALID);
  });

  it('menandai tidak sampled saat flag nol', () => {
    const context = ensureTraceContext(headersWith('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'));
    expect(context.sampled).toBe(false);
  });

  it('membuat konteks baru saat header hilang atau rusak', () => {
    for (const incoming of [null, 'bukan-traceparent', '00-00000000000000000000000000000000-00f067aa0ba902b7-01', '00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01']) {
      const context = ensureTraceContext(headersWith(incoming));
      expect(context.traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(context.parentSpanId).toMatch(/^[0-9a-f]{16}$/);
      expect(context.sampled).toBe(true);
      expect(context.headerValue).toBe(`00-${context.traceId}-${context.parentSpanId}-01`);
    }
  });
});

describe('traceIdsFromHeaders', () => {
  it('mengekstrak trace dan span dari header valid', () => {
    expect(traceIdsFromHeaders(headersWith(VALID))).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
    });
  });

  it('mengembalikan null saat header hilang atau rusak', () => {
    expect(traceIdsFromHeaders(headersWith(null))).toBe(null);
    expect(traceIdsFromHeaders(headersWith('rusak'))).toBe(null);
  });
});
