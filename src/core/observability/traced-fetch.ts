import 'server-only';

import { logEvent } from '@/core/observability/logger';
import { REQUEST_ID_HEADER } from '@/core/observability/request-id';
import { TRACEPARENT_HEADER } from '@/core/observability/trace-context';

export interface TracedFetchOptions {
  readonly requestId?: string | undefined;
  readonly traceparent?: string | undefined;
  readonly service: string;
  readonly operation: string;
  readonly timeoutMs?: number;
}

/** Outbound fetch with tracing propagation + timeout; logs failures only with redacted URL. */
export async function tracedFetch(
  input: string | URL,
  init: RequestInit | undefined,
  options: TracedFetchOptions,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (options.requestId !== undefined && options.requestId !== '') {
    headers.set(REQUEST_ID_HEADER, options.requestId);
  }
  if (options.traceparent !== undefined && options.traceparent !== '') {
    headers.set(TRACEPARENT_HEADER, options.traceparent);
  }
  const started = Date.now();
  try {
    const response = await fetch(input, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    if (!response.ok) {
      logEvent('warn', {
        event: 'egress.failed',
        ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
        method: init?.method ?? 'GET',
        route: `egress:${options.service}:${options.operation}`,
        status: response.status,
        durationMs: Date.now() - started,
        context: { url: String(input) },
      });
    }
    return response;
  } catch (error) {
    logEvent('error', {
      event: 'egress.error',
      ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
      method: init?.method ?? 'GET',
      route: `egress:${options.service}:${options.operation}`,
      durationMs: Date.now() - started,
      context: { url: String(input), name: error instanceof Error ? error.name : 'UnknownError' },
    });
    throw error;
  }
}
