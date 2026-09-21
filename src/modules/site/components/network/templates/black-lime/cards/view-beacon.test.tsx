// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { BlackLimeViewBeacon } from '@/modules/site/components/network/templates/black-lime/cards/view-beacon';

const O = '123e4567-e89b-12d3-a456-426614174000';
const S = '123e4567-e89b-12d3-a456-426614174001';
const A = '123e4567-e89b-12d3-a456-426614174002';

function installBeacon(result: boolean) {
  const send = vi.fn(() => result);
  Object.defineProperty(navigator, 'sendBeacon', { value: send, configurable: true, writable: true });
  return send;
}

afterEach(() => {
  cleanup();
});

describe('BlackLimeViewBeacon', () => {
  it('mengirim beacon sekali saat mount', () => {
    const send = installBeacon(true);
    const { container } = render(<BlackLimeViewBeacon organizationId={O} siteId={S} articleSiteId={A} />);
    expect(container.firstChild).toBe(null);
    expect(send).toHaveBeenCalledTimes(1);
    const calls = send.mock.calls as unknown as Array<[string, string]>;
    const body = JSON.parse(calls[0]?.[1] ?? '') as Record<string, string>;
    expect(body).toMatchObject({ o: O, s: S, a: A });
  });

  it('memakai fetch saat beacon ditolak', async () => {
    installBeacon(false);
    const fetchMock = vi.fn(async () => new Response());
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      render(<BlackLimeViewBeacon organizationId={O} siteId={S} articleSiteId={A} />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' })));
    } finally {
      globalThis.fetch = original;
    }
  });

  it('diam untuk id tidak valid', () => {
    const send = installBeacon(true);
    render(<BlackLimeViewBeacon organizationId="bukan-uuid" siteId={S} articleSiteId={A} />);
    expect(send).not.toHaveBeenCalled();
  });
});
