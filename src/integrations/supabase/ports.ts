import type { HealthCheckPort } from '@/core/system/ports';

export interface VerifiedAuthIdentity {
  readonly authUserId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  /** Verified Supabase Auth email; null for non-email identities. */
  readonly email: string | null;
}

export type SupabaseAuthPort = HealthCheckPort;

export interface SupabaseDatabasePort extends HealthCheckPort {
  readonly projectRef: string;
  readonly connectionMode: 'transaction_pooler';
}
