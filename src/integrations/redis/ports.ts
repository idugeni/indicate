import type { HealthCheckPort } from '@/core/system/ports';

export interface QueueClaim {
  readonly logicalId: string;
  readonly claimToken: string;
  readonly leaseExpiresAt: Date;
}

export interface RedisCoordinationPort extends HealthCheckPort {
  readonly resourceCount: 1;
  readonly namespace: string;
  schedule(logicalId: string, dueAt: Date): Promise<void>;
  /**
   * Report whether the due or leased set holds any member.
   *
   * @returns True when at least one logical id sits in either set.
   * @remarks Two ZCARD reads, so a poller can skip the heavier claim path on an
   * idle queue. The answer is advisory: a concurrent `schedule` may land right
   * after it is read, which the next poll covers.
   */
  hasPendingWork(): Promise<boolean>;
  /**
   * Read due/leased set sizes without claiming.
   *
   * @returns Cardinality of both sets for backlog-aware start signals.
   * @remarks Optional so test stubs need no update; implementers must not
   * double-bill callers that already called `hasPendingWork` on the tick.
   */
  peekDepth?(): Promise<{ readonly due: number; readonly leased: number }>;
  claimDue(now: Date, limit: number, leaseSeconds: number): Promise<readonly QueueClaim[]>;
  acknowledge(claim: QueueClaim): Promise<void>;
  mirrorState(organizationId: string, logicalId: string, state: string, ttlSeconds: number): Promise<void>;
}
