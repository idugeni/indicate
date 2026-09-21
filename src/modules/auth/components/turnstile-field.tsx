'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

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
 * Reports whether a Turnstile site key is configured for auth forms.
 *
 * @returns True when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is non-empty.
 */
export function isTurnstileConfigured(): boolean {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim().length > 0;
}

/**
 * Tracks a single Turnstile challenge for an auth form.
 *
 * @returns Token state with helpers to gate submits and reset the widget after each attempt, since Supabase consumes the token once.
 */
export function useTurnstileChallenge() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState(0);
  const turnstilePending = isTurnstileConfigured() && captchaToken === null;

  const resetChallenge = (): void => {
    setCaptchaToken(null);
    setChallengeNonce((value) => value + 1);
  };

  return {
    captchaToken,
    challengeNonce,
    turnstilePending,
    resetChallenge,
    onChallengeToken: setCaptchaToken,
  } as const;
}

/**
 * Renders the Cloudflare Turnstile challenge inside auth forms.
 *
 * @param onToken - Receives the one-time token on success, or null when it expires or fails.
 * @returns The widget element, a reload fallback when the challenge script fails, or nothing when no site key is configured.
 */
export function TurnstileField({ onToken }: { readonly onToken: (token: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sitekey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (sitekey === '' || hostRef.current === null) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || hostRef.current === null || window.turnstile === undefined) return;
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey,
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
  }, [sitekey, attempt, onToken]);

  if (sitekey === '') return null;
  if (loadFailed) {
    return (
      <div className="rounded border border-[#e2ded2] bg-white px-4 py-3 text-center" role="alert">
        <p className="m-0 font-sans text-xs leading-relaxed text-[#4c5b6b]">
          Verifikasi keamanan gagal dimuat. Izinkan challenges.cloudflare.com atau nonaktifkan pemblokir iklan, lalu muat ulang.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLoadFailed(false);
            setAttempt((value) => value + 1);
          }}
          className="mt-2"
        >
          Muat ulang verifikasi
        </Button>
      </div>
    );
  }
  return <div ref={hostRef} className="flex justify-center" />;
}
