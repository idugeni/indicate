import { afterEach, describe, expect, it, vi } from 'vitest';

import { withApiAccess } from '@/core/observability/api-access';
import { REQUEST_ID_HEADER } from '@/core/observability/request-id';

afterEach(() => {
  vi.restoreAllMocks();
});

function quiet() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('withApiAccess sukses', () => {
  it('menggema request id ke header respons', async () => {
    quiet();
    const wrapped = withApiAccess('GET /uji', async () => new Response('ok'));
    const response = await wrapped(new Request('https://indicate.website/uji'));
    expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(/.+/);
    expect(await response.text()).toBe('ok');
  });
});

describe('withApiAccess gagal', () => {
  it('melempar ulang galat handler agar onRequestError tetap jalan', async () => {
    quiet();
    const wrapped = withApiAccess('GET /uji', async () => {
      throw new Error('meledak');
    });
    await expect(wrapped(new Request('https://indicate.website/uji'))).rejects.toThrow('meledak');
  });
});

describe('withApiAccess errors-only', () => {
  it('diam untuk respons sukses rute panas', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapped = withApiAccess('GET /panas', async () => new Response(null, { status: 307 }), {
      accessLog: 'errors-only',
    });
    const response = await wrapped(new Request('https://indicate.website/panas'));
    expect(response.status).toBe(307);
    expect(log).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
  });

  it('tetap mencatat respons 4xx/5xx', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapped = withApiAccess('GET /panas', async () => new Response(null, { status: 404 }), {
      accessLog: 'errors-only',
    });
    await wrapped(new Request('https://indicate.website/panas'));
    expect(err).toHaveBeenCalledTimes(1);
  });
});
