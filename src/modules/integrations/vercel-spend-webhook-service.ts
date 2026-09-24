import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const spendPayloadSchema = z.object({
  budgetAmount: z.number().nonnegative(),
  currentSpend: z.number().nonnegative(),
  teamId: z.string().regex(/^team_[A-Za-z0-9]+$/),
  thresholdPercent: z.number().int().min(1).max(100),
});

export interface VercelSpendWebhookResult {
  readonly received: boolean;
  readonly thresholdPercent: number;
  readonly currentSpend: number;
  readonly budgetAmount: number;
  readonly deduped: boolean;
}

type ReplayStore = Pick<IntegrationsRepository, 'claimReplay'>;

const MAX_BODY_BYTES = 8_192;

/**
 * Receives Vercel Spend Management budget webhooks with signature verification and replay protection.
 *
 * @remarks Deliveries are authenticated by the `x-vercel-signature` HMAC-SHA1 of the raw body
 * under the Spend Management webhook secret, plus an exact `teamId` match against the runtime
 * snapshot. Redeliveries resolve to a deduped 200 so Vercel stops retrying. Never triggers
 * privileged actions; budget pauses stay controlled in Vercel.
 */
export class VercelSpendWebhookService {
  constructor(
    private readonly repository: ReplayStore,
    private readonly expectedTeamId: string,
    private readonly secret: string,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private validSignature(signature: string | null, rawBody: string): boolean {
    if (signature === null || signature === '') return false;
    const expected = createHmac('sha1', this.secret).update(rawBody).digest('hex');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  /**
   * Verifies, dedupes, and classifies one spend alert delivery.
   *
   * @param rawBody - Untouched request text used for signature verification and replay identity.
   * @param signature - Value of the `x-vercel-signature` header.
   * @param requestId - Correlation identifier for denials.
   * @returns Accepted alert receipt or a non-disclosing error.
   */
  async process(rawBody: string, signature: string | null, requestId: string): Promise<Result<VercelSpendWebhookResult, PublicErrorEnvelope>> {
    if (rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES || !this.validSignature(signature, rawBody)) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    const payload = spendPayloadSchema.safeParse(parsed);
    if (!payload.success || payload.data.teamId !== this.expectedTeamId) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    const { thresholdPercent, currentSpend, budgetAmount } = payload.data;
    const now = this.clock.now();
    const bodyDigest = createHash('sha256').update(rawBody).digest('hex');
    try {
      const claimed = await this.repository.claimReplay({
        source: 'vercel-spend',
        replayId: `spend:${thresholdPercent}:${currentSpend}`,
        organizationId: null,
        bodyDigest,
        receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString(),
      });
      if (claimed.kind === 'duplicate') {
        return { ok: true, value: Object.freeze({ received: true, thresholdPercent, currentSpend, budgetAmount, deduped: true }) };
      }
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Webhook processing is temporarily unavailable.', requestId) };
    }
    return { ok: true, value: Object.freeze({ received: true, thresholdPercent, currentSpend, budgetAmount, deduped: false }) };
  }
}
