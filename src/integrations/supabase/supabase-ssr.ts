import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SupabaseAuthPort, VerifiedAuthIdentity } from '@/integrations/supabase/ports';

export interface SupabaseCookieStore {
  getAll(): readonly { name: string; value: string }[];
  setAll(cookies: readonly { name: string; value: string; options: CookieOptions }[]): void;
}

export interface SupabaseCookieWriter {
  getAll(): readonly { name: string; value: string }[];
  set(name: string, value: string, options: Partial<CookieOptions>): void;
}

export interface SupabaseSsrAuthAdapter extends SupabaseAuthPort {
  verifyCookieSession(): Promise<VerifiedAuthIdentity | null>;
  exchangeCodeForSession(code: string): Promise<boolean>;
  verifyTokenHash(tokenHash: string, type: 'email' | 'signup' | 'recovery'): Promise<boolean>;
  signOut(): Promise<void>;
}

/** Secure cookie floor (HttpOnly, Lax, Secure on prod); not Strict so OAuth code-verifier survives cross-site navigation. */
export function createHardenedSupabaseCookieStore(writer: SupabaseCookieWriter): SupabaseCookieStore {
  const forceSecure = process.env.NODE_ENV === 'production';
  return {
    getAll: () => [...writer.getAll()],
    setAll: (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        writer.set(name, value, {
          ...options,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          ...(forceSecure ? { secure: true } : {}),
        });
      }
    },
  };
}

function displayNameFor(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const candidate = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 200);
  return user.email?.split('@')[0]?.slice(0, 200) || 'Indicate User';
}

function avatarUrlFor(user: { user_metadata?: Record<string, unknown> }): string | null {
  const candidate = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!/^https:\/\//iu.test(trimmed) || trimmed.length > 2000) return null;
  return trimmed;
}

export function createSupabaseSsrAuthAdapter(input: {
  readonly url: string;
  readonly publishableKey: string;
  readonly cookies: SupabaseCookieStore;
}): SupabaseSsrAuthAdapter {
  const client: SupabaseClient = createServerClient(input.url, input.publishableKey, {
    cookies: {
      getAll: () => [...input.cookies.getAll()],
      setAll: (cookies) => input.cookies.setAll(cookies),
    },
  });
  return {
    async verifyCookieSession() {
      const { data, error } = await client.auth.getUser();
      if (error !== null || data.user === null) return null;
      return Object.freeze({
        authUserId: data.user.id,
        displayName: displayNameFor(data.user),
        avatarUrl: avatarUrlFor(data.user),
        email: data.user.email ?? null,
      });
    },
    async verifySession(sessionToken: string) {
      const { data, error } = await client.auth.getUser(sessionToken);
      if (error !== null || data.user === null) return null;
      return Object.freeze({
        authUserId: data.user.id,
        displayName: displayNameFor(data.user),
        avatarUrl: avatarUrlFor(data.user),
        email: data.user.email ?? null,
      });
    },
    async exchangeCodeForSession(code: string) {
      if (!code) return false;
      const { error } = await client.auth.exchangeCodeForSession(code);
      return error === null;
    },
    async verifyTokenHash(tokenHash: string, type: 'email' | 'signup' | 'recovery') {
      if (!tokenHash) return false;
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
      return error === null;
    },
    async signOut() {
      await client.auth.signOut();
    },
    async check() {
      try {
        const response = await fetch(`${input.url}/auth/v1/health`, {
          headers: { apikey: input.publishableKey },
          cache: 'no-store',
        });
        return response.ok
          ? { service: 'supabase-auth', status: 'healthy' }
          : { service: 'supabase-auth', status: 'unhealthy', category: 'auth_health_unavailable' };
      } catch {
        return { service: 'supabase-auth', status: 'unhealthy', category: 'auth_health_unavailable' };
      }
    },
  };
}
