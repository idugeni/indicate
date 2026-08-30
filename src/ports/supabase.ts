import type { HealthCheckPort } from '@/ports/health-check';

export interface VerifiedAuthIdentity {
  readonly authUserId: string;
  readonly displayName: string;
}

export interface SupabaseAuthPort extends HealthCheckPort {
  verifySession(sessionToken: string): Promise<VerifiedAuthIdentity | null>;
}

export interface SupabaseDatabasePort extends HealthCheckPort {
  readonly projectRef: string;
  readonly connectionMode: 'transaction_pooler';
}
