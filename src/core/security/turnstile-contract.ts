/** Client-safe half of the Cloudflare Turnstile contract; the verifying half lives in `turnstile-verify.ts` behind `server-only`. */

/** Request header carrying the widget token, so a route can verify before reading the JSON body. */
export const TURNSTILE_TOKEN_HEADER = 'cf-turnstile-response';

/**
 * Request header naming the widget that issued the token.
 *
 * @remarks Cloudflare caps one widget at ten authorized hostnames, so a network
 * spanning hundreds of apexes needs several widgets. The server cannot infer
 * which one minted a token, and verification has to use that widget's own
 * secret: a token is only valid under the secret of the key that produced it.
 * The client states the key, and the server accepts it only when it matches the
 * site key its own tenant record names, so this header selects a secret rather
 * than granting one.
 */
export const TURNSTILE_SITEKEY_HEADER = 'cf-turnstile-sitekey';

/** Siteverify rejects anything longer; bounding it here keeps a forged header from reaching the network. */
export const TURNSTILE_MAX_TOKEN_LENGTH = 2048;

/** Site key shape enforced by the `domains_report_challenge_sitekey_format` check constraint. */
export const TURNSTILE_SITEKEY_PATTERN = /^0x[0-9A-Za-z_-]{10,64}$/u;
