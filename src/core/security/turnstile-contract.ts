/** Client-safe half of the Cloudflare Turnstile contract; the verifying half lives in `turnstile-verify.ts` behind `server-only`. */

/** Request header carrying the widget token, so a route can verify before reading the JSON body. */
export const TURNSTILE_TOKEN_HEADER = 'cf-turnstile-response';

/** Siteverify rejects anything longer; bounding it here keeps a forged header from reaching the network. */
export const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
