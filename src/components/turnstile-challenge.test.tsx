// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';

import { isTurnstileConfigured } from '@/components/turnstile-challenge';

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  delete window.turnstile;
  vi.resetModules();
  vi.unstubAllGlobals();
});

/** Fresh module per test: the script loader memoizes one in-flight promise process-wide. */
async function renderChallenge(onToken: (token: string | null) => void): Promise<HTMLElement> {
  const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
  const element: ReactElement = <TurnstileChallenge onToken={onToken} />;
  render(element);
  const script = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
  if (script === null) throw new Error('turnstile_script_missing');
  return script;
}

describe('isTurnstileConfigured', () => {
  it('false tanpa kunci situs dan true dengan kunci situs', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { isTurnstileConfigured: readFresh } = await import('@/components/turnstile-challenge');
    expect(readFresh()).toBe(false);
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    expect(isTurnstileConfigured()).toBe(true);
  });
});

describe('TurnstileChallenge', () => {
  it('tidak merender apa pun saat kunci situs belum dikonfigurasi', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
    const { container } = render(<TurnstileChallenge onToken={vi.fn()} />);
    expect(container.firstChild).toBe(null);
  });

  it('merender wadah widget dan meneruskan token dari widget', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    const onToken = vi.fn();
    const script = await renderChallenge(onToken);
    expect(script.parentElement).not.toBe(null);
    window.turnstile = { render: (_element, options) => { options.callback('token-uji'); return 'widget-1'; }, remove: () => {} };
    script.dispatchEvent(new Event('load'));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('token-uji'));
  });

  it('menampilkan pemberitahuan muat ulang saat skrip challenge ditolak', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    const script = await renderChallenge(vi.fn());
    script.dispatchEvent(new Event('error'));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: /muat ulang verifikasi/i })).toBeDefined();
  });
});
