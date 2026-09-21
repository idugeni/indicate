interface RequestErrorRequest {
  readonly path: string;
  readonly method: string;
  readonly headers: Headers;
}

interface RequestErrorContext {
  readonly routerKind: string;
  readonly routePath: string;
  readonly routeType: string;
  readonly renderSource?: unknown;
  readonly renderPhase?: unknown;
  readonly revalidateReason?: unknown;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // Bootstrap-first: validate config before I/O, then hydrate the server runtime snapshot. Must not crash startup when the DB is down.
  try {
    const { registerServerRuntime } = await import('@/core/config/runtime/runtime-context');
    await registerServerRuntime();
  } catch (error) {
    const { logEvent } = await import('@/core/observability/logger');
    const { sanitizeError } = await import('@/core/security/redaction');
    logEvent('warn', { event: 'lifecycle.runtime-deferred', context: sanitizeError(error) });
  }

  // Kept in a separate module so `process.on` never enters the Edge bundle (Node.js runtime only).
  const { attachProcessSafetyNet } = await import('@/core/observability/process-safety-net');
  await attachProcessSafetyNet();
}

/**
 * Server-fault capture (Next.js `onRequestError`) for RSC, route, and Server Action failures.
 * The client `error.digest` joins these records with the UI Ref; no session identifiers travel
 * either way. OTEL-ready: attach these fields as span attributes when the SDK is added.
 */
export async function onRequestError(
  err: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext,
): Promise<void> {
  try {
    const { logEvent } = await import('@/core/observability/logger');
    const { sanitizeError } = await import('@/core/security/redaction');
    const { traceIdsFromHeaders } = await import('@/core/observability/trace-context');
    const incomingId = request.headers.get('x-request-id');
    const requestId =
      incomingId !== null && /^[A-Za-z0-9_-]{1,128}$/.test(incomingId) ? incomingId : 'unknown';
    const trace = traceIdsFromHeaders(request.headers);
    const digest = typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : undefined;
    logEvent('error', {
      event: 'server.fault',
      requestId,
      ...(trace === null ? {} : { traceId: trace.traceId, spanId: trace.spanId }),
      route: `${request.method} ${context.routePath || request.path}`,
      method: request.method,
      context: {
        digest,
        routerKind: context.routerKind,
        routeType: context.routeType,
        path: request.path,
        ...sanitizeError(err),
      },
    });
  } catch {
    /* logging must never crash the request pipeline */
  }
}
