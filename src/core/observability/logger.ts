import 'server-only';

import { getAppEnvironment, isObservabilityDebugEnabled } from '@/core/config/runtime/runtime-flags';
import { redact } from '@/core/security/redaction';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogFields {
  readonly event: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly route?: string;
  readonly method?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly context?: Readonly<Record<string, unknown>>;
}

const SERVICE_NAME = 'indicate-web';

/** Structured JSON-line logger; context passes through `redact()` so credentials never reach telemetry. */
export function logEvent(level: LogLevel, fields: LogFields): void {
  if (level === 'debug' && !isObservabilityDebugEnabled()) return;
  const { event, requestId, traceId, spanId, route, method, status, durationMs, context } = fields;
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    environment: getAppEnvironment(),
    event,
    ...(requestId === undefined ? {} : { requestId }),
    ...(traceId === undefined ? {} : { traceId }),
    ...(spanId === undefined ? {} : { spanId }),
    ...(route === undefined ? {} : { route }),
    ...(method === undefined ? {} : { method }),
    ...(status === undefined ? {} : { status }),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(context === undefined ? {} : { context: redact(context) as Record<string, unknown> }),
  };
  const line = JSON.stringify(record);
  if (level === 'warn' || level === 'error' || level === 'fatal') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logApiAccess(input: {
  readonly requestId: string;
  readonly traceId?: string;
  readonly method: string;
  readonly route: string;
  readonly status: number;
  readonly durationMs: number;
}): void {
  const level: LogLevel = input.status >= 500 ? 'error' : input.status >= 400 ? 'warn' : 'info';
  logEvent(level, {
    event: 'api.access',
    requestId: input.requestId,
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    method: input.method,
    route: input.route,
    status: input.status,
    durationMs: input.durationMs,
  });
}
