import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SupabaseAuthPort, VerifiedAuthIdentity } from '@/ports/supabase';

export interface SupabaseCookieStore {
  getAll(): readonly { name: string; value: string }[];
  setAll(cookies: readonly { name: string; value: string; options: CookieOptions }[]): void;
}

export interface SupabaseSsrAuthAdapter extends SupabaseAuthPort {
  verifyCookieSession(): Promise<VerifiedAuthIdentity | null>;
  exchangeCodeForSession(code: string): Promise<boolean>;
}

function displayNameFor(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const candidate = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 200);
  return user.email?.split('@')[0]?.slice(0, 200) || 'Indicate User';
}

export function createSupabaseSsrAuthAdapter(input: {
  readonly url: string;
  readonly anonKey: string;
  readonly cookies: SupabaseCookieStore;
}): SupabaseSsrAuthAdapter {
  const client: SupabaseClient = createServerClient(input.url, input.anonKey, {
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
      });
    },
    async verifySession(sessionToken: string) {
      const { data, error } = await client.auth.getUser(sessionToken);
      if (error !== null || data.user === null) return null;
      return Object.freeze({
        authUserId: data.user.id,
        displayName: displayNameFor(data.user),
      });
    },
    async exchangeCodeForSession(code: string) {
      if (!code) return false;
      const { error } = await client.auth.exchangeCodeForSession(code);
      return error === null;
    },
    async check() {
      try {
        const response = await fetch(`${input.url}/auth/v1/health`, {
          headers: { apikey: input.anonKey },
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
