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
    const response = await wrapped(new Request('https://indicate.web.id/uji'));
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
    await expect(wrapped(new Request('https://indicate.web.id/uji'))).rejects.toThrow('meledak');
  });
});
