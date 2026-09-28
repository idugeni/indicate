import 'server-only';

import { TURNSTILE_MAX_TOKEN_LENGTH } from '@/core/security/turnstile-contract';

export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5_000;

/** Why a reader's token was refused; every value blames the token, never the tenant. */
export type TurnstileRejection =
  | 'token_missing'
  | 'token_oversized'
  | 'token_invalid'
  | 'token_expired_or_replayed';

export type TurnstileVerdict =
  /** No secret provisioned, so nothing was verified and the caller decides whether that is acceptable. */
  | { readonly outcome: 'unverified' }
  | { readonly outcome: 'verified' }
  | { readonly outcome: 'rejected'; readonly reason: TurnstileRejection }
  /** Cloudflare could not be reached or answered with something this code cannot read. */
  | { readonly outcome: 'unavailable' };

interface SiteverifyPayload {
  readonly success?: unknown;
  readonly ['error-codes']?: unknown;
}

/** Codes Cloudflare raises for the caller's token; anything else describes a fault on Cloudflare's side. */
const TOKEN_SIDE_ERROR_CODES: ReadonlyMap<string, TurnstileRejection> = new Map([
  ['missing-input-response', 'token_missing'],
  ['invalid-input-response', 'token_invalid'],
  ['timeout-or-duplicate', 'token_expired_or_replayed'],
]);

function classifyFailure(payload: SiteverifyPayload): TurnstileVerdict {
  const codes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];
  for (const code of codes) {
    if (typeof code !== 'string') continue;
    const rejection = TOKEN_SIDE_ERROR_CODES.get(code);
    if (rejection !== undefined) return { outcome: 'rejected', reason: rejection };
  }
  return { outcome: 'unavailable' };
}

/**
 * Validate a Cloudflare Turnstile token against the Siteverify API.
 *
 * @param params.secret - Siteverify secret of the widget that minted the token; null disables verification.
 * @param params.token - Widget token carried by the `cf-turnstile-response` header; null when the client sent none.
 * @param params.remoteIp - Cloudflare-supplied client IP, or null to omit `remoteip`.
 * @param params.timeoutMs - Abort deadline for the Siteverify call; default 5 s.
 * @param params.fetchImpl - Injected transport for tests; defaults to global `fetch`.
 * @returns `verified`, a token-side `rejected` reason, `unavailable` when the answer cannot be trusted, or
 * `unverified` when no secret is configured.
 * @remarks Verification never trusts the browser: the widget alone proves nothing, and a token is
 * single-use and expires in 300 s, so a replay or a stale submission is refused by Cloudflare itself.
 * `action` and `hostname` are deliberately not pinned. The tenant surface answers on hundreds of
 * distinct hostnames, so a hostname check would need an allowlist the Site key does not carry, and
 * Cloudflare's documented testing secret always answers `action: "test"` regardless of the widget, so an
 * action check would break the local key pair while adding nothing that single-use tokens do not already
 * cover. Anything this code cannot read is `unavailable` rather than a pass, so a Siteverify outage
 * denies instead of admitting an unverified submission.
 */
export async function verifyTurnstileToken(params: {
  readonly secret: string | null;
  readonly token: string | null;
  readonly remoteIp?: string | null;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<TurnstileVerdict> {
  const secret = params.secret?.trim() ?? '';
  if (secret === '') return { outcome: 'unverified' };
  const token = params.token?.trim() ?? '';
  if (token === '') return { outcome: 'rejected', reason: 'token_missing' };
  if (token.length > TURNSTILE_MAX_TOKEN_LENGTH) return { outcome: 'rejected', reason: 'token_oversized' };

  const transport = params.fetchImpl ?? fetch;
  let payload: SiteverifyPayload;
  try {
    const response = await transport(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        ...(params.remoteIp == null || params.remoteIp === '' ? {} : { remoteip: params.remoteIp }),
      }),
      signal: AbortSignal.timeout(params.timeoutMs ?? VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return { outcome: 'unavailable' };
    payload = (await response.json()) as SiteverifyPayload;
  } catch {
    return { outcome: 'unavailable' };
  }
  if (typeof payload.success !== 'boolean') return { outcome: 'unavailable' };
  return payload.success ? { outcome: 'verified' } : classifyFailure(payload);
}
