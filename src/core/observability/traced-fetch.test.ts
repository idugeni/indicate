import { afterEach, describe, expect, it, vi } from 'vitest';

import { tracedFetch } from '@/core/observability/traced-fetch';
import { REQUEST_ID_HEADER } from '@/core/observability/request-id';
import { TRACEPARENT_HEADER } from '@/core/observability/trace-context';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function quiet() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('tracedFetch header', () => {
  it('meneruskan request id dan traceparent', async () => {
    quiet();
    let seen: Headers | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: { headers?: HeadersInit }) => {
        seen = new Headers(init?.headers);
        return new Response('ok');
      }),
    );
    await tracedFetch('https://api.example/x', undefined, {
      requestId: 'req-1',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      service: 'uji',
      operation: 'baca',
    });
    expect(seen?.get(REQUEST_ID_HEADER)).toBe('req-1');
    expect(seen?.get(TRACEPARENT_HEADER)).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });
});

describe('tracedFetch kegagalan', () => {
  it('mencatat warn saat respons tidak ok lalu mengembalikan respons', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gagal', { status: 503 })));
    const response = await tracedFetch('https://api.example/x', undefined, { requestId: 'req-2', service: 'uji', operation: 'baca' });
    expect(response.status).toBe(503);
    expect(error).toHaveBeenCalledOnce();
  });

  it('mencatat error lalu melempar ulang saat fetch gagal', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('putus');
      }),
    );
    await expect(
      tracedFetch('https://api.example/x', undefined, { requestId: 'req-3', service: 'uji', operation: 'baca' }),
    ).rejects.toThrow('putus');
    expect(error).toHaveBeenCalledOnce();
  });
});
