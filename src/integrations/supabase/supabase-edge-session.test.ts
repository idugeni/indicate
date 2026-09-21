import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { nextWithSessionRefresh } from '@/integrations/supabase/supabase-edge-session';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const mockedCreateServerClient = vi.mocked(createServerClient);

function deadRefreshError() {
  return { __isAuthError: true, name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' };
}

function requestWith(cookies: string): NextRequest {
  return new NextRequest('http://localhost/dashboard', { headers: { cookie: cookies } });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ref.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key');
  vi.stubEnv('NODE_ENV', 'test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('nextWithSessionRefresh', () => {
  it('menghapus cookie sesi mati saat refresh token ditolak', async () => {
    mockedCreateServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: deadRefreshError() }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>);
    const response = await nextWithSessionRefresh(
      requestWith('sb-ref-auth-token=dead; sb-ref-auth-token.0=chunk; sesi=lain'),
      () => NextResponse.next(),
    );
    expect(response.cookies.get('sb-ref-auth-token')?.value).toBe('');
    expect(response.cookies.get('sb-ref-auth-token.0')?.value).toBe('');
    expect(response.cookies.get('sesi')).toBeUndefined();
  });

  it('membiarkan cookie saat sesi valid', async () => {
    mockedCreateServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>);
    const response = await nextWithSessionRefresh(
      requestWith('sb-ref-auth-token=hidup'),
      () => NextResponse.next(),
    );
    expect(response.cookies.get('sb-ref-auth-token')).toBeUndefined();
  });

  it('fail-open tanpa konfigurasi supabase', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const response = await nextWithSessionRefresh(requestWith('sb-ref-auth-token=mati'), () => NextResponse.next());
    expect(mockedCreateServerClient).not.toHaveBeenCalled();
    expect(response.cookies.get('sb-ref-auth-token')).toBeUndefined();
  });
});
