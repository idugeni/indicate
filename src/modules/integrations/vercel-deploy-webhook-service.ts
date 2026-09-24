import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const deployPayloadSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(['deployment.error', 'deployment.canceled']),
  createdAt: z.number().int().nonnegative(),
  payload: z.object({
    deployment: z.object({ id: z.string().min(1) }).passthrough(),
    project: z.object({ id: z.string().min(1) }).passthrough(),
    target: z.string().nullable().optional(),
  }).passthrough(),
  region: z.string().nullable().optional(),
});

export interface VercelDeployWebhookResult {
  readonly received: boolean;
  readonly type: 'deployment.error' | 'deployment.canceled';
  readonly deploymentId: string;
  readonly deduped: boolean;
}

type ReplayStore = Pick<IntegrationsRepository, 'claimReplay'>;

const MAX_BODY_BYTES = 32_768;

/**
 * Receives Vercel deployment lifecycle webhooks with signature verification and replay protection.
 *
 * @remarks Deliveries are authenticated by the `x-vercel-signature` HMAC-SHA1 of the raw body
 * under the account webhook secret, plus a project allowlist against the runtime snapshot.
 * Redeliveries resolve to a deduped 200 so Vercel stops retrying. Receipt only; remediation
 * stays a deliberate operator action.
 */
export class VercelDeployWebhookService {
  constructor(
    private readonly repository: ReplayStore,
    private readonly expectedProjectId: string,
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
   * Verifies, dedupes, and classifies one deployment event delivery.
   *
   * @param rawBody - Untouched request text used for signature verification and replay identity.
   * @param signature - Value of the `x-vercel-signature` header.
   * @param requestId - Correlation identifier for denials.
   * @returns Accepted event receipt or a non-disclosing error.
   */
  async process(rawBody: string, signature: string | null, requestId: string): Promise<Result<VercelDeployWebhookResult, PublicErrorEnvelope>> {
    if (rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES || !this.validSignature(signature, rawBody)) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    const event = deployPayloadSchema.safeParse(parsed);
    if (!event.success || event.data.payload.project.id !== this.expectedProjectId) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    const { type, id } = event.data;
    const deploymentId = event.data.payload.deployment.id;
    const now = this.clock.now();
    const bodyDigest = createHash('sha256').update(rawBody).digest('hex');
    try {
      const claimed = await this.repository.claimReplay({
        source: 'vercel-deploy',
        replayId: `deploy:${id}`,
        organizationId: null,
        bodyDigest,
        receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString(),
      });
      if (claimed.kind === 'duplicate') {
        return { ok: true, value: Object.freeze({ received: true, type, deploymentId, deduped: true }) };
      }
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Webhook processing is temporarily unavailable.', requestId) };
    }
    return { ok: true, value: Object.freeze({ received: true, type, deploymentId, deduped: false }) };
  }
}
