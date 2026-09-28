import 'server-only';

import { TURNSTILE_TOKEN_HEADER } from '@/core/security/turnstile-contract';
import { verifyTurnstileToken, type TurnstileVerdict } from '@/core/security/turnstile-verify';

export type ReportChallengeDenial =
  | { readonly outcome: 'rejected'; readonly status: 403 }
  | { readonly outcome: 'unavailable'; readonly status: 503 };

export type ReportChallengeGate =
  | { readonly allowed: true; readonly enforced: boolean }
  | { readonly allowed: false; readonly enforced: true; readonly denial: ReportChallengeDenial };

/**
 * Pick the Siteverify secret matching the widget that minted the token.
 *
 * @param params.sitekey - Site key the tenant's own domain record names, or null when it has no widget.
 * @param params.secrets - Configured per-widget secrets keyed by site key.
 * @returns The matching secret, or null when the tenant has no widget or its secret is absent.
 * @remarks A token is valid only under the secret of the widget that issued it, and
 * the client is not trusted to name that widget: the site key comes from the
 * tenant record resolved from the request host, and a token presented for any
 * other widget simply fails verification there. A tenant whose widget has no
 * secret provisioned is left unchallenged rather than refused, so a missing
 * secret degrades the channel to its rate limits instead of deleting it.
 */
export function reportChallengeSecret(params: {
  readonly sitekey: string | null;
  readonly secrets: ReadonlyMap<string, string>;
}): string | null {
  if (params.sitekey === null) return null;
  return params.secrets.get(params.sitekey) ?? null;
}

/**
 * Re-verify the reader's Turnstile token before a report body is parsed.
 *
 * @param params.sitekey - Site key from the tenant's domain record, or null when unprovisioned.
 * @param params.secrets - Configured per-widget secrets keyed by site key.
 * @param params.headers - Incoming request headers carrying the token and site key.
 * @param params.clientIp - Cloudflare-supplied client IP, or null when the edge supplied none.
 * @param params.verify - Injected verifier for tests; defaults to the Siteverify client.
 * @returns Allowed (with whether verification actually ran), or a denial carrying its HTTP status.
 * @remarks The widget in the browser proves nothing on its own, so the server re-checks the token
 * before the body is read and before any report row is written. Failures that blame Cloudflare answer
 * 503 rather than 403: telling a reader their submission was refused for a bot reason when the real
 * fault is a verification outage would make a recoverable incident look like a blocked reader. Tokens
 * are single-use with a 300 s life, so a legitimate slow reader re-submits with a fresh challenge
 * rather than the route having to track replay state of its own.
 */
export async function enforceReportIntakeChallenge(params: {
  readonly sitekey: string | null;
  readonly secrets: ReadonlyMap<string, string>;
  readonly headers: Headers;
  readonly clientIp: string | null;
  readonly verify?: (input: {
    readonly secret: string;
    readonly token: string | null;
    readonly remoteIp: string | null;
  }) => Promise<TurnstileVerdict>;
}): Promise<ReportChallengeGate> {
  const secret = reportChallengeSecret({ sitekey: params.sitekey, secrets: params.secrets });
  if (secret === null) return { allowed: true, enforced: false };
  const verify = params.verify ?? ((input) => verifyTurnstileToken(input));
  const verdict = await verify({
    secret,
    token: params.headers.get(TURNSTILE_TOKEN_HEADER),
    remoteIp: params.clientIp,
  });
  if (verdict.outcome === 'unverified') return { allowed: true, enforced: false };
  if (verdict.outcome === 'verified') return { allowed: true, enforced: true };
  if (verdict.outcome === 'rejected') return { allowed: false, enforced: true, denial: { outcome: 'rejected', status: 403 } };
  return { allowed: false, enforced: true, denial: { outcome: 'unavailable', status: 503 } };
}


