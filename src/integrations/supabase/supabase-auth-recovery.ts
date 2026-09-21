const DEAD_SESSION_ERROR_CODES: ReadonlySet<string> = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);

const SESSION_COOKIE_PATTERN = /^sb-.+-auth-token(\.\d+)?$/;

interface AuthErrorShape {
  readonly __isAuthError?: unknown;
  readonly code?: unknown;
  readonly name?: unknown;
}

/**
 * Report whether a Supabase auth failure means the session is dead.
 *
 * @param error - Error returned from an auth call, or null when it succeeded.
 * @returns True when the stored session cannot be revived by a refresh.
 */
export function isDeadSessionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as AuthErrorShape;
  if (candidate.__isAuthError !== true) return false;
  if (candidate.name === 'AuthSessionMissingError') return true;
  return typeof candidate.code === 'string' && DEAD_SESSION_ERROR_CODES.has(candidate.code);
}

/**
 * Report whether a cookie name holds a Supabase session chunk.
 *
 * @param name - Cookie name from the request store.
 * @returns True for `sb-*-auth-token` chunks, never for the PKCE verifier.
 */
export function isSupabaseSessionCookieName(name: string): boolean {
  return SESSION_COOKIE_PATTERN.test(name);
}

type ConsoleReporter = (...args: readonly unknown[]) => void;

let filterInstalled = false;

/**
 * Silence benign stale-session chatter from the Supabase auth client.
 *
 * @remarks The client reports every dead refresh token through `console.warn`/`console.error`
 * on subscription and recovery, which floods terminals and log drains for signed-out
 * visitors. The filter drops only dead-session errors; every other call passes through.
 * Safe to call from server, edge, and browser runtimes.
 */
export function installSupabaseAuthNoiseFilter(): void {
  if (filterInstalled) return;
  filterInstalled = true;
  const methods = ['warn', 'error'] as const;
  for (const method of methods) {
    const original = console[method] as ConsoleReporter;
    console[method] = ((...args: readonly unknown[]) => {
      if (args.some(isDeadSessionError)) return;
      original(...args);
    }) as typeof console.warn;
  }
}
