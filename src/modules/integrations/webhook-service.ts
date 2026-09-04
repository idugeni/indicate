import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { WebhookReplayClaim } from '@/modules/integrations/models';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { genericWebhookHeadersSchema } from '@/modules/integrations/schemas';

const digest = (rawBody: string) => createHash('sha256').update(rawBody).digest('hex');
const secureTextEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b);
};
export function signWebhook(secret: string, timestamp: number, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

export class WebhookService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly secrets: Readonly<Record<string, string>>,
    private readonly freshnessSeconds: number,
    private readonly replayTtlSeconds: number,
    private readonly clock: { now(): Date } = { now: () => new Date() },
    private readonly processingLeaseSeconds = 30,
  ) {}

  private rejectedOutcome(claim: WebhookReplayClaim, requestId: string): Result<never, PublicErrorEnvelope> {
    return claim.outcome?.code === 'invalid_json'
      ? { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid webhook payload.', requestId) }
      : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Webhook processing failed.', requestId) };
  }

  private async finalizePrepared(claim: WebhookReplayClaim, requestId: string): Promise<Result<Readonly<Record<string, unknown>>, PublicErrorEnvelope>> {
    if (claim.outcome === null) return { ok: false, error: createPublicError('CONFLICT', 'Webhook processing is already in progress.', requestId) };
    let terminal = claim;
    if (claim.status === 'claimed' && claim.pendingStatus !== null) {
      try { terminal = await this.repository.finalizeReplay(claim.source, claim.replayId, claim.bodyDigest, claim.claimToken, this.clock.now().toISOString()); }
      catch { /* the prepared outcome is durable and can be reconciled by the next duplicate */ }
    }
    const status = terminal.status === 'claimed' ? claim.pendingStatus : terminal.status;
    return status === 'processed' ? { ok: true, value: claim.outcome } : this.rejectedOutcome(claim, requestId);
  }

  async process(
    rawBody: string,
    rawHeaders: unknown,
    organizationId: string | null,
    requestId = crypto.randomUUID(),
  ): Promise<Result<Readonly<Record<string, unknown>>, PublicErrorEnvelope>> {
    const headers = genericWebhookHeadersSchema.safeParse(rawHeaders);
    if (!headers.success || rawBody.length > 1_000_000) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const secret = this.secrets[headers.data.source]; if (secret === undefined) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const expected = signWebhook(secret, headers.data.timestamp, rawBody);
    if (!secureTextEqual(expected, headers.data.signature)) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const now = this.clock.now(); const occurredAt = new Date(headers.data.timestamp * 1_000);
    if (!Number.isFinite(occurredAt.getTime()) || Math.abs(now.getTime() - occurredAt.getTime()) > this.freshnessSeconds * 1_000) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const bodyDigest = digest(rawBody);
    try {
      const claimed = await this.repository.claimReplay({
        source: headers.data.source, replayId: headers.data.replayId, organizationId, bodyDigest,
        receivedAt: now.toISOString(), leaseExpiresAt: new Date(now.getTime() + this.processingLeaseSeconds * 1_000).toISOString(),
        expiresAt: new Date(now.getTime() + this.replayTtlSeconds * 1_000).toISOString(),
      });
      if (claimed.claim.bodyDigest !== bodyDigest || claimed.claim.organizationId !== organizationId) return { ok: false, error: createNonDisclosingDenial(requestId) };
      if (claimed.kind === 'duplicate') {
        if (claimed.claim.status !== 'claimed' || claimed.claim.pendingStatus !== null) return this.finalizePrepared(claimed.claim, requestId);
        return { ok: false, error: createPublicError('CONFLICT', 'Webhook processing is already in progress.', requestId) };
      }
      let payload: unknown;
      try { payload = JSON.parse(rawBody); }
      catch {
        const prepared = await this.repository.prepareReplayOutcome(headers.data.source, headers.data.replayId, bodyDigest, claimed.claim.claimToken, 'rejected', { code: 'invalid_json' }, this.clock.now().toISOString());
        return this.finalizePrepared(prepared, requestId);
      }
      const outcome = { accepted: true, payloadDigest: digest(JSON.stringify(payload)) };
      const prepared = await this.repository.prepareReplayOutcome(headers.data.source, headers.data.replayId, bodyDigest, claimed.claim.claimToken, 'processed', outcome, this.clock.now().toISOString());
      return this.finalizePrepared(prepared, requestId);
    } catch { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Webhook validation is temporarily unavailable.', requestId) }; }
  }
}

export type ReplayClaim = WebhookReplayClaim;
