// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { TurnstileField, isTurnstileConfigured } from '@/modules/auth/components/turnstile-field';

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  vi.unstubAllGlobals();
});

describe('Medan Turnstile', () => {
  it('tidak merender apa pun saat kunci situs belum dikonfigurasi', () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    expect(isTurnstileConfigured()).toBe(false);
    const { container } = render(<TurnstileField onToken={vi.fn()} />);
    expect(container.firstChild).toBe(null);
  });

  it('merender wadah widget saat kunci situs tersedia', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    expect(isTurnstileConfigured()).toBe(true);
    const { container } = render(<TurnstileField onToken={vi.fn()} />);
    expect(container.firstChild).not.toBe(null);
  });
});
