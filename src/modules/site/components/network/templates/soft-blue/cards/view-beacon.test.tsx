// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { SoftBlueViewBeacon } from '@/modules/site/components/network/templates/soft-blue/cards/view-beacon';

const O = '123e4567-e89b-12d3-a456-426614174000';
const S = '123e4567-e89b-12d3-a456-426614174001';
const A = '123e4567-e89b-12d3-a456-426614174002';

function pasangBeacon(hasil: boolean) {
  const kirim = vi.fn(() => hasil);
  Object.defineProperty(navigator, 'sendBeacon', { value: kirim, configurable: true, writable: true });
  return kirim;
}

afterEach(() => {
  cleanup();
});

describe('SoftBlueViewBeacon', () => {
  it('mengirim beacon sekali saat mount', () => {
    const kirim = pasangBeacon(true);
    const { container } = render(<SoftBlueViewBeacon organizationId={O} siteId={S} articleSiteId={A} />);
    expect(container.firstChild).toBe(null);
    expect(kirim).toHaveBeenCalledTimes(1);
    const calls = kirim.mock.calls as unknown as Array<[string, string]>;
    const badan = JSON.parse(calls[0]?.[1] ?? '') as Record<string, string>;
    expect(badan).toMatchObject({ o: O, s: S, a: A });
  });

  it('memakai fetch saat beacon ditolak', async () => {
    pasangBeacon(false);
    const ambil = vi.fn(async () => new Response());
    const asli = globalThis.fetch;
    globalThis.fetch = ambil as typeof fetch;
    try {
      render(<SoftBlueViewBeacon organizationId={O} siteId={S} articleSiteId={A} />);
      await waitFor(() => expect(ambil).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' })));
    } finally {
      globalThis.fetch = asli;
    }
  });

  it('diam untuk id tidak valid', () => {
    const kirim = pasangBeacon(true);
    render(<SoftBlueViewBeacon organizationId="bukan-uuid" siteId={S} articleSiteId={A} />);
    expect(kirim).not.toHaveBeenCalled();
  });
});
