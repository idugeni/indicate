// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';

import { resolveTurnstileSitekey } from '@/components/turnstile-challenge';

const WIDGET = '0x4AAAAAAFHN_lpLqmLytOD5';

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  delete window.turnstile;
  vi.resetModules();
  vi.unstubAllGlobals();
});

/** Fresh module per test: the script loader memoizes one in-flight promise process-wide. */
async function renderChallenge(props: { readonly sitekey?: string | null }): Promise<HTMLScriptElement> {
  const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
  const element: ReactElement = <TurnstileChallenge onToken={vi.fn()} {...props} />;
  render(element);
  return waitFor(() => {
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
    if (script === null) throw new Error('turnstile_script_missing');
    return script;
  });
}

describe('resolveTurnstileSitekey', () => {
  it('memakai kunci yang diberikan pemanggil bila ada', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-lingkungan';
    expect(resolveTurnstileSitekey(WIDGET)).toBe(WIDGET);
    expect(resolveTurnstileSitekey(`  ${WIDGET}  `)).toBe(WIDGET);
  });

  it('jatuh ke kunci lingkungan untuk surface satu widget', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-lingkungan';
    expect(resolveTurnstileSitekey()).toBe('kunci-lingkungan');
    expect(resolveTurnstileSitekey(null)).toBe('kunci-lingkungan');
    expect(resolveTurnstileSitekey('   ')).toBe('kunci-lingkungan');
  });

  it('kosong tanpa kunci lingkungan dan tanpa kunci pemanggil', () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    expect(resolveTurnstileSitekey()).toBe('');
    expect(resolveTurnstileSitekey(null)).toBe('');
  });
});

describe('TurnstileChallenge', () => {
  it('tidak merender apa pun saat tidak ada kunci situs', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
    const { container } = render(<TurnstileChallenge onToken={vi.fn()} />);
    expect(container.firstChild).toBe(null);
  });

  it('merender wadah widget dan meneruskan token dari widget', async () => {
    const onToken = vi.fn();
    const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
    render(<TurnstileChallenge onToken={onToken} sitekey={WIDGET} />);
    const script = await waitFor(() => {
      const found = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
      if (found === null) throw new Error('turnstile_script_missing');
      return found;
    });
    window.turnstile = { render: (_element, options) => { options.callback('token-uji'); return 'widget-1'; }, remove: () => {} };
    script.dispatchEvent(new Event('load'));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('token-uji'));
  });

  it('merender widget dari kunci lingkungan saat pemanggil tidak menunjuk widget', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-lingkungan';
    const script = await renderChallenge({});
    expect(script).not.toBe(null);
  });

  it('tidak memuat skrip challenge sebelum form armed', async () => {
    const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
    const { container } = render(<TurnstileChallenge onToken={vi.fn()} sitekey={WIDGET} armed={false} />);
    expect(container.firstChild).toBe(null);
    expect(document.head.querySelector('script[src*="turnstile"]')).toBe(null);
  });

  it('memuat skrip challenge begitu form armed', async () => {
    const { TurnstileChallenge } = await import('@/components/turnstile-challenge');
    const onToken = vi.fn();
    const { rerender } = render(<TurnstileChallenge onToken={onToken} sitekey={WIDGET} armed={false} />);
    rerender(<TurnstileChallenge onToken={onToken} sitekey={WIDGET} armed />);
    await waitFor(() =>
      expect(document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]')).not.toBe(null),
    );
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
    if (script === null) throw new Error('turnstile_script_missing');
    window.turnstile = { render: (_element, options) => { options.callback('token-uji'); return 'widget-1'; }, remove: () => {} };
    script.dispatchEvent(new Event('load'));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('token-uji'));
  });

  it('menampilkan pemberitahuan muat ulang saat skrip challenge ditolak', async () => {
    const script = await renderChallenge({ sitekey: WIDGET });
    script.dispatchEvent(new Event('error'));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: /muat ulang verifikasi/i })).toBeDefined();
  });
});
