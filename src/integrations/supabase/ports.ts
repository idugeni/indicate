import type { HealthCheckPort } from '@/core/system/ports';

export interface VerifiedAuthIdentity {
  readonly authUserId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  /** Email terverifikasi Supabase Auth; null untuk identitas non-email. */
  readonly email: string | null;
}

export interface SupabaseAuthPort extends HealthCheckPort {
  verifySession(sessionToken: string): Promise<VerifiedAuthIdentity | null>;
}

export interface SupabaseDatabasePort extends HealthCheckPort {
  readonly projectRef: string;
  readonly connectionMode: 'transaction_pooler';
}
