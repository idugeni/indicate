'use client';

import 'client-only';

/** Client fault reporter: non-disclosing (error name only, no session ids); server joins correlation on Next `digest`. */
export interface ClientFaultReport {
  readonly eventId: string;
  readonly digest: string | null;
}

export function currentRoutePath(): string {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.pathname || 'unknown';
}

export function reportClientFault(input: {
  readonly digest?: string | undefined;
  readonly eventId?: string | undefined;
  readonly errorName: string;
  readonly route: string;
  readonly boundary: string;
}): ClientFaultReport {
  const digest = input.digest ?? null;
  const eventId = digest ?? input.eventId ?? crypto.randomUUID();
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'indicate-web',
      type: 'client',
      event: 'ui.fault',
      boundary: input.boundary,
      route: input.route,
      digest,
      eventId,
      errorName: input.errorName,
    }),
  );
  return { eventId, digest };
}
