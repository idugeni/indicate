import 'server-only';

import { createHash } from 'node:crypto';

import type { IntegrationsRepository } from '@/modules/integrations/ports';
import type { ResendWebhookHeaders, ResendWebhookResult } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

export type ResendEventVerifier = (rawBody: string, headers: ResendWebhookHeaders) => { readonly type: string };

type ReplayStore = Pick<IntegrationsRepository, 'claimReplay'>;

const MAX_BODY_BYTES = 256_000;
const FRESHNESS_MS = 5 * 60_000;

/**
 * Receives Resend delivery webhooks with Svix verification and replay protection.
 * Redeliveries resolve to a deduped 200 so the provider stops retrying.
 */
export class ResendWebhookService {
  constructor(
    private readonly repository: ReplayStore,
    private readonly verify: ResendEventVerifier,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  /**
   * Verifies, dedupes, and classifies one webhook delivery.
   *
   * @param rawBody - Untouched request text used for signature verification.
   * @param headers - Svix identity headers from the request.
   * @param requestId - Correlation identifier for denials.
   * @returns Accepted event receipt or a non-disclosing error.
   */
  async process(rawBody: string, headers: Partial<Record<string, string | null>>, requestId: string): Promise<Result<ResendWebhookResult, PublicErrorEnvelope>> {
    const id = headers['svix-id'];
    const timestamp = headers['svix-timestamp'];
    const signature = headers['svix-signature'];
    if (id === undefined || id === null || id === '' || timestamp === undefined || timestamp === null || signature === undefined || signature === null || rawBody.length > MAX_BODY_BYTES) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    let verified: { readonly type: string };
    try {
      verified = this.verify(rawBody, { id, timestamp, signature });
    } catch {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    const occurredAt = new Date(Number(timestamp) * 1_000);
    if (!Number.isFinite(occurredAt.getTime()) || Math.abs(this.clock.now().getTime() - occurredAt.getTime()) > FRESHNESS_MS) {
      return { ok: false, error: createNonDisclosingDenial(requestId) };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid webhook payload.', requestId) };
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid webhook payload.', requestId) };
    }
    const now = this.clock.now();
    const bodyDigest = createHash('sha256').update(rawBody).digest('hex');
    try {
      const claimed = await this.repository.claimReplay({
        source: 'resend',
        replayId: id,
        organizationId: null,
        bodyDigest,
        receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + 60_000).toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString(),
      });
      if (claimed.kind === 'duplicate') return { ok: true, value: Object.freeze({ received: true, type: verified.type, deduped: true }) };
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Webhook processing is temporarily unavailable.', requestId) };
    }
    return { ok: true, value: Object.freeze({ received: true, type: verified.type, deduped: false }) };
  }
}
