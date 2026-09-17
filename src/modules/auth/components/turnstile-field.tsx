'use client';

import { useEffect, useRef } from 'react';

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
      reject(new Error('turnstile_unavailable'));
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing !== null) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
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
 * Renders the Cloudflare Turnstile challenge inside auth forms.
 *
 * @param onToken - Receives the one-time token on success, or null when it expires or fails.
 * @returns The widget element, or nothing when no site key is configured.
 */
export function TurnstileField({ onToken }: { readonly onToken: (token: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sitekey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();

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
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile !== undefined) window.turnstile.remove(widgetId);
    };
  }, [sitekey, onToken]);

  if (sitekey === '') return null;
  return <div ref={hostRef} className="flex justify-center" />;
}
