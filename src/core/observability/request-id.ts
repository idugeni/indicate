/** Edge-to-route correlation, runtime-agnostic (no `server-only`) for `proxy.ts` + API routes. */
export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function mintRequestId(): string {
  return crypto.randomUUID();
}

/** Trust-but-verify: reuse a well-formed inbound id, otherwise mint fresh. */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  if (incoming !== null && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return mintRequestId();
}

export function ensureRequestId(headers: Headers): { requestId: string; forwarded: boolean } {
  const incoming = headers.get(REQUEST_ID_HEADER);
  if (incoming !== null && REQUEST_ID_PATTERN.test(incoming)) {
    return { requestId: incoming, forwarded: true };
  }
  return { requestId: mintRequestId(), forwarded: false };
}
