'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly callback: (token: string) => void;
  readonly ['expired-callback']: () => void;
  readonly ['error-callback']: () => void;
}

interface TurnstileApi {
  render(element: HTMLElement, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** How long a submit waits for a challenge that was only just armed before giving up and letting the server rule. */
const CHALLENGE_GRACE_MS = 2000;

interface ChallengeWaiter {
  readonly resolve: (token: string | null) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

const defaultFailureNotice: (retry: () => void) => ReactNode = (retry) => (
  <div className="rounded border border-[#e2ded2] bg-white px-4 py-3 text-center" role="alert">
    <p className="m-0 font-sans text-xs leading-relaxed text-[#4c5b6b]">
      Verifikasi keamanan gagal dimuat. Izinkan challenges.cloudflare.com atau nonaktifkan pemblokir iklan, lalu muat ulang.
    </p>
    <button
      type="button"
      onClick={retry}
      className="mt-2 inline-flex h-8 items-center rounded-md border border-[#d8d3c6] bg-white px-3 font-sans text-xs font-semibold text-[#25324a] hover:bg-[#f4f1ea]"
    >
      Muat ulang verifikasi
    </button>
  </div>
);

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise !== null) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      scriptPromise = null;
      reject(new Error('turnstile_unavailable'));
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing !== null) {
      if (window.turnstile !== undefined) {
        resolve();
        return;
      }
      if (existing.getAttribute('data-turnstile-loaded') === 'true') {
        existing.remove();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => {
            scriptPromise = null;
            reject(new Error('turnstile_unavailable'));
          },
          { once: true },
        );
        return;
      }
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute('data-turnstile-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error('turnstile_unavailable'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Resolve the site key a form should challenge against.
 *
 * @param sitekey - Caller-supplied key, used by tenant surfaces that read it from their own record.
 * @returns That key when non-empty, otherwise the single-widget `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 * @remarks Cloudflare caps one widget at ten authorized hostnames, so a tenant
 * network spanning more apexes than that needs a key per apex rather than one
 * global value. Auth surfaces have a single host and keep the environment
 * variable; the tenant report form passes the key its domain record names.
 */
export function resolveTurnstileSitekey(sitekey?: string | null): string {
  const explicit = sitekey?.trim() ?? '';
  if (explicit !== '') return explicit;
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();
}

/**
 * Tracks a single Turnstile challenge for a form, arming it only once the form is worth challenging.
 *
 * @param sitekey - Site key the form challenges against; defaults to the environment value.
 * @param armed - Whether the form already holds everything a reader meant to submit.
 * @returns Token state with helpers to gate submits, await a token still being solved, and reset the widget after each attempt, since Cloudflare consumes the token once.
 * @remarks A widget costs a Cloudflare script, a third-party iframe, and a solve on
 * every page view, including the readers who bounce without submitting anything. Arming
 * the challenge on completeness keeps that cost on the intent path and gives the reader
 * the widget's latency while they are still reading their own text, instead of on the
 * click. `waitForChallengeToken` closes the remaining gap: a reader who submits in the
 * same second the form becomes complete waits briefly for the token rather than having
 * the server refuse the report for arriving without one.
 */
export function useTurnstileChallenge(sitekey?: string | null, armed = true) {
  const resolved = resolveTurnstileSitekey(sitekey);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState(0);
  const waiters = useRef<ChallengeWaiter[]>([]);
  const turnstilePending = armed && resolved !== '' && captchaToken === null;

  const onChallengeToken = useCallback((token: string | null): void => {
    setCaptchaToken(token);
    if (token === null) return;
    const settled = waiters.current;
    waiters.current = [];
    for (const waiter of settled) {
      clearTimeout(waiter.timer);
      waiter.resolve(token);
    }
  }, []);

  const waitForChallengeToken = useCallback(
    (timeoutMs = CHALLENGE_GRACE_MS): Promise<string | null> =>
      new Promise((resolve) => {
        if (captchaToken !== null) {
          resolve(captchaToken);
          return;
        }
        if (!armed || resolved === '') {
          resolve(null);
          return;
        }
        const waiter: ChallengeWaiter = {
          resolve,
          timer: setTimeout(() => {
            waiters.current = waiters.current.filter((entry) => entry !== waiter);
            resolve(null);
          }, timeoutMs),
        };
        waiters.current = [...waiters.current, waiter];
      }),
    [armed, captchaToken, resolved],
  );

  const resetChallenge = useCallback((): void => {
    setCaptchaToken(null);
    setChallengeNonce((value) => value + 1);
  }, []);

  return {
    captchaToken,
    challengeNonce,
    turnstilePending,
    waitForChallengeToken,
    resetChallenge,
    onChallengeToken,
  } as const;
}

/**
 * Renders the Cloudflare Turnstile challenge inside a form.
 *
 * @param props.onToken - Receives the one-time token on success, or null when it expires or the widget errors.
 * @param props.sitekey - Site key the form challenges against; defaults to the environment value.
 * @param props.fallback - Replaces the default retry card when the challenge script cannot load; receives a retry callback.
 * @param props.armed - Whether the form is complete enough to challenge; the script and widget stay unmounted until it is.
 * @returns Nothing when the form is not armed yet or no site key is configured, the widget host, or the failure notice with a retry control.
 * @remarks The widget is a courtesy to the reader, never the enforcement point: the server
 * re-verifies the token, so a form that submits early or with no widget at all is refused there.
 * Arming latches: once a reader has filled the form, the widget stays mounted, so typing back
 * and forth over a field threshold cannot tear down a solve that is already running.
 */
export function TurnstileChallenge({
  onToken,
  sitekey,
  fallback = defaultFailureNotice,
  armed = true,
}: {
  readonly onToken: (token: string | null) => void;
  readonly sitekey?: string | null;
  readonly fallback?: (retry: () => void) => ReactNode;
  readonly armed?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resolvedSitekey = resolveTurnstileSitekey(sitekey);
  const [engaged, setEngaged] = useState(armed);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (armed && !engaged) setEngaged(true);

  useEffect(() => {
    if (!engaged || resolvedSitekey === '' || hostRef.current === null) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || hostRef.current === null || window.turnstile === undefined) return;
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey: resolvedSitekey,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile !== undefined) window.turnstile.remove(widgetId);
    };
  }, [engaged, resolvedSitekey, attempt, onToken]);

  if (!engaged || resolvedSitekey === '') return null;
  if (loadFailed) {
    return (
      <>
        {fallback(() => {
          setLoadFailed(false);
          setAttempt((value) => value + 1);
        })}
      </>
    );
  }
  return <div ref={hostRef} className="flex justify-center" />;
}
