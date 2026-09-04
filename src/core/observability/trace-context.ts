/** W3C traceparent passthrough (no tracestate), runtime-agnostic for `proxy.ts`; zero-dependency OTEL propagation carrier. */
export const TRACEPARENT_HEADER = 'traceparent';

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const INVALID_TRACE_ID = '00000000000000000000000000000000';
const INVALID_SPAN_ID = '0000000000000000';

function randomHex(bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return [...values].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TraceContext {
  readonly traceId: string;
  readonly parentSpanId: string;
  readonly sampled: boolean;
  readonly headerValue: string;
}

function parseTraceparent(value: string): TraceContext | null {
  const match = TRACEPARENT_PATTERN.exec(value.trim().toLowerCase());
  if (match === null) return null;
  const [, traceId = '', parentSpanId = '', flags = ''] = match;
  if (traceId === INVALID_TRACE_ID || parentSpanId === INVALID_SPAN_ID || traceId === '' || parentSpanId === '' || flags === '') {
    return null;
  }
  return {
    traceId,
    parentSpanId,
    sampled: (Number.parseInt(flags, 16) & 1) === 1,
    headerValue: `00-${traceId}-${parentSpanId}-${flags}`,
  };
}

export function ensureTraceContext(headers: Headers): TraceContext {
  const incoming = headers.get(TRACEPARENT_HEADER);
  if (incoming !== null) {
    const parsed = parseTraceparent(incoming);
    if (parsed !== null) return parsed;
  }
  const traceId = randomHex(16);
  const parentSpanId = randomHex(8);
  return { traceId, parentSpanId, sampled: true, headerValue: `00-${traceId}-${parentSpanId}-01` };
}

export function traceIdsFromHeaders(headers: Headers): { traceId: string; spanId: string } | null {
  const incoming = headers.get(TRACEPARENT_HEADER);
  if (incoming === null) return null;
  const parsed = parseTraceparent(incoming);
  if (parsed === null) return null;
  return { traceId: parsed.traceId, spanId: parsed.parentSpanId };
}
