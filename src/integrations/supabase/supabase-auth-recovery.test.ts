import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(async () => {
  console.warn = originalWarn;
  console.error = originalError;
  vi.resetModules();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  vi.restoreAllMocks();
});

async function freshModule() {
  return import('@/integrations/supabase/supabase-auth-recovery');
}

function deadError(code: string) {
  return { __isAuthError: true, name: 'AuthApiError', status: 400, code };
}

describe('isDeadSessionError', () => {
  it.each([
    ['refresh_token_not_found'],
    ['refresh_token_already_used'],
    ['session_not_found'],
    ['session_expired'],
  ])('mengenali kode sesi mati %s', async (code) => {
    const { isDeadSessionError } = await freshModule();
    expect(isDeadSessionError(deadError(code))).toBe(true);
  });

  it('mengenali sesi hilang tanpa kode', async () => {
    const { isDeadSessionError } = await freshModule();
    expect(isDeadSessionError({ __isAuthError: true, name: 'AuthSessionMissingError' })).toBe(true);
  });

  it.each([
    ['kode tak dikenal', deadError('unexpected_failure')],
    ['bukan auth error', { name: 'AuthApiError', code: 'refresh_token_not_found' }],
    ['error biasa', new Error('boom')],
    ['null', null],
    ['string', 'refresh_token_not_found'],
  ])('menolak %s', async (_label, value) => {
    const { isDeadSessionError } = await freshModule();
    expect(isDeadSessionError(value)).toBe(false);
  });
});

describe('isSupabaseSessionCookieName', () => {
  it.each([
    ['sb-ref-auth-token'],
    ['sb-abc123-auth-token.0'],
    ['sb-abc123-auth-token.12'],
  ])('mengenali %s sebagai cookie sesi', async (name) => {
    const { isSupabaseSessionCookieName } = await freshModule();
    expect(isSupabaseSessionCookieName(name)).toBe(true);
  });

  it.each([
    ['sb-ref-auth-token-code-verifier'],
    ['sb-ref-auth-token-backup'],
    ['indicate-active-organization'],
    [''],
  ])('menolak %s', async (name) => {
    const { isSupabaseSessionCookieName } = await freshModule();
    expect(isSupabaseSessionCookieName(name)).toBe(false);
  });
});

describe('installSupabaseAuthNoiseFilter', () => {
  it('membuang galat sesi mati dari warn dan error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { installSupabaseAuthNoiseFilter } = await freshModule();
    installSupabaseAuthNoiseFilter();
    console.warn(deadError('refresh_token_not_found'));
    console.error('Error getting user data:', deadError('refresh_token_not_found'));
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('meneruskan log yang bukan noise sesi mati', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { installSupabaseAuthNoiseFilter } = await freshModule();
    installSupabaseAuthNoiseFilter();
    console.warn(new Error('boom'));
    console.error('teks biasa');
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });
});
