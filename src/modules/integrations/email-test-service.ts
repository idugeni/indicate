import { z } from 'zod';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { EmailPort } from '@/modules/integrations/ports';
import { EmailSendError } from '@/modules/integrations/ports';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const testSchema = z.object({ to: z.email().max(320) });

/**
 * Sends a platform-gated test email through the configured provider.
 * Denials stay non-disclosing; provider failures surface as retryable.
 */
export class EmailTestService {
  constructor(private readonly port: EmailPort | null) {}

  /**
   * Delivers one fixed-content probe message to an arbitrary address.
   *
   * @param actor - Dashboard actor; requires a platform grant.
   * @param raw - Unvalidated command payload carrying the destination.
   * @returns Provider identifier of the accepted probe.
   */
  async send(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const platform =
      actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) === true ||
      actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.customerAdmin) === true;
    if (actor.actorType !== 'user' || !platform) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const parsed = testSchema.safeParse(raw);
    if (!parsed.success || this.port === null) {
      return { ok: false, error: this.port === null
        ? createPublicError('DEPENDENCY_UNAVAILABLE', 'Email pengiriman belum dikonfigurasi.', actor.requestId)
        : createPublicError('INVALID_INPUT', 'Alamat email tujuan tidak valid.', actor.requestId) };
    }
    try {
      const result = await this.port.send({
        to: [parsed.data.to],
        subject: 'Indicate: email uji pengiriman',
        text: 'Email uji dari dashboard Indicate. Pengiriman transaksional berfungsi.',
        idempotencyKey: `test/${actor.actorId}/${Date.now()}`,
      });
      return { ok: true, value: result };
    } catch (error) {
      if (error instanceof EmailSendError) {
        return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Pengiriman email gagal. Coba lagi.', actor.requestId) };
      }
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Permintaan email uji tidak valid.', actor.requestId) };
    }
  }
}
