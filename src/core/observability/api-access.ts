import 'server-only';

import { logApiAccess, logEvent } from '@/core/observability/logger';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/core/observability/request-id';
import { traceIdsFromHeaders } from '@/core/observability/trace-context';

type RouteHandler<T extends [Request, ...unknown[]]> = (...args: T) => Promise<Response>;

export interface ApiAccessOptions {
  /** `errors-only` mematikan `api.access` info per request untuk rute panas; galat tetap dicatat. */
  readonly accessLog?: 'full' | 'errors-only';
}

/** Ingress telemetry wrapper: reuses edge `x-request-id`, echoes it, emits `api.access`; rethrows so `onRequestError` still fires. */
export function withApiAccess<T extends [Request, ...unknown[]]>(
  route: string,
  handler: RouteHandler<T>,
  options: ApiAccessOptions = {},
): (...args: T) => Promise<Response> {
  const accessLog = options.accessLog ?? 'full';
  return async (...args: T): Promise<Response> => {
    const request = args[0];
    const requestId = resolveRequestId(request);
    const trace = traceIdsFromHeaders(request.headers);
    const started = Date.now();
    try {
      const response = await handler(...args);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      if (accessLog === 'full' || response.status >= 400) {
        logApiAccess({
          requestId,
          ...(trace === null ? {} : { traceId: trace.traceId }),
          method: request.method,
          route,
          status: response.status,
          durationMs: Date.now() - started,
        });
      }
      return response;
    } catch (error) {
      const eventId = crypto.randomUUID();
      logEvent('error', {
        event: 'api.unhandled',
        requestId,
        ...(trace === null ? {} : { traceId: trace.traceId }),
        method: request.method,
        route,
        durationMs: Date.now() - started,
        context: {
          eventId,
          name: error instanceof Error ? error.name : 'UnknownError',
        },
      });
      throw error;
    }
  };
}
