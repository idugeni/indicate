import type { HealthCheckPort } from '@/ports/health-check';

export interface QueueClaim {
  readonly logicalId: string;
  readonly claimToken: string;
  readonly leaseExpiresAt: Date;
}

export interface RedisCoordinationPort extends HealthCheckPort {
  readonly resourceCount: 1;
  readonly namespace: string;
  schedule(logicalId: string, dueAt: Date): Promise<void>;
  claimDue(now: Date, limit: number, leaseSeconds: number): Promise<readonly QueueClaim[]>;
  acknowledge(claim: QueueClaim): Promise<void>;
}
